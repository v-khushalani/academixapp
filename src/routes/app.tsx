import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/topbar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/institute-controls";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { session, roles, linked, loading, signOut } = useAuth();
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
  const isSuperadmin = roles.includes("superadmin");
  // Signed in, but the account was never attached to an institute — without this
  // screen the app just renders empty tables with no explanation.
  const unlinked = Boolean(session) && !loading && !isSuperadmin && (roles.length === 0 || !linked);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (isFamilyOnly && linked) navigate({ to: "/portal" });
  }, [loading, session, isFamilyOnly, linked, navigate]);

  if (unlinked) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Your account isn&apos;t linked yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re signed in, but this login is not attached to any institute — so there is
            nothing to show. Ask your institute to send you a fresh invite link, or call Academix
            and we&apos;ll attach it for you.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button asChild>
              <a href={`tel:${SUPPORT_PHONE_TEL}`}>Call Academix on {SUPPORT_PHONE}</a>
            </Button>
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
