import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PendingApproval } from "@/components/auth/pending-approval";
import { useAuth } from "@/hooks/use-auth";
import { fetchAccessState } from "@/lib/access";
import { homeForRoles } from "@/lib/post-auth";

export const Route = createFileRoute("/pending")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Waiting for approval — Academix" },
      {
        name: "description",
        content: "Your Academix account is waiting for your institute to approve it.",
      },
      { property: "og:title", content: "Waiting for approval — Academix" },
      { property: "og:description", content: "Your institute has to approve this account first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState<string | undefined>();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }
    let alive = true;
    void fetchAccessState(roles).then((state) => {
      if (!alive) return;
      if (state.status === "ok") {
        const to = homeForRoles(roles);
        if (to) void navigate({ to });
        return;
      }
      setReason(state.reason);
      setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [loading, session, roles, navigate]);

  if (!checked) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking your access…
      </div>
    );
  }
  return <PendingApproval reason={reason} />;
}
