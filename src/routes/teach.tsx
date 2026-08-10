import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, CalendarCheck, ClipboardList, Home, LogOut, NotebookPen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getInstitute } from "@/lib/academy-settings";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/teach")({
  ssr: false,
  component: TeachLayout,
});

const NAV = [
  { to: "/teach", label: "Today", icon: Home, exact: true },
  { to: "/teach/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/teach/marks", label: "Marks", icon: ClipboardList },
  { to: "/teach/syllabus", label: "Syllabus", icon: BookOpen },
  { to: "/teach/homework", label: "Homework", icon: NotebookPen },
];

function TeachLayout() {
  const { session, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [institute, setInstitute] = useState("Academix");

  useEffect(() => {
    const sync = () => setInstitute(getInstitute().name || "Academix");
    sync();
    window.addEventListener("vk-institute-changed", sync);
    return () => window.removeEventListener("vk-institute-changed", sync);
  }, []);

  const allowed = roles.some((r) => ["faculty", "owner", "admin"].includes(r));
  const isFamily = !allowed && (roles.includes("student") || roles.includes("parent"));

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login/teacher" });
    else if (isFamily) navigate({ to: "/portal" });
  }, [loading, session, isFamily, navigate]);

  if (loading || !session || isFamily) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          Ax
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{institute}</p>
          <p className="text-xs text-muted-foreground">Teacher portal</p>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`rounded-md px-3 py-1.5 text-sm ${active(n.to, n.exact) ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(n.to, n.exact) ? "text-primary" : "text-muted-foreground"}`}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
