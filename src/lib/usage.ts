import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InstituteLimits } from "@/lib/institute-controls";

export type Usage = {
  students: number;
  rooms: number;
  batches: number;
  faculty: number;
  staffLogins: number;
  teacherLogins: number;
};

export function useUsage() {
  return useQuery({
    queryKey: ["institute-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_institute_usage");
      if (error) throw error;
      return (data ?? {
        students: 0,
        rooms: 0,
        batches: 0,
        faculty: 0,
        staffLogins: 0,
        teacherLogins: 0,
      }) as unknown as Usage;
    },
  });
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
