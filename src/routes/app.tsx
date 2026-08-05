import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/topbar";
import { useAuth } from "@/hooks/use-auth";

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

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (isFamilyOnly) navigate({ to: "/portal" });
  }, [loading, session, isFamilyOnly, navigate]);

  if (loading || !session || isFamilyOnly) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
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
