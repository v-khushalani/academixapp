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

function orThrow<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

// ---------- Students ----------
export const studentsApi = {
  async list(): Promise<(Student & { batch?: Batch | null })[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*, batch:batches(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (Student & { batch?: Batch | null })[];
  },
  async get(id: string) {
    const { data, error } = await supabase.from("students").select("*, batch:batches(*)").eq("id", id).maybeSingle();
    if (error) throw error; return data;
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
};

// ---------- Batches ----------
export const batchesApi = {
  async list() {
    const { data, error } = await supabase.from("batches").select("*").order("created_at", { ascending: false });
    if (error) throw error; return data ?? [];
  },
  async get(id: string) {
    const { data, error } = await supabase.from("batches").select("*").eq("id", id).maybeSingle();
    if (error) throw error; return data;
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
    const { data, error } = await supabase.from("students").select("*").eq("batch_id", batchId).order("full_name");
    if (error) throw error; return data ?? [];
  },
};

// ---------- Fees ----------
export const feesApi = {
  async list() {
    const { data, error } = await supabase
      .from("fees")
      .select("*, student:students(id,full_name,admission_no)")
      .order("created_at", { ascending: false });
    if (error) throw error; return data ?? [];
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

// ---------- Tests ----------
export const testsApi = {
  async list() {
    const { data, error } = await supabase.from("tests").select("*, batch:batches(id,name)").order("date", { ascending: false });
    if (error) throw error; return data ?? [];
  },
  async get(id: string) {
    const { data, error } = await supabase.from("tests").select("*, batch:batches(id,name)").eq("id", id).maybeSingle();
    if (error) throw error; return data;
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
    if (error) throw error; return data ?? [];
  },
};

// ---------- Leads ----------
export const leadsApi = {
  async list() {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) throw error; return data ?? [];
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
    if (error) throw error; return data ?? [];
  },
  async upsertMany(rows: Tables["attendance"]["Insert"][]) {
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) throw error;
  },
};

// ---------- Dashboard ----------
export const dashboardApi = {
  async summary() {
    const [studentsCount, activeBatches, pendingFees, monthAdmissions] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("fees").select("amount, amount_paid").in("status", ["pending","partial","overdue"]),
      supabase.from("students").select("id", { count: "exact", head: true })
        .gte("admission_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)),
    ]);
    const outstanding = (pendingFees.data ?? []).reduce((sum, f) => sum + Number(f.amount) - Number(f.amount_paid ?? 0), 0);
    return {
      students: studentsCount.count ?? 0,
      batches: activeBatches.count ?? 0,
      outstanding,
      newThisMonth: monthAdmissions.count ?? 0,
    };
  },
};

// ---------- Profiles + Users ----------
export const profilesApi = {
  async list() {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error; return data ?? [];
  },
  async get(id: string) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error; return data;
  },
  async update(id: string, input: Partial<Tables["profiles"]["Update"]>) {
    return orThrow(await supabase.from("profiles").update(input).eq("id", id).select().single());
  },
};

export const rolesApi = {
  async listForUser(userId: string) {
    const { data, error } = await supabase.from("user_roles").select("*").eq("user_id", userId);
    if (error) throw error; return data ?? [];
  },
};