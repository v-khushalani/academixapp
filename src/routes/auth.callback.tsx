import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_INVITE_KEY } from "@/components/auth/google-button";
import type { AppRole } from "@/hooks/use-auth";

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

const STAFF: AppRole[] = [
  "owner",
  "admin",
  "receptionist",
  "counsellor",
  "accountant",
  "superadmin" as AppRole,
];

function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // give supabase-js a moment to exchange the code in the URL
      let session = null;
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!session) {
        toast.error("Google sign-in did not complete. Please try again.");
        void navigate({ to: "/login" });
        return;
      }

      let token: string | null = null;
      try {
        token = sessionStorage.getItem(PENDING_INVITE_KEY);
        sessionStorage.removeItem(PENDING_INVITE_KEY);
      } catch {
        token = null;
      }

      if (token) {
        setMessage("Finishing your invite…");
        const { error } = await supabase.rpc("accept_faculty_invite", { _token: token });
        if (error) toast.error(error.message);
      }

      const { data: roleRows } = await supabase.rpc("get_my_roles");
      const roles = (roleRows ?? []) as AppRole[];

      if (roles.some((r) => STAFF.includes(r))) {
        void navigate({ to: "/app" });
      } else if (roles.includes("faculty")) {
        void navigate({ to: "/teach" });
      } else if (roles.includes("student") || roles.includes("parent")) {
        void navigate({ to: "/portal" });
      } else {
        await supabase.auth.signOut();
        toast.error(
          "This Google account isn't linked to any institute yet. Open the invite link your institute sent you on WhatsApp.",
        );
        void navigate({ to: "/login" });
      }
    })();
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}