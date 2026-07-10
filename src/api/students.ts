/**
 * Students API - All student-related database operations
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Student = Tables["students"]["Row"];
export type StudentInsert = Tables["students"]["Insert"];
export type StudentUpdate = Tables["students"]["Update"];
export type Batch = Tables["batches"]["Row"];

function orThrow<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

/**
 * Fetch all students with optional filters
 * @param opts.approval - Filter by approval status
 * @returns Array of students with batch information
 * @throws {Error} If database query fails
 */
export async function listStudents(opts?: {
  approval?: "approved" | "pending" | "rejected" | "all";
}): Promise<(Student & { batch?: Batch | null })[]> {
  const approval = opts?.approval ?? "approved";
  let q = supabase.from("students").select("*, batch:batches(*)");
  if (approval !== "all") q = q.eq("approval_status", approval);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Student & { batch?: Batch | null })[];
}

/**
 * Fetch single student by ID
 * @param id - Student UUID
 * @returns Student with batch info, or null if not found
 */
export async function getStudent(id: string): Promise<(Student & { batch?: Batch | null }) | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*, batch:batches(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Create new student
 * @param input - Student data
 * @returns Created student
 */
export async function createStudent(input: StudentInsert): Promise<Student> {
  return orThrow(await supabase.from("students").insert(input).select().single());
}

/**
 * Update student
 * @param id - Student UUID
 * @param input - Partial student data
 * @returns Updated student
 */
export async function updateStudent(id: string, input: StudentUpdate): Promise<Student> {
  return orThrow(await supabase.from("students").update(input).eq("id", id).select().single());
}

/**
 * Delete student
 * @param id - Student UUID
 */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Set student approval status
 * @param id - Student UUID
 * @param decision - Approval decision
 */
export async function setStudentApproval(
  id: string,
  decision: "approved" | "rejected" | "pending",
): Promise<void> {
  const { error } = await supabase.rpc("set_student_approval", {
    _student_id: id,
    _decision: decision,
  });
  if (error) throw error;
}

/**
 * Get signed URL for student photo
 * @param path - Photo path in storage
 * @param expiresIn - URL expiry in seconds (default 1 hour)
 * @returns Signed URL or null if path is invalid
 */
export async function getStudentPhotoUrl(
  path: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("student-photos")
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data.signedUrl;
}
