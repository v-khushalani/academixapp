import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
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
  async chapters(batchId?: string): Promise<Chapter[]> {
    let q = supabase.from("syllabus_chapters").select("*").order("subject").order("position");
    if (batchId) q = q.eq("batch_id", batchId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Chapter[];
  },

  /** Add one or many chapters to a batch + subject, appended after the last one. */
  async addChapters(batchId: string, subject: string, titles: string[], startAt: number) {
    const rows: ChapterInsert[] = titles
      .map((t) => t.trim())
      .filter(Boolean)
      .map((title, i) => ({ batch_id: batchId, subject, title, position: startAt + i }));
    if (!rows.length) return [];
    const { data, error } = await supabase.from("syllabus_chapters").insert(rows).select();
    if (error) throw error;
    return data ?? [];
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
      position: c.position,
      planned_sessions: c.planned_sessions,
    }));
    const { error } = await supabase.from("syllabus_chapters").insert(rows);
    if (error) throw error;
    return rows.length;
  },

  async reorder(ids: string[]) {
    const { error } = await supabase.rpc("reorder_syllabus_chapters", { _ids: ids });
    if (error) throw error;
    return ids;
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
  estimated_completion?: string | null;
};

/** Weighted by planned sessions so a 4-session chapter counts more than a 1-session one. */
export function groupBySubject(chapters: Chapter[], logs: SyllabusLog[] = []): SubjectProgress[] {
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
      const doneChapters = list.filter((c) => c.status === "done");
      const inProgressChapters = list.filter((c) => c.status === "in_progress");

      // Forecasting logic: calculate avg days per chapter based on logs
      let estimatedCompletion: string | null = null;
      if (doneChapters.length > 0 && list.length > doneChapters.length) {
        const subjectLogs = logs
          .filter((l) => list.some((c) => c.id === l.chapter_id))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (subjectLogs.length >= 2) {
          const start = new Date(subjectLogs[0].date).getTime();
          const end = new Date(subjectLogs[subjectLogs.length - 1].date).getTime();
          const daysElapsed = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
          const daysPerChapter = daysElapsed / doneChapters.length;
          const chaptersLeft = list.length - doneChapters.length;
          const remainingDays = Math.round(chaptersLeft * daysPerChapter);
          const completionDate = new Date();
          completionDate.setDate(completionDate.getDate() + remainingDays);
          estimatedCompletion = completionDate.toISOString().slice(0, 10);
        }
      }

      return {
        subject,
        total: list.length,
        done: doneChapters.length,
        inProgress: inProgressChapters.length,
        pct: totalW ? Math.round((doneW / totalW) * 100) : 0,
        current: inProgressChapters[0] ?? null,
        chapters: list,
        estimated_completion: estimatedCompletion,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

export function overallPct(chapters: Chapter[]) {
  const groups = groupBySubject(chapters);
  if (!groups.length) return 0;
  return Math.round(groups.reduce((s, g) => s + g.pct, 0) / groups.length);
}
