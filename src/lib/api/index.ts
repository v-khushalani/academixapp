import { supabase } from "@/integrations/supabase/client";
import { formatTime12 } from "@/lib/time";
import { formatDate } from "@/lib/dates";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

/** PostgREST caps unbounded reads at 1000 rows; ask for a larger explicit window. */
const MAX_ROWS = 5000;

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
export type Course = Tables["courses"]["Row"];
export type CourseInsert = Tables["courses"]["Insert"];
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
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .range(0, MAX_ROWS - 1);
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
      .order("created_at", { ascending: false })
      .range(0, MAX_ROWS - 1);
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
    const { error } = await supabase.rpc("collect_fee_payment", {
      _fee_id: feeId,
      _received: received,
      _method: method ?? undefined,
      _note: note ?? undefined
    });
    if (error) throw error;
  },
  async create(input: FeeInsert) {
    return orThrow(await supabase.from("fees").insert(input).select().single());
  },
  async update(id: string, input: Partial<FeeInsert>) {
    return orThrow(await supabase.from("fees").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { data: row, error: e0 } = await supabase
      .from("fees")
      .select("amount_paid")
      .eq("id", id)
      .single();
    if (e0) throw e0;
    if (Number(row.amount_paid ?? 0) > 0)
      throw new Error(
        "Money has already been received on this entry. Cancel the bill or reverse the payment instead of deleting it.",
      );
    const { error } = await supabase.from("fees").delete().eq("id", id);
    if (error) throw error;
  },
  /**
   * Write off a bill that should not have been raised. Cash already received stays
   * in Collected; the pending amount goes to zero.
   */
  async cancel(id: string, reason: string) {
    const { data: row, error: e0 } = await supabase
      .from("fees")
      .select("amount, amount_paid, student_id, institute_id")
      .eq("id", id)
      .single();
    if (e0) throw e0;
    const { error } = await supabase
      .from("fees")
      .update({ status: "cancelled" as Database["public"]["Enums"]["fee_status"] })
      .eq("id", id);
    if (error) throw error;
    await logAdjustment({
      fee_id: id,
      student_id: row.student_id,
      institute_id: row.institute_id,
      kind: "cancel",
      amount: Math.max(0, Number(row.amount) - Number(row.amount_paid ?? 0)),
      reason,
    });
  },
  /** Reverse money recorded by mistake (or refunded to the parent). */
  async reversePayment(id: string, amount: number, reason: string) {
    const { data: row, error: e0 } = await supabase
      .from("fees")
      .select("amount, amount_paid, student_id, institute_id, status")
      .eq("id", id)
      .single();
    if (e0) throw e0;
    const back = Math.min(Math.max(0, Number(amount)), Number(row.amount_paid ?? 0));
    if (back <= 0) throw new Error("Nothing to reverse on this entry.");
    const paid = Number(row.amount_paid ?? 0) - back;
    const billed = Number(row.amount);
    const status: Database["public"]["Enums"]["fee_status"] =
      row.status === "cancelled"
        ? "cancelled"
        : paid <= 0
          ? "pending"
          : paid >= billed
            ? "paid"
            : "partial";
    const { error } = await supabase
      .from("fees")
      .update({ amount_paid: paid, status, paid_date: paid > 0 ? undefined : null })
      .eq("id", id);
    if (error) throw error;
    await logAdjustment({
      fee_id: id,
      student_id: row.student_id,
      institute_id: row.institute_id,
      kind: "refund",
      amount: back,
      reason,
    });
  },
  async adjustments(feeId: string) {
    const { data, error } = await supabase
      .from("fee_adjustments")
      .select("*")
      .eq("fee_id", feeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

async function logAdjustment(input: {
  fee_id: string;
  student_id: string | null;
  institute_id: string;
  kind: "cancel" | "refund";
  amount: number;
  reason: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("fee_adjustments").insert({
    ...input,
    reason: input.reason || null,
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export function makeReceiptNo() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RCP-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Single source of truth for "how much is still owed" on one fee row. */
export function outstandingOf(f: { amount: number | string; amount_paid?: number | string | null; status?: string | null }) {
  if (f.status === "waived" || f.status === "paid" || f.status === "cancelled") return 0;
  return Math.max(0, Number(f.amount) - Number(f.amount_paid ?? 0));
}

/** Bills that count towards "billed" totals — cancelled entries are excluded. */
export function isLiveBill(f: { status?: string | null }) {
  return f.status !== "cancelled";
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
      .order("created_at", { ascending: false })
      .range(0, MAX_ROWS - 1);
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
  /** Absentees for a day that the office has not messaged yet. */
  async absentees(date: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        "id, date, notified_at, batch:batches(name), student:students(id, full_name, parent_name, parent_phone, phone)",
      )
      .eq("date", date)
      .eq("status", "absent")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as {
      id: string;
      date: string;
      notified_at: string | null;
      batch?: { name?: string } | null;
      student?: {
        id: string;
        full_name: string;
        parent_name: string | null;
        parent_phone: string | null;
        phone: string | null;
      } | null;
    }[];
  },
  async markNotified(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase.rpc("mark_attendance_notified", { _ids: ids });
    if (error) throw error;
  },
};

// ---------- Dashboard ----------
export const dashboardApi = {
  /** Consolidated dashboard data for production performance. */
  async overview() {
    const { data, error } = await supabase.rpc("get_dashboard_overview");
    if (error) throw error;
    
    // Default structure for missing today/upcoming fields in the minimal consolidated RPC
    return {
      ...(data as any),
      money: {
        billed: 0,
        outstanding: (data as any).money?.outstanding ?? 0,
        collected: 0,
        collectedThisMonth: (data as any).money?.collectedThisMonth ?? 0,
        collectedLastMonth: (data as any).money?.collectedLastMonth ?? 0,
        ageing: { current: 0, d30: 0, d60: 0 },
        defaulters: [],
        ...(data as any).money
      },
      today: {
        classes: 0,
        batchesScheduled: 0,
        batchesMarked: 0,
        present: 0,
        absent: 0
      },
      upcomingTests: []
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


// ---------- Users & roles ----------
export const userRolesApi = {
  async listAll() {
    const { data: inst } = await supabase.rpc("current_institute_id");
    if (!inst) return [];

    const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*").eq("institute_id", inst),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    
    // Only return profiles that actually have a role in this institute
    const userIdsWithRoles = new Set((roles ?? []).map(r => r.user_id));
    const byUser = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });

    return (profiles ?? [])
      .filter(p => userIdsWithRoles.has(p.id))
      .map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
  },
  async addRole(user_id: string, role: AppRole) {
    const { data: inst } = await supabase.rpc("current_institute_id");
    if (!inst) throw new Error("No institute context");
    const { error } = await supabase.from("user_roles").insert({ 
      user_id, 
      role, 
      institute_id: inst 
    });
    if (error) throw error;
  },
  async removeRole(user_id: string, role: AppRole) {
    const { data: inst } = await supabase.rpc("current_institute_id");
    if (!inst) throw new Error("No institute context");
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user_id)
      .eq("role", role)
      .eq("institute_id", inst);
    if (error) throw error;
  },
};

// ---------- Expenses ----------
export const expensesApi = {
  async list(from?: string, to?: string) {
    let q = supabase.from("expenses").select("*, faculty:faculty(full_name)").order("date", { ascending: false });
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
  async create(input: Omit<Tables["expenses"]["Insert"], "institute_id"> & { institute_id?: string }) {
    let instituteId = input.institute_id;
    if (!instituteId) {
      const { data: inst } = await supabase.rpc("current_institute_id");
      instituteId = (inst as string | null) ?? undefined;
    }
    if (!instituteId) throw new Error("No institute linked to your account.");
    return orThrow(
      await supabase
        .from("expenses")
        .insert({ ...input, institute_id: instituteId })
        .select()
        .single(),
    );
  },
  async update(id: string, input: Partial<Tables["expenses"]["Update"]>) {
    return orThrow(await supabase.from("expenses").update(input).eq("id", id).select().single());
  },
  async remove(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Faculty Attendance & Performance ----------
export const facultyAttendanceApi = {
  /** 
   * Faculty is "Present" if they have marked both attendance and syllabus for all their scheduled classes today.
   */
  async dailyStatus(date: string) {
    const { data: slots, error: e1 } = await supabase
      .from("timetable_slots")
      .select("faculty_id, batch_id")
      .not("faculty_id", "is", null);
    
    if (e1) throw e1;

    const { data: attendance, error: e2 } = await supabase
      .from("attendance")
      .select("marked_by, batch_id")
      .eq("date", date);
    
    if (e2) throw e2;

    const { data: syllabus, error: e3 } = await supabase
      .from("syllabus_logs")
      .select("faculty_id, chapter_id")
      .gte("created_at", date + "T00:00:00")
      .lte("created_at", date + "T23:59:59");
    
    if (e3) throw e3;

    // Logic: Map faculty to their required batches, then check if they marked them
    const facultyWork = new Map<string, Set<string>>();
    slots.forEach(s => {
      if (!s.faculty_id || !s.batch_id) return;
      const set = facultyWork.get(s.faculty_id) ?? new Set();
      set.add(s.batch_id);
      facultyWork.set(s.faculty_id, set);
    });

    const markedAtt = new Map<string, Set<string>>();
    attendance.forEach(a => {
      if (!a.marked_by || !a.batch_id) return;
      const set = markedAtt.get(a.marked_by) ?? new Set();
      set.add(a.batch_id);
      markedAtt.set(a.marked_by, set);
    });

    const markedSyl = new Set(syllabus.map(s => s.faculty_id).filter(Boolean));

    return Array.from(facultyWork.entries()).map(([facultyId, requiredBatches]) => {
      const attDone = Array.from(requiredBatches).every(b => markedAtt.get(facultyId)?.has(b));
      const sylDone = markedSyl.has(facultyId);
      return {
        facultyId,
        isAbsent: !attDone || !sylDone,
        reason: !attDone ? "Attendance not marked" : !sylDone ? "Syllabus not updated" : null
      };
    });
  },
  async processSalaries(date?: string) {
    const { data: inst } = await supabase.rpc("current_institute_id");
    const { error } = await supabase.rpc("process_faculty_salaries", {
      _institute_id: inst as string,
      _date: date ?? new Date().toISOString().slice(0, 10)
    });
    if (error) throw error;
  }
};

export { syllabusApi } from "./syllabus";


