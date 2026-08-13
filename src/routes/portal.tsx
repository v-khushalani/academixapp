import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/portal")({
  ssr: false,
  component: PortalLayout,
});

const STAFF = ["owner", "admin", "receptionist", "counsellor", "accountant", "faculty"];

function PortalLayout() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();

  const isFamily = roles.includes("student") || roles.includes("parent");
  const isStaff = roles.some((r) => STAFF.includes(r));

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    if (roles.length === 0) {
      navigate({ to: "/signup" });
      return;
    }

    if (!isFamily && isStaff) navigate({ to: "/app" });
  }, [loading, session, isFamily, isStaff, navigate, roles]);

  if (loading || !session || (!isFamily && isStaff)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}