import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";

/**
 * Academix is invite-only. A Google account gets access in exactly three ways:
 *  - the owner creates the institute at /signup
 *  - a faculty invite link / QR   (/join/$token)
 *  - a student or parent link / QR (/welcome/$token), or an approved admission
 *
 * Until an admin approves, the account is "pending": it has no role row, or a
 * role whose underlying student/faculty record is not activated yet.
 */
export type AccessState = {
  status: "ok" | "pending";
  /** Why the account cannot get in yet — shown on the waiting screen. */
  reason?: string;
};

export async function fetchAccessState(roles: AppRole[]): Promise<AccessState> {
  if (roles.length === 0) {
    return {
      status: "pending",
      reason:
        "This account isn't linked to any institute yet. Open the invite link your institute sent you, or scan their admission QR.",
    };
  }

  const isFamilyOnly =
    !roles.some((r) =>
      [
        "owner",
        "admin",
        "receptionist",
        "counsellor",
        "accountant",
        "faculty",
        "superadmin",
      ].includes(r as string),
    ) &&
    (roles.includes("student") || roles.includes("parent"));

  if (isFamilyOnly && roles.includes("student")) {
    const { data } = await supabase
      .from("students")
      .select("approval_status")
      .limit(1)
      .maybeSingle();
    if (data && data.approval_status !== "approved") {
      return {
        status: "pending",
        reason:
          "Your admission is still waiting for the institute office to approve it. You'll get access the moment they do.",
      };
    }
  }

  if (roles.includes("faculty")) {
    const { data } = await supabase.from("faculty").select("status").limit(1).maybeSingle();
    if (data && data.status !== "active") {
      return {
        status: "pending",
        reason: "Your institute hasn't activated your teacher account yet.",
      };
    }
  }

  return { status: "ok" };
}
