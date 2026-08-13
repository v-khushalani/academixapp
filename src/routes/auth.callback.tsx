import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination, waitForSession } from "@/lib/post-auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Academix" },
      { name: "description", content: "Completing your Academix sign-in." },
      { property: "og:title", content: "Signing you in — Academix" },
      { property: "og:description", content: "Completing your Academix sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const session = await waitForSession();
      if (!session) {
        toast.error("Google sign-in did not complete. Please try again.");
        void navigate({ to: "/login" });
        return;
      }
      setMessage("Setting up your account…");
      const { to, error } = await resolvePostAuthDestination();
      if (to) {
        void navigate({ to });
        return;
      }
      if (error) {
        await supabase.auth.signOut();
        toast.error(error);
        void navigate({ to: "/login" });
        return;
      }
      void navigate({ to: "/signup" });
    })();
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
