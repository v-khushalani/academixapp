import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Student = Tables["students"]["Row"];
export type StudentInsert = Tables["students"]["Insert"];
export type StudentUpdate = Tables["students"]["Update"];
export type Batch = Tables["batches"]["Row"];
export type BatchInsert = Tables["batches"]["Insert"];
export type Fee = Tables["fees"]["Row"];
export type FeeInsert = Tables["fees"]["Insert"];
export type Test = Tables["tests"]["Row"];
export type TestInsert = Tables["tests"]["Insert"];
export type Lead = Tables["leads"]["Row"];
export type LeadInsert = Tables["leads"]["Insert"];
export type Attendance = Tables["attendance"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type Faculty = Tables["faculty"]["Row"];
export type FacultyInsert = Tables["faculty"]["Insert"];
export type TimetableSlot = Tables["timetable_slots"]["Row"];
export type TimetableSlotInsert = Tables["timetable_slots"]["Insert"];
export type Room = Tables["rooms"]["Row"];
export type RoomInsert = Tables["rooms"]["Insert"];
export type Subject = Tables["subjects"]["Row"];
export type Course = Tables["courses"]["Row"];
export type CourseInsert = Tables["courses"]["Insert"];
export type SubjectInsert = Tables["subjects"]["Insert"];
export type UserRole = Tables["user_roles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type DayPlan = Tables["timetable_day_plan"]["Row"];
export type DayPlanInsert = Tables["timetable_day_plan"]["Insert"];
export type Institute = Tables["institutes"]["Row"];

function orThrow<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

/** Query keys that must refresh together whenever money / enrolment data changes. */
export const LINKED_KEYS = [
  "students",
  "batches",
  "batch-roster",
  "fees",
  "dashboard-summary",
  "timetable",
  "attendance",
  "tests",
  "portal-fees",
  "rooms",
] as const;

// ---------- Students ----------
export const studentsApi = {
  async list(opts?: {
    approval?: "approved" | "pending" | "rejected" | "enquiry" | "all";
    approvals?: string[];
  }): Promise<(Student & { batch?: Batch | null })[]> {
    const approval = opts?.approval ?? "approved";
    let q = supabase.from("students").select("*, batch:batches(*)");
    if (opts?.approvals?.length) q = q.in("approval_status", opts.approvals);
    else if (approval !== "all") q = q.eq("approval_status", approval);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (Student & { batch?: Batch | null })[];
  },
  async get(id: string) {
    const { data, error } = await supabase
      .from("students")
      .select("*, batch:batches(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(input: StudentInsert) {
    return orThrow(await supabase.from("students").insert(input).select().single());
  },
  async update(id: string, input: StudentUpdate) {
    return orThrow(await supabase.from("students").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
  },
  async setApproval(id: string, decision: "approved" | "rejected" | "pending") {
    const { error } = await supabase.rpc("set_student_approval", {
      _student_id: id,
      _decision: decision,
    });
    if (error) throw error;
  },
  /** Approve an applicant into a batch — creates the batch fee and records any token paid. */
  async approveWithBatch(id: string, batchId: string, tokenAmount?: number) {
    const { error } = await supabase.rpc("approve_admission", {
      _student_id: id,
      _batch_id: batchId,
      _token_amount: tokenAmount ?? undefined,
    });
    if (error) throw error;
  },
  async setNotes(id: string, notes: string) {
    const { error } = await supabase.from("students").update({ notes }).eq("id", id);
    if (error) throw error;
  },
  async signedPhotoUrl(path: string | null | undefined, expiresIn = 3600) {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(path, expiresIn);
    if (error) return null;
    return data.signedUrl;
  },
};

// ---------- Batches ----------
export const batchesApi = {
  async list() {
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async get(id: string) {
    const { data, error } = await supabase.from("batches").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(input: BatchInsert) {
    return orThrow(await supabase.from("batches").insert(input).select().single());
  },
  async update(id: string, input: Partial<BatchInsert>) {
    return orThrow(await supabase.from("batches").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) throw error;
  },
  async roster(batchId: string) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("batch_id", batchId)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  },
};

// ---------- Fees ----------
export const feesApi = {
  async list() {
    const { data, error } = await supabase
      .from("fees")
      .select("*, student:students(id,full_name,admission_no)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  /** Outstanding batch-fee rows for one student (auto-created from the batch fee). */
  async forStudent(studentId: string) {
    const { data, error } = await supabase
      .from("fees")
      .select("*, batch:batches(id,name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  /** Record money received against an existing fee row. */
  async collect(feeId: string, received: number, method?: string | null, note?: string | null) {
    const { data: row, error: e1 } = await supabase
      .from("fees")
      .select("amount, amount_paid, receipt_no, description")
      .eq("id", feeId)
      .single();
    if (e1) throw e1;
    const amount = Number(row.amount);
    const paid = Number(row.amount_paid ?? 0) + Number(received);
    const status: Database["public"]["Enums"]["fee_status"] =
      paid <= 0 ? "pending" : paid >= amount ? "paid" : "partial";
    const { error } = await supabase
      .from("fees")
      .update({
        amount_paid: paid,
        status,
        method: method || null,
        paid_date: new Date().toISOString().slice(0, 10),
        receipt_no: row.receipt_no ?? makeReceiptNo(),
        description: note ? `${row.description ?? ""}${row.description ? " · " : ""}${note}` : row.description,
      })
      .eq("id", feeId);
    if (error) throw error;
  },
  async create(input: FeeInsert) {
    return orThrow(await supabase.from("fees").insert(input).select().single());
  },
  async update(id: string, input: Partial<FeeInsert>) {
    return orThrow(await supabase.from("fees").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("fees").delete().eq("id", id);
    if (error) throw error;
  },
};

export function makeReceiptNo() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RCP-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Single source of truth for "how much is still owed" on one fee row. */
export function outstandingOf(f: { amount: number | string; amount_paid?: number | string | null; status?: string | null }) {
  if (f.status === "waived" || f.status === "paid") return 0;
  return Math.max(0, Number(f.amount) - Number(f.amount_paid ?? 0));
}

// ---------- Tests ----------
export const testsApi = {
  async list() {
    const { data, error } = await supabase
      .from("tests")
      .select("*, batch:batches(id,name)")
      .order("date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async get(id: string) {
    const { data, error } = await supabase
      .from("tests")
      .select("*, batch:batches(id,name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(input: TestInsert) {
    return orThrow(await supabase.from("tests").insert(input).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw error;
  },
  async results(testId: string) {
    const { data, error } = await supabase
      .from("test_results")
      .select("*, student:students(id,full_name,admission_no)")
      .eq("test_id", testId)
      .order("marks", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ---------- Leads ----------
export const leadsApi = {
  async list() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(input: LeadInsert) {
    return orThrow(await supabase.from("leads").insert(input).select().single());
  },
  async updateStage(id: string, stage: Database["public"]["Enums"]["lead_stage"]) {
    return orThrow(await supabase.from("leads").update({ stage }).eq("id", id).select().single());
  },
  async update(id: string, input: Partial<LeadInsert>) {
    return orThrow(await supabase.from("leads").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Attendance ----------
export const attendanceApi = {
  async listForBatchDate(batchId: string, date: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("batch_id", batchId)
      .eq("date", date);
    if (error) throw error;
    return data ?? [];
  },
  async upsertMany(rows: Tables["attendance"]["Insert"][]) {
    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });
    if (error) throw error;
  },
};

// ---------- Dashboard ----------
export const dashboardApi = {
  async summary() {
    const [studentsCount, activeBatches, pendingFees, monthAdmissions] = await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("approval_status", "approved"),
      supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("fees").select("amount, amount_paid, status"),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "approved")
        .gte(
          "admission_date",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        ),
    ]);
    const rows = pendingFees.data ?? [];
    const outstanding = rows.reduce((sum, f) => sum + outstandingOf(f), 0);
    const collected = rows.reduce((sum, f) => sum + Number(f.amount_paid ?? 0), 0);
    return {
      students: studentsCount.count ?? 0,
      batches: activeBatches.count ?? 0,
      outstanding,
      collected,
      newThisMonth: monthAdmissions.count ?? 0,
    };
  },
};

// ---------- Profiles + Users ----------
export const profilesApi = {
  async list() {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return data ?? [];
  },
  async get(id: string) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id: string, input: Partial<Tables["profiles"]["Update"]>) {
    return orThrow(await supabase.from("profiles").update(input).eq("id", id).select().single());
  },
};

export const rolesApi = {
  async listForUser(userId: string) {
    const { data, error } = await supabase.from("user_roles").select("*").eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  },
};

// ---------- Faculty ----------
export const facultyApi = {
  async list() {
    const { data, error } = await supabase.from("faculty").select("*").order("full_name");
    if (error) throw error;
    return data ?? [];
  },
  async create(input: FacultyInsert) {
    return orThrow(await supabase.from("faculty").insert(input).select().single());
  },
  async update(id: string, input: Partial<FacultyInsert>) {
    return orThrow(await supabase.from("faculty").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("faculty").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Timetable ----------
export const timetableApi = {
  async list() {
    const { data, error } = await supabase
      .from("timetable_slots")
      .select(
        "*, batch:batches(id,name), faculty:faculty(id,full_name), room_ref:rooms(id,name,capacity)",
      )
      .order("day_of_week")
      .order("start_time");
    if (error) throw error;
    return data ?? [];
  },
  async create(input: TimetableSlotInsert) {
    return orThrow(await supabase.from("timetable_slots").insert(input).select().single());
  },
  async update(id: string, input: Partial<TimetableSlotInsert>) {
    return orThrow(
      await supabase.from("timetable_slots").update(input).eq("id", id).select().single(),
    );
  },
  async remove(id: string) {
    const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Classrooms ----------
export const roomsApi = {
  async list(opts?: { includeInactive?: boolean }): Promise<Room[]> {
    let q = supabase.from("rooms").select("*");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q.order("name");
    if (error) throw error;
    return data ?? [];
  },
  async create(input: RoomInsert) {
    return orThrow(await supabase.from("rooms").insert(input).select().single());
  },
  async update(id: string, input: Partial<RoomInsert>) {
    return orThrow(await supabase.from("rooms").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Institute (plan / limits) ----------
export const instituteApi = {
  async get(): Promise<Institute | null> {
    const { data, error } = await supabase.from("institutes").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
  async setPlan(id: string, plan: string, roomLimit: number) {
    return orThrow(
      await supabase
        .from("institutes")
        .update({ plan, room_limit: roomLimit })
        .eq("id", id)
        .select()
        .single(),
    );
  },
};

// ---------- Daily schedule (per-date plan on top of the weekly grid) ----------
export type DayPlanRow = DayPlan & {
  batch?: { id: string; name: string } | null;
  faculty?: { id: string; full_name: string; phone: string | null } | null;
  room_ref?: { id: string; name: string; capacity: number } | null;
};

export const dayPlanApi = {
  async listForDate(date: string): Promise<DayPlanRow[]> {
    const { data, error } = await supabase
      .from("timetable_day_plan")
      .select(
        "*, batch:batches(id,name), faculty:faculty(id,full_name,phone), room_ref:rooms(id,name,capacity)",
      )
      .eq("date", date);
    if (error) throw error;
    return (data ?? []) as DayPlanRow[];
  },
  /** One row per weekly slot per date — update when it already exists. */
  async save(input: DayPlanInsert & { slot_id: string; date: string }) {
    const { data: existing, error: findErr } = await supabase
      .from("timetable_day_plan")
      .select("id")
      .eq("slot_id", input.slot_id)
      .eq("date", input.date)
      .maybeSingle();
    if (findErr) throw findErr;
    if (existing) {
      return orThrow(
        await supabase
          .from("timetable_day_plan")
          .update(input)
          .eq("id", existing.id)
          .select()
          .single(),
      );
    }
    return orThrow(await supabase.from("timetable_day_plan").insert(input).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("timetable_day_plan").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Attendance (extended) ----------
export const attendanceListApi = {
  async listForDate(date: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        "*, student:students(id,full_name,admission_no,parent_name,parent_phone,phone), batch:batches(id,name)",
      )
      .eq("date", date);
    if (error) throw error;
    return data ?? [];
  },
};

// ---------- Courses & Subjects ----------
export const coursesApi = {
  async list() {
    const { data, error } = await supabase.from("courses").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  },
  async create(input: CourseInsert) {
    return orThrow(await supabase.from("courses").insert(input).select().single());
  },
  async update(id: string, input: Partial<CourseInsert>) {
    return orThrow(await supabase.from("courses").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) throw error;
  },
};

export const subjectsApi = {
  async list() {
    const { data, error } = await supabase
      .from("subjects")
      .select("*, course:courses(id,name)")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
  async create(input: SubjectInsert) {
    return orThrow(await supabase.from("subjects").insert(input).select().single());
  },
  async update(id: string, input: Partial<SubjectInsert>) {
    return orThrow(await supabase.from("subjects").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Users & roles ----------
export const userRolesApi = {
  async listAll() {
    const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const byUser = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
  },
  async addRole(user_id: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id, role });
    if (error) throw error;
  },
  async removeRole(user_id: string, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user_id)
      .eq("role", role);
    if (error) throw error;
  },
};
