import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type OrderItem = {
  id: string;
  section: string | null;
  section_pos: number;
  position: number;
};

/**
 * Turn a visual chapter order into storable numbers: every run of chapters that
 * share a section becomes one section, and numbering restarts at 1 inside it.
 */
export function computeOrder(list: Chapter[]): OrderItem[] {
  const out: OrderItem[] = [];
  let sectionKey: string | null | undefined = undefined;
  let sectionPos = 0;
  let pos = 1;
  for (const c of list) {
    const key = c.section?.trim() || null;
    if (sectionKey === undefined || key !== sectionKey) {
      sectionKey = key;
      sectionPos += 1;
      pos = 1;
    }
    out.push({ id: c.id, section: key, section_pos: sectionPos, position: pos++ });
  }
  return out;
}
export type Chapter = Tables["syllabus_chapters"]["Row"];
export type ChapterInsert = Tables["syllabus_chapters"]["Insert"];
export type ChapterStatus = "pending" | "in_progress" | "done";
export type SyllabusLog = Tables["syllabus_logs"]["Row"];

export const STATUS_LABEL: Record<ChapterStatus, string> = {
  pending: "Not started",
  in_progress: "In progress",
  done: "Completed",
};

export const syllabusApi = {
  /** Chapters for one batch (or the whole institute when no batch is given). */
  async chapters(batchId?: string) {
    let q = supabase
      .from("syllabus_chapters")
      .select("*")
      .order("subject")
      .order("section_pos")
      .order("position");
    if (batchId) q = q.eq("batch_id", batchId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Chapter[];
  },


  /**
   * Add chapters to a batch + subject. A line starting with `#` (or `--`) starts a
   * new section — numbering restarts at 1 inside every section, like textbooks do.
   */
  async addChapters(
    batchId: string,
    subject: string,
    titles: string[],
    startAt: number,
    sectionStart = 1,
  ) {
    const rows: ChapterInsert[] = [];
    let section: string | null = null;
    let sectionPos = sectionStart;
    let n = startAt;
    let seq = startAt;
    for (const raw of titles) {
      const line = raw.trim();
      if (!line) continue;
      const header = line.match(/^(?:#+|--)\s*(.+?):?$/);
      if (header) {
        section = header[1].trim();
        sectionPos += 1;
        seq = 1;
        continue;
      }
      rows.push({
        batch_id: batchId,
        subject,
        title: line,
        section,
        section_pos: sectionPos,
        position: section ? seq++ : n++,
      });
    }
    if (!rows.length) return [];
    const { data, error } = await supabase.from("syllabus_chapters").insert(rows).select();
    if (error) throw error;
    return data ?? [];
  },


  /** Persist a new drag order (section grouping + numbering) for one subject. */
  async setOrder(items: OrderItem[]) {
    if (!items.length) return;
    const { error } = await supabase.rpc("set_syllabus_order", {
      _items: items as unknown as Json,
    });
    if (error) throw error;
  },

  /** Put the chosen chapters into a (new or existing) named section. */
  async moveToSection(subjectChapters: Chapter[], ids: string[], section: string | null) {
    const picked = new Set(ids);
    const rest = subjectChapters.filter((c) => !picked.has(c.id));
    const moved = subjectChapters.filter((c) => picked.has(c.id));
    const ordered = [...rest, ...moved.map((c) => ({ ...c, section }))];
    await syllabusApi.setOrder(computeOrder(ordered as Chapter[]));
  },

  async updateChapter(id: string, patch: Partial<ChapterInsert>) {
    const { data, error } = await supabase
      .from("syllabus_chapters")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new Error(
        "This chapter isn't assigned to you — ask the office to link this batch to your name.",
      );
    return data;
  },

  async removeChapter(id: string) {
    const { error } = await supabase.from("syllabus_chapters").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Move a chapter along the pipeline and leave a dated trail of what was taught,
   * so the office can answer "kitna syllabus hua" without calling the teacher.
   */
  async setStatus(
    chapter: Chapter,
    status: ChapterStatus,
    opts?: { facultyId?: string | null; note?: string; date?: string },
  ) {
    const today = opts?.date ?? new Date().toISOString().slice(0, 10);
    const patch: Partial<ChapterInsert> = { status };
    if (status === "pending") {
      patch.started_on = null;
      patch.completed_on = null;
      patch.completed_by = null;
    }
    if (status === "in_progress") {
      patch.started_on = chapter.started_on ?? today;
      patch.completed_on = null;
      patch.completed_by = null;
    }
    if (status === "done") {
      patch.started_on = chapter.started_on ?? today;
      patch.completed_on = today;
      const { data: auth } = await supabase.auth.getUser();
      patch.completed_by = auth.user?.id ?? null;
    }
    const updated = await syllabusApi.updateChapter(chapter.id, patch);
    if (status !== "pending") {
      await supabase.from("syllabus_logs").insert({
        chapter_id: chapter.id,
        batch_id: chapter.batch_id,
        faculty_id: opts?.facultyId ?? null,
        date: today,
        note: opts?.note?.trim() || (status === "done" ? "Chapter completed" : "Chapter started"),
      });
    }
    return updated;
  },

  /** Teaching log, newest first. */
  async logs(opts?: { batchId?: string; limit?: number }) {
    let q = supabase
      .from("syllabus_logs")
      .select("*, chapter:syllabus_chapters(id,title,subject,batch_id)")
      .order("date", { ascending: false })
      .limit(opts?.limit ?? 30);
    if (opts?.batchId) q = q.eq("batch_id", opts.batchId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  /** Duplicate a batch's chapter list into another batch (fresh, all pending). */
  async copyToBatch(fromBatchId: string, toBatchId: string) {
    const source = await syllabusApi.chapters(fromBatchId);
    if (!source.length) throw new Error("This batch has no chapters to copy");
    const rows: ChapterInsert[] = source.map((c) => ({
      batch_id: toBatchId,
      subject: c.subject,
      title: c.title,
      section: c.section,
      position: c.position,
      planned_sessions: c.planned_sessions,
    }));

    const { error } = await supabase.from("syllabus_chapters").insert(rows);
    if (error) throw error;
    return rows.length;
  },
};

export type SubjectProgress = {
  subject: string;
  total: number;
  done: number;
  inProgress: number;
  pct: number;
  current: Chapter | null;
  chapters: Chapter[];
};

/** Weighted by planned sessions so a 4-session chapter counts more than a 1-session one. */
export function groupBySubject(chapters: Chapter[]): SubjectProgress[] {
  const map = new Map<string, Chapter[]>();
  for (const c of chapters) {
    const list = map.get(c.subject) ?? [];
    list.push(c);
    map.set(c.subject, list);
  }
  return Array.from(map.entries())
    .map(([subject, list]) => {
      const weight = (c: Chapter) => Math.max(1, c.planned_sessions || 1);
      const totalW = list.reduce((s, c) => s + weight(c), 0);
      const doneW = list.reduce(
        (s, c) =>
          s + (c.status === "done" ? weight(c) : c.status === "in_progress" ? weight(c) / 2 : 0),
        0,
      );
      return {
        subject,
        total: list.length,
        done: list.filter((c) => c.status === "done").length,
        inProgress: list.filter((c) => c.status === "in_progress").length,
        pct: totalW ? Math.round((doneW / totalW) * 100) : 0,
        current: list.find((c) => c.status === "in_progress") ?? null,
        chapters: list,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

export function overallPct(chapters: Chapter[]) {
  const groups = groupBySubject(chapters);
  if (!groups.length) return 0;
  return Math.round(groups.reduce((s, g) => s + g.pct, 0) / groups.length);
}

export type SectionGroup = { section: string | null; chapters: Chapter[] };

/** Split a subject's chapters into its sections; numbering restarts inside each one. */
export function splitSections(chapters: Chapter[]): SectionGroup[] {
  const out: SectionGroup[] = [];
  for (const c of chapters) {
    const key = c.section?.trim() || null;
    const last = out[out.length - 1];
    if (last && last.section === key) last.chapters.push(c);
    else out.push({ section: key, chapters: [c] });
  }
  return out;
}
