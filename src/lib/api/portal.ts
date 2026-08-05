import { supabase } from "@/integrations/supabase/client";

export type PortalStudent = {
  id: string;
  full_name: string;
  admission_no: string;
  class: string | null;
  program: string | null;
  stream: string | null;
  batch_id: string | null;
  photo_path: string | null;
  batch?: { id: string; name: string } | null;
};

export const portalApi = {
  /** Students the signed-in user is allowed to see (own record, or children). */
  async myStudents(): Promise<PortalStudent[]> {
    const { data, error } = await supabase
      .from("students")
      .select(
        "id, full_name, admission_no, class, program, stream, batch_id, photo_path, batch:batches(id,name)",
      )
      .order("full_name");
    if (error) throw error;
    return (data ?? []) as unknown as PortalStudent[];
  },

  async attendance(studentId: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, date, status, remarks, batch_id")
      .eq("student_id", studentId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async results(studentId: string) {
    const { data, error } = await supabase
      .from("test_results")
      .select("id, marks, remarks, test:tests(id,title,subject,date,max_marks)")
      .eq("student_id", studentId);
    if (error) throw error;
    return (data ?? []).sort((a, b) =>
      String(a.test?.date ?? "").localeCompare(String(b.test?.date ?? "")),
    );
  },

  async fees(studentId: string) {
    const { data, error } = await supabase
      .from("fees")
      .select("*")
      .eq("student_id", studentId)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async timetable(batchId: string | null) {
    if (!batchId) return [];
    const { data, error } = await supabase
      .from("timetable_slots")
      .select("*, room_ref:rooms(id,name,capacity)")
      .eq("batch_id", batchId)
      .order("day_of_week")
      .order("start_time");
    if (error) throw error;
    const slots = data ?? [];
    const { data: names } = await supabase.rpc("batch_faculty_names", { _batch_id: batchId });
    const byId = new Map((names ?? []).map((n) => [n.id, n.full_name]));
    return slots.map((s) => ({
      ...s,
      faculty: s.faculty_id ? { id: s.faculty_id, full_name: byId.get(s.faculty_id) ?? null } : null,
    }));
  },

  async homework(batchId: string | null) {
    if (!batchId) return [];
    const { data, error } = await supabase
      .from("homework")
      .select("*")
      .eq("batch_id", batchId)
      .order("due_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export function attendanceStats(rows: { status: string }[]) {
  const total = rows.length;
  const present = rows.filter((r) => r.status === "present").length;
  const late = rows.filter((r) => r.status === "late").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const pct = total === 0 ? 0 : Math.round(((present + late) / total) * 100);
  return { total, present, late, absent, pct };
}

export function feeStats(rows: { amount: number; amount_paid: number | null }[]) {
  const billed = rows.reduce((s, f) => s + Number(f.amount), 0);
  const paid = rows.reduce((s, f) => s + Number(f.amount_paid ?? 0), 0);
  return { billed, paid, due: Math.max(0, billed - paid) };
}