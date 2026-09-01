import { supabase } from "@/integrations/supabase/client";
import { planFor, type Plan } from "@/lib/plans";

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

export type PlanLimits = {
  name: string;
  tagline: string;
  students: number;
  rooms: number;
  batches: number;
  staffLogins: number;
  teacherLogins: number;
};

/**
 * Limits live in the database (plan_catalog → institutes), so whatever the
 * Academix team sets in the pricing console is what the app enforces.
 */
export async function fetchPlanLimits(): Promise<PlanLimits> {
  const { data: instituteId } = await supabase.rpc("current_institute_id");
  const fallback = planFor(null);
  if (!instituteId) {
    return {
      name: fallback.name,
      tagline: fallback.tagline,
      students: fallback.students,
      rooms: fallback.rooms,
      batches: fallback.batches,
      staffLogins: fallback.staffLogins,
      teacherLogins: fallback.teacherLogins,
    };
  }
  const { data } = await supabase
    .from("institutes")
    .select("plan,student_limit,room_limit,batch_limit,staff_login_limit,teacher_login_limit")
    .eq("id", instituteId as string)
    .maybeSingle();
  const p = planFor(data?.plan ?? null);
  const { data: cat } = await supabase
    .from("plan_catalog")
    .select("name,tagline")
    .eq("key", data?.plan ?? p.key)
    .maybeSingle();
  return {
    name: cat?.name ?? p.name,
    tagline: cat?.tagline ?? p.tagline,
    students: data?.student_limit ?? p.students,
    rooms: data?.room_limit ?? p.rooms,
    batches: data?.batch_limit ?? p.batches,
    staffLogins: data?.staff_login_limit ?? p.staffLogins,
    teacherLogins: data?.teacher_login_limit ?? p.teacherLogins,
  };
}

export type LimitRow = { label: string; used: number; limit: number };

/** 0 in a plan limit means unlimited. */
export function limitRows(plan: Plan | PlanLimits, u: Usage): LimitRow[] {
  return [
    { label: "Students", used: u.students, limit: plan.students },
    { label: "Classrooms", used: u.rooms, limit: plan.rooms },
    { label: "Batches", used: u.batches, limit: plan.batches },
    { label: "Office logins", used: u.staffLogins, limit: plan.staffLogins },
    { label: "Teacher logins", used: u.teacherLogins, limit: plan.teacherLogins },
  ];
}
