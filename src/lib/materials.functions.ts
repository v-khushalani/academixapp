import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KIND_PROMPT = {
  notes:
    "Write complete, original chapter study notes: concept explanations, key definitions, step-by-step derivations, 3-5 solved examples, common mistakes, and a quick revision summary.",
  questions:
    "Write an original question bank: 10 MCQs, 5 short-answer, 3 long-answer questions, graded easy→hard, followed by an answer key with full step-by-step solutions.",
  formula_sheet:
    "Write a one-glance formula sheet: every important formula, its meaning, units and conditions of use, grouped by topic.",
} as const;

export const generateMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sourceId: z.string().uuid(),
        kind: z.enum(["notes", "questions", "formula_sheet"]),
        extra: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS only returns the row when the caller is owner/admin AND the engine is on for a paid plan.
    const { data: src, error } = await context.supabase
      .from("material_sources")
      .select("*")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (error || !src) return { ok: false as const, error: "Source not found or engine not enabled." };

    const { data: inst } = await context.supabase
      .from("institutes")
      .select("name")
      .eq("id", src.institute_id)
      .maybeSingle();
    const brand = inst?.name ?? "the institute";

    const parts: (
      | { type: "text"; text: string }
      | { type: "file"; data: Uint8Array; mediaType: string }
    )[] = [];
    if (src.file_path && src.file_type === "application/pdf" && (src.file_size ?? 0) < 15_000_000) {
      const dl = await context.supabase.storage.from("materials").download(src.file_path);
      if (dl.data) parts.push({ type: "file", data: new Uint8Array(await dl.data.arrayBuffer()), mediaType: "application/pdf" });
    }
    const rightsLine =
      src.rights_status === "owned" || src.rights_status === "licensed"
        ? "The institute holds rights to this source; you may adapt its content."
        : "The source is REFERENCE ONLY. Use it only to understand topics, sequence and difficulty. Do NOT copy its text, questions, examples or solutions — write everything originally.";
    parts.push({
      type: "text",
      text: [
        `Institute brand: ${brand}. Programme: ${src.programme ?? "-"}. Class: ${src.class_level ?? "-"}. Subject: ${src.subject ?? "-"}. Chapter: ${src.chapter ?? src.title}.`,
        rightsLine,
        KIND_PROMPT[data.kind],
        src.extracted_text ? `Reference notes/text:\n${src.extracted_text.slice(0, 40000)}` : "",
        data.extra ? `Extra instructions: ${data.extra}` : "",
        "Output clean Markdown. Use LaTeX in $...$ for maths. Never mention any other coaching institute's name.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    const apiKey = (process.env["GOOGLE_GENERATIVE_AI_API_KEY"] || process.env["GEMINI_API_KEY"])?.trim();
    if (!apiKey) return { ok: false as const, error: "Gemini API key is not configured." };

    const toB64 = (u: Uint8Array) => {
      let s = "";
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const geminiParts = parts.map((p) =>
      p.type === "file" ? { inline_data: { mime_type: p.mediaType, data: toB64(p.data) } } : { text: p.text },
    );
    const body = JSON.stringify({
      system_instruction: {
        parts: [{ text: `You are a senior ${src.subject ?? ""} content author producing accurate, complete, exam-ready study material for ${brand}. Always produce the full requested output; never stop midway or ask questions.` }],
      },
      contents: [{ role: "user", parts: geminiParts }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 16384 },
    });

    let failure: string | null = null;
    let text = "";
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body },
        );
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          error?: { message?: string };
        };
        if (!res.ok) {
          failure = res.status === 429 ? "Gemini rate limit reached. Try again in a minute." : json.error?.message ?? `Gemini error ${res.status}`;
          continue;
        }
        text = (json.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("");
        if (text.trim()) { failure = null; break; }
        failure = "AI returned no content.";
      } catch (e) {
        failure = (e as Error).message;
      }
    }
    if (failure || !text.trim()) return { ok: false as const, error: failure ?? "AI returned no content." };

    const titleMap = { notes: "Notes", questions: "Question bank", formula_sheet: "Formula sheet" };
    const { data: out, error: insErr } = await context.supabase
      .from("material_outputs")
      .insert({
        institute_id: src.institute_id,
        source_id: src.id,
        kind: data.kind,
        title: `${src.chapter || src.title} — ${titleMap[data.kind]}`,
        class_level: src.class_level,
        subject: src.subject,
        chapter: src.chapter,
        content: text,
      })
      .select("id")
      .single();
    if (insErr) return { ok: false as const, error: insErr.message };
    return { ok: true as const, id: out.id };
  });
