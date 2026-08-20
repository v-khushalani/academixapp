import { supabase } from "@/integrations/supabase/client";

export type InviteKind = "student" | "parent";

export type StudentInvite = {
  id: string;
  student_id: string;
  kind: string;
  relation: string | null;
  token: string;
  used_at: string | null;
  expires_at: string;
};

/** Where a family invite link points. */
export function inviteUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/welcome/${token}`;
}

export const studentInvitesApi = {
  async list(): Promise<StudentInvite[]> {
    const { data, error } = await supabase
      .from("student_invites")
      .select("id, student_id, kind, relation, token, used_at, expires_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as StudentInvite[];
  },
  async create(studentId: string, kind: InviteKind, relation?: string): Promise<string> {
    const { data: inst, error: instErr } = await supabase.rpc("current_institute_id");
    if (instErr) throw instErr;
    const { data, error } = await supabase
      .from("student_invites")
      .insert({
        student_id: studentId,
        kind,
        relation: relation ?? null,
        institute_id: inst as string,
      })
      .select("token")
      .single();
    if (error) throw error;
    return data.token as string;
  },
};

export type PortalStatus = "none" | "invited" | "active";

/** Portal access state for one student, from their invites + linked account. */
export function portalStatus(
  student: { id: string; user_id?: string | null },
  invites: StudentInvite[],
): PortalStatus {
  if (student.user_id) return "active";
  const mine = invites.filter((i) => i.student_id === student.id);
  if (mine.some((i) => i.used_at)) return "active";
  const now = Date.now();
  if (mine.some((i) => !i.used_at && new Date(i.expires_at).getTime() > now)) return "invited";
  return "none";
}