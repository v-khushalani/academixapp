import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AcademixLoader } from "@/components/brand";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import { MobileTabBar } from "@/components/app/mobile-tabbar";
import { TopBar } from "@/components/app/topbar";
import { useAuth } from "@/hooks/use-auth";
import { useAccessGate } from "@/hooks/use-access-gate";
import { FeatureGate } from "@/components/app/feature-gate";
import { useLinkedRealtime } from "@/hooks/use-linked-realtime";
import { canAccess, type ModuleKey } from "@/lib/rbac";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();
  const staffRoles = [
    "owner",
    "admin",
    "faculty",
    "receptionist",
    "counsellor",
    "accountant",
    "superadmin",
  ];
  const isStaff = roles.some((r) => staffRoles.includes(r));
  const isFamilyOnly = !isStaff && (roles.includes("student") || roles.includes("parent"));

  useAccessGate();
  useLinkedRealtime(!!session);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const routeModule = moduleForPath(pathname);
  const hasRouteAccess = !routeModule || canAccess(routeModule, roles);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (isFamilyOnly) navigate({ to: "/portal" });
    else if (!hasRouteAccess) navigate({ to: "/app" });
  }, [loading, session, isFamilyOnly, hasRouteAccess, navigate]);

  if (loading || !session || isFamilyOnly) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <AcademixLoader size={56} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
          <TopBar />
          <main className="flex-1">
            <FeatureGate pathname={pathname}>
              <Outlet />
            </FeatureGate>
          </main>
          <MobileTabBar />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function moduleForPath(pathname: string): ModuleKey | null {
  const segment = pathname.replace(/^\/app\/?/, "").split("/")[0];
  const modules: Partial<Record<string, ModuleKey>> = {
    students: "students",
    admissions: "admissions",
    batches: "batches",
    attendance: "attendance",
    fees: "fees",
    expenses: "expenses",
    messages: "messages",
    tests: "tests",
    syllabus: "syllabus",
    timetable: "timetable",
    faculty: "faculty",
    reports: "reports",
    settings: "settings",
    group: "platform",
    platform: "platform",
  };
  return modules[segment] ?? null;
}
