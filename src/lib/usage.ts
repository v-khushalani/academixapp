import { supabase } from "@/integrations/supabase/client";
import type { InstituteLimits } from "@/lib/institute-controls";

export type Usage = {
  students: number;
  rooms: number;
  batches: number;
  staffLogins: number;
  teacherLogins: number;
};

const OFFICE = ["owner", "admin", "receptionist", "counsellor", "accountant"];

export async function fetchUsage(): Promise<Usage> {
  const count = async (
    table: "students" | "rooms" | "batches",
    filter?: (q: ReturnType<typeof supabase.from>) => unknown,
  ) => {
    void filter;
    const { count: c } = await supabase.from(table).select("id", { count: "exact", head: true });
    return c ?? 0;
  };

  const [students, rooms, batches] = await Promise.all([
    count("students"),
    count("rooms"),
    count("batches"),
  ]);

  const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
  const office = new Set<string>();
  const teachers = new Set<string>();
  for (const r of roleRows ?? []) {
    if (OFFICE.includes(r.role as string)) office.add(r.user_id as string);
    if (r.role === "faculty") teachers.add(r.user_id as string);
  }

  return {
    students,
    rooms,
    batches,
    staffLogins: office.size,
    teacherLogins: teachers.size,
  };
}

export type LimitRow = { label: string; used: number; limit: number };

/** 0 means unlimited. Limits are set per institute by Team Academix. */
export function limitRows(limits: InstituteLimits, u: Usage): LimitRow[] {
  return [
    { label: "Students", used: u.students, limit: limits.students },
    { label: "Classrooms", used: u.rooms, limit: limits.rooms },
    { label: "Batches", used: u.batches, limit: limits.batches },
    { label: "Office logins", used: u.staffLogins, limit: limits.staffLogins },
    { label: "Teacher logins", used: u.teacherLogins, limit: limits.teacherLogins },
  ];
}