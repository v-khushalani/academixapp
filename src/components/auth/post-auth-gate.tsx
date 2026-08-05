import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination } from "@/lib/post-auth";

/**
 * Safety net for OAuth redirects that land on a public page instead of
 * /auth/callback (e.g. Supabase falling back to the Site URL). If a session
 * exists, finish the invite + send the user to their portal.
 */
export function PostAuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      setRedirecting(true);
      const { to } = await resolvePostAuthDestination();
      if (to) void navigate({ to });
      else setRedirecting(false);
    })();
  }, [navigate]);

  if (redirecting) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
      </div>
    );
  }
  return <>{children}</>;
}
