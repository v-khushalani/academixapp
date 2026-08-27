import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeatureMap } from "@/lib/features";

export type PlatformInstitute = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  parent_institute_id: string | null;
  student_limit: number;
  room_limit: number;
  batch_limit: number;
  faculty_limit: number;
  staff_login_limit: number;
  teacher_login_limit: number;
  custom_branding: boolean;
  attendance_devices: boolean;
  features: FeatureMap | null;
  students: number;
  batches: number;
  rooms: number;
  faculty: number;
  staff_logins: number;
  teacher_logins: number;
};

export type DetailRow = {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  extra: string | null;
};

export async function fetchPlatformInstitutes(): Promise<PlatformInstitute[]> {
  const { data, error } = await supabase.rpc("platform_institutes");
  if (error) throw error;
  return (data ?? []) as PlatformInstitute[];
}

export function usePlatformInstitutes() {
  return useQuery({ queryKey: ["platform-institutes"], queryFn: fetchPlatformInstitutes });
}
