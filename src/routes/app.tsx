import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/topbar";
import { useAuth } from "@/hooks/use-auth";
import { useBranches, ALL_BRANCHES } from "@/lib/branch";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { branches, activeId, select, multi } = useBranches();
  const [showGate, setShowGate] = useState(false);
  const staffRoles = ["owner", "admin", "faculty", "receptionist", "counsellor", "accountant"];
  const isSuper = roles.includes("superadmin" as any);
  const isStaff = roles.some((r) => staffRoles.includes(r));
  const isFamilyOnly =
    !isStaff && !isSuper && (roles.includes("student") || roles.includes("parent"));

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    const hasAnyInstitute = roles.length > 0;
    if (!hasAnyInstitute) {
      navigate({ to: "/signup" });
      return;
    }

    if (isFamilyOnly) {
      navigate({ to: "/portal" });
    } else if (multi && activeId === ALL_BRANCHES && pathname === "/app") {
      setShowGate(true);
    } else {
      setShowGate(false);
    }
  }, [loading, session, isFamilyOnly, navigate, multi, activeId, pathname, roles]);

  if (loading || !session || isFamilyOnly) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Safety gate: if a user is logged in but has no valid role for the app portal.
  if (!isStaff && !isSuper) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-semibold">Portal Access Denied</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your account is not registered as a staff member for this institute.
          </p>
        </div>
      </div>
    );
  }

  if (showGate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Select a branch</h1>
            <p className="text-sm text-muted-foreground">
              You are managing multiple branches. Choose one to view its data.
            </p>
          </div>
          <div className="grid gap-3">
            {branches.map((b) => (
              <Button
                key={b.id}
                variant="outline"
                className="h-auto flex-col items-start gap-0.5 p-4 text-left hover:border-primary/50 hover:bg-primary/5"
                onClick={() => select(b.id)}
              >
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-muted-foreground italic">
                  Switch to branch console
                </span>
              </Button>
            ))}
            <Button variant="secondary" className="mt-2 h-10" onClick={() => select(ALL_BRANCHES)}>
              Continue to Combined View
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
