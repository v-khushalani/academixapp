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

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI is not configured." };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    let failure: string | null = null;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: `You are a senior ${src.subject ?? ""} content author producing accurate, exam-ready study material for ${brand}.`,
      messages: [{ role: "user", content: parts }],
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
      onError: ({ error: e }) => {
        const any = e as { statusCode?: number; message?: string };
        failure =
          any.statusCode === 402
            ? "AI credits exhausted. Top up in workspace settings."
            : any.statusCode === 429
              ? "Too many requests. Try again in a minute."
              : any.message ?? "AI generation failed.";
      },
    });
    let text = "";
    try {
      text = await result.text;
    } catch (e) {
      failure ??= (e as Error).message;
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
