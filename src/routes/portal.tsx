import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { useAuth } from "@/hooks/use-auth";
import { useAccessGate } from "@/hooks/use-access-gate";
import { useFeatures } from "@/hooks/use-features";
import { PORTAL_FEATURE } from "@/lib/features";
import { FeatureLocked } from "@/components/app/feature-gate";

export const Route = createFileRoute("/portal")({
  ssr: false,
  component: PortalLayout,
});

const STAFF = ["owner", "admin", "receptionist", "counsellor", "accountant", "faculty"];

function PortalLayout() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isOn } = useFeatures();

  const isFamily = roles.includes("student") || roles.includes("parent");
  const isStaff = roles.some((r) => STAFF.includes(r));
  const isParent = roles.includes("parent");

  useAccessGate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (!isFamily && isStaff) navigate({ to: "/app" });
  }, [loading, session, isFamily, isStaff, navigate]);

  if (loading || !session || (!isFamily && isStaff)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const portalFeature = isParent ? "parent_portal" : "student_portal";
  const pathFeature = Object.entries(PORTAL_FEATURE).find(
    ([p]) => pathname === p || pathname.startsWith(p + "/"),
  )?.[1];
  const locked = !isOn(portalFeature)
    ? portalFeature
    : pathFeature && !isOn(pathFeature)
      ? pathFeature
      : null;

  if (locked === portalFeature && locked) {
    return <FeatureLocked feature={locked} backTo="/login" />;
  }

  return (
    <PortalShell>
      {locked ? <FeatureLocked feature={locked} backTo="/portal" /> : <Outlet />}
    </PortalShell>
  );
}
