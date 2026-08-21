import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { fetchAccessState } from "@/lib/access";

/**
 * Invite-only guard shared by every portal layout: a signed-in account whose
 * student/faculty record isn't approved yet is parked on /pending.
 */
export function useAccessGate() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session) return;
    let alive = true;
    void fetchAccessState(roles).then((state) => {
      if (alive && state.status === "pending") void navigate({ to: "/pending" });
    });
    return () => {
      alive = false;
    };
  }, [loading, session, roles, navigate]);
}
