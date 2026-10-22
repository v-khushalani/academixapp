import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KIND_PROMPT = {
  notes:
    "Write complete, original chapter study notes: concept explanations, key definitions, step-by-step derivations, 3-5 solved examples, common mistakes, and a quick revision summary.",
  questions: [
    "Write an original ENTRANCE-EXAM MCQ question bank. ONLY single-correct MCQs with exactly four options (A) (B) (C) (D). NO short-answer, long-answer, descriptive or fill-in-the-blank questions.",
    "Organise into four level sections, in this order, each a ## heading:",
    "## Level 1 — CET (MHT-CET / state CET level and slightly above): 10 questions, direct concept + one-step application.",
    "## Level 2 — JEE Main / NEET: 10 questions, multi-concept, 2–3 step numericals, typical PYQ style.",
    "## Level 3 — JEE Main (advanced) / NEET (tough): 8 questions, tricky traps, graph/case based, combined concepts.",
    "## Level 4 — JEE Advanced: 6 questions, deep multi-concept reasoning, non-standard situations.",
    "Format every question as: **Q<n>.** question text, then each option on its own line as (A) …, (B) …, (C) …, (D) …. Make distractors plausible (common mistakes). Cover the whole chapter, no repeated ideas.",
    "End with ## Answer Key & Solutions: for each Q give **Q<n> — (X)** then a concise step-by-step solution and the key concept/trap in one line.",
  ].join("\n"),
  formula_sheet:
    "Write a one-glance formula sheet: every important formula, its meaning, units and conditions of use, grouped by topic.",
  concept_map: [
    "Write a ONE-SHOT REVISION CONCEPT MAP of the whole chapter that fits on ONE A4 page (use TWO pages — front and back — only if the chapter is genuinely long; then put a line containing only <!-- pagebreak --> between the two pages).",
    "Structure it like a mind map a student can picture: start with a short ## Chapter at a glance line (the central idea), then one ### block per major sub-topic (the branches). Under each branch, use tight nested bullets (max 3 levels) for: key definitions, core formulae ($...$), laws/rules, graphs/trends to remember, exceptions and exam traps. Use → to show flow/cause-effect and links between branches.",
    "Add a compact table where comparison helps (e.g. types, cases, sign conventions). Finish with ## Links & Exam Focus: how sub-topics connect, most-asked JEE/NEET/CET areas, and 5 must-remember one-liners.",
    "Follow the standard concept-map flow used by top JEE/NEET revision resources for this chapter. Be dense and crisp: keywords, not paragraphs. No solved examples, no long explanations.",
  ].join("\n"),
} as const;

export const generateMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sourceId: z.string().uuid(),
        kind: z.enum(["notes", "questions", "formula_sheet", "concept_map"]),
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
        "Output clean Markdown only (no code fences around the document). Use ## and ### headings, bullet lists, tables for comparisons, and > blockquotes for key points/tips. Write ALL maths, chemistry formulae, units with symbols, Greek letters (\\alpha, \\theta, \\lambda, \\Omega…) in LaTeX: inline as $...$ and important/standalone equations as $$...$$ on their own line. Never use Unicode math look-alikes or plain-text equations. Do not start with a title line (the header already shows it). Never mention any other coaching institute's name.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    // Worker secrets may live on process.env, Nitro's globalThis.__env__, or the request's cloudflare env.
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest() as unknown as { runtime?: { cloudflare?: { env?: Record<string, unknown> } } } | undefined;
    const sources: Record<string, unknown>[] = [
      (typeof process !== "undefined" ? (process.env as Record<string, unknown>) : {}) ?? {},
      ((globalThis as unknown as { __env__?: Record<string, unknown> }).__env__) ?? {},
      req?.runtime?.cloudflare?.env ?? {},
    ];
    let apiKey = "";
    for (const s of sources) {
      const v = s["GOOGLE_GENERATIVE_AI_API_KEY"] ?? s["GEMINI_API_KEY"];
      if (typeof v === "string" && v.trim()) { apiKey = v.trim(); break; }
    }
    if (!apiKey) {
      console.error("[materials] Gemini key missing in all env sources");
      return { ok: false as const, error: "Gemini API key is not configured." };
    }

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
    for (const model of ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"]) {
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

    const titleMap = { notes: "Notes", questions: "MCQ bank (CET → JEE Adv)", formula_sheet: "Formula sheet", concept_map: "Concept map" };
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
