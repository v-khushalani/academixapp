import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, CalendarCheck, ClipboardList, Home, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAccessGate } from "@/hooks/use-access-gate";
import { useFeatures } from "@/hooks/use-features";
import { TEACH_FEATURE } from "@/lib/features";
import { FeatureLocked } from "@/components/app/feature-gate";
import { BrandMark, PoweredByAcademix, useBrand, useBrandedTitle } from "@/components/brand";
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
];

function TeachLayout() {
  const { session, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const brand = useBrand();
  const institute = brand.name;
  const { isOn } = useFeatures();
  useBrandedTitle("Teacher portal");

  const allowed = roles.some((r) => ["faculty", "owner", "admin"].includes(r));
  const isFamily = !allowed && (roles.includes("student") || roles.includes("parent"));

  useAccessGate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (isFamily) navigate({ to: "/portal" });
  }, [loading, session, isFamily, navigate]);

  if (loading || !session || isFamily) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Modules the institute's plan does not include disappear from the teacher rail.
  const nav = NAV.filter((n) => {
    const f = TEACH_FEATURE[n.to];
    return !f || isOn(f);
  });
  const pathFeature = Object.entries(TEACH_FEATURE).find(
    ([p]) => pathname === p || pathname.startsWith(p + "/"),
  )?.[1];
  const locked = pathFeature && !isOn(pathFeature) ? pathFeature : null;

  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");


  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <BrandMark brand={brand} size={32} />
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
      <footer className="px-4 pb-4 pt-2">
        <PoweredByAcademix />
      </footer>

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
