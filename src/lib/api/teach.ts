import { supabase } from "@/integrations/supabase/client";

/** Faculty row linked to the signed-in auth user (falls back to email match). */
export async function myFaculty(userId?: string, email?: string | null) {
  if (userId) {
    const { data } = await supabase.from("faculty").select("*").eq("user_id", userId).maybeSingle();
    if (data) return data;
  }
  if (email) {
    const { data } = await supabase.from("faculty").select("*").eq("email", email).maybeSingle();
    if (data) return data;
  }
  return null;
}

/** Timetable slots for a faculty on a given weekday (0=Sun). */
export async function mySlots(facultyId: string, dayOfWeek: number) {
  const { data, error } = await supabase
    .from("timetable_slots")
    .select("*, batch:batches(id,name), room_ref:rooms(id,name,capacity)")
    .eq("faculty_id", facultyId)
    .eq("day_of_week", dayOfWeek)
    .order("start_time");
  if (error) throw error;
  return data ?? [];
}

/** Distinct batches a faculty teaches, derived from the timetable. */
export async function myBatches(facultyId: string) {
  const { data, error } = await supabase
    .from("timetable_slots")
    .select("batch:batches(id,name)")
    .eq("faculty_id", facultyId);
  if (error) throw error;
  const map = new Map<string, { id: string; name: string }>();
  for (const row of data ?? []) {
    const b = (row as { batch?: { id: string; name: string } | null }).batch;
    if (b) map.set(b.id, b);
  }
  return Array.from(map.values());
}

/**
 * Subjects a faculty actually teaches, per batch, taken from the timetable.
 * Used to keep a teacher inside their own subjects instead of the whole batch.
 */
export async function mySubjectsByBatch(facultyId: string) {
  const { data, error } = await supabase
    .from("timetable_slots")
    .select("batch_id, subject")
    .eq("faculty_id", facultyId);
  if (error) throw error;
  const map = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!row.batch_id || !row.subject) continue;
    const set = map.get(row.batch_id) ?? new Set<string>();
    set.add(row.subject.trim().toLowerCase());
    map.set(row.batch_id, set);
  }
  return map;
}

/** Subjects scheduled for a batch (timetable), for subject dropdowns. */
export async function batchSubjects(batchId: string) {
  const { data, error } = await supabase
    .from("timetable_slots")
    .select("subject")
    .eq("batch_id", batchId);
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) if (row.subject?.trim()) set.add(row.subject.trim());
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
