import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_INVITE_KEY, rememberInvite } from "@/lib/post-auth";

export { PENDING_INVITE_KEY };

export const PENDING_INSTITUTE_KEY = "academix.pendingInstitute";

/**
 * Google sign-in. Everyone lands on /auth/callback, which figures out the
 * right portal from the account's roles (or finishes a pending invite, or
 * creates an institute the owner asked to set up during sign-up).
 */
export function GoogleButton({
  label = "Continue with Google",
  inviteToken,
  instituteName,
}: {
  label?: string;
  inviteToken?: string;
  instituteName?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    rememberInvite(inviteToken);
    if (instituteName) {
      try {
        sessionStorage.setItem(PENDING_INSTITUTE_KEY, instituteName.trim());
      } catch {
        /* private mode */
      }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={onClick}>
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l4.01-3.09Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.18 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.87 8.88 4.75 12 4.75Z"
        />
      </svg>
      {busy ? "Opening Google…" : label}
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
