import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";
import { acceptFacultyInviteFn, acceptStudentInviteFn } from "@/lib/onboarding.functions";

export const PENDING_INVITE_KEY = "academix.pendingInvite";

const STAFF: AppRole[] = [
  "owner",
  "admin",
  "receptionist",
  "counsellor",
  "accountant",
  "superadmin" as AppRole,
];

export function rememberInvite(token?: string) {
  try {
    if (token) localStorage.setItem(PENDING_INVITE_KEY, token);
    else localStorage.removeItem(PENDING_INVITE_KEY);
    // legacy location
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* private mode */
  }
}

export function takePendingInvite(): string | null {
  try {
    const t =
      localStorage.getItem(PENDING_INVITE_KEY) ?? sessionStorage.getItem(PENDING_INVITE_KEY);
    localStorage.removeItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return t;
  } catch {
    return null;
  }
}

/** Waits for supabase-js to finish exchanging the OAuth code/hash in the URL. */
export async function waitForSession(tries = 25) {
  for (let i = 0; i < tries; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

export function homeForRoles(roles: AppRole[]): string | null {
  // Team Academix lands straight in the platform console, not an institute dashboard.
  if (roles.includes("superadmin" as AppRole)) return "/app/platform";
  if (roles.some((r) => STAFF.includes(r))) return "/app";
  if (roles.includes("faculty")) return "/teach";
  if (roles.includes("student") || roles.includes("parent")) return "/portal";
  return null;
}

/**
 * Claims a pending invite (if any) and resolves the portal this account belongs to.
 * Safe to call on any page a Google redirect can land on.
 */
export async function resolvePostAuthDestination(): Promise<{
  to: string | null;
  error?: string;
}> {
  const token = takePendingInvite();
  if (token) {
    try {
      await acceptFacultyInviteFn({ data: { _token: token } });
    } catch (error: any) {
      // Same link shape is used for student/parent portal invites.
      try {
        await acceptStudentInviteFn({ data: { _token: token } });
      } catch (sErr: any) {
        console.warn("[invite]", error.message, sErr.message);
      }
    }
  }

  const { data: roleRows } = await supabase.rpc("get_my_roles");
  let roles = (roleRows ?? []) as AppRole[];

  // Invite RPCs can lag a beat behind — retry once before giving up.
  if (roles.length === 0 && token) {
    await new Promise((r) => setTimeout(r, 800));
    const { data: retry } = await supabase.rpc("get_my_roles");
    roles = (retry ?? []) as AppRole[];
  }

  const to = homeForRoles(roles);
  if (to) return { to };
  return {
    to: null,
    error:
      "This Google account isn't linked to any institute yet. Open the invite link your institute sent you on WhatsApp.",
  };
}
