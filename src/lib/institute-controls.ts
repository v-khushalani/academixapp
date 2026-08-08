// Per-institute limits and feature switches. Set by Team Academix in the
// platform console; the institute-facing app only reads them.

import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_PHONE = "70666 70222";
export const SUPPORT_PHONE_TEL = "+917066670222";

/** Modules that Team Academix can switch on/off per institute. */
export const FEATURE_KEYS = [
  "admissions",
  "attendance",
  "fees",
  "tests",
  "syllabus",
  "timetable",
  "faculty",
  "reports",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  admissions: "Admissions & enquiries",
  attendance: "Attendance",
  fees: "Fees & receipts",
  tests: "Tests & marks",
  syllabus: "Syllabus tracking",
  timetable: "Timetable",
  faculty: "Faculty",
  reports: "Reports",
};

export type InstituteLimits = {
  students: number;
  rooms: number;
  batches: number;
  faculty: number;
  staffLogins: number;
  teacherLogins: number;
};

export type InstituteControls = {
  id: string;
  name: string;
  parent_institute_id: string | null;
  limits: InstituteLimits;
  features: Partial<Record<FeatureKey, boolean>>;
};

/** A missing flag means "on" — institutes get everything unless we switch it off. */
export function featureOn(
  features: Partial<Record<FeatureKey, boolean>> | null | undefined,
  key: FeatureKey,
): boolean {
  return features?.[key] !== false;
}

export async function fetchInstituteControls(instituteId?: string): Promise<InstituteControls[]> {
  let q = supabase
    .from("institutes")
    .select(
      "id, name, parent_institute_id, student_limit, room_limit, batch_limit, faculty_limit, staff_login_limit, teacher_login_limit, features",
    )
    .order("name");
  if (instituteId) q = q.eq("id", instituteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    parent_institute_id: r.parent_institute_id,
    limits: {
      students: r.student_limit ?? 0,
      rooms: r.room_limit ?? 0,
      batches: r.batch_limit ?? 0,
      faculty: r.faculty_limit ?? 0,
      staffLogins: r.staff_login_limit ?? 0,
      teacherLogins: r.teacher_login_limit ?? 0,
    },
    features: (r.features ?? {}) as Partial<Record<FeatureKey, boolean>>,
  }));
}