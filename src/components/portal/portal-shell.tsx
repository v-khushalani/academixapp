import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Home, CalendarCheck, TrendingUp, Wallet, Calendar, BookOpen, LogOut } from "lucide-react";
import { portalApi, type PortalStudent } from "@/lib/api/portal";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark, PoweredByAcademix, useBrand, useBrandedTitle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Ctx = {
  students: PortalStudent[];
  student: PortalStudent | null;
  setStudentId: (id: string) => void;
  isLoading: boolean;
};

const PortalContext = createContext<Ctx | null>(null);

export function usePortalStudent() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortalStudent must be used inside the portal layout");
  return ctx;
}

const NAV: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/portal", label: "Home", icon: Home, exact: true },
  { to: "/portal/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/portal/progress", label: "Progress", icon: TrendingUp },
  { to: "/portal/fees", label: "Fees", icon: Wallet },
  { to: "/portal/timetable", label: "Timetable", icon: Calendar },
  { to: "/portal/homework", label: "Homework", icon: BookOpen },
];

const KEY = "vk_portal_student";

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const brand = useBrand();
  const institute = brand.name;
  const [selected, setSelected] = useState<string | null>(null);
  useBrandedTitle("Portal");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored) setSelected(stored);
  }, []);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["portal-students"],
    queryFn: () => portalApi.myStudents(),
  });

  const student = useMemo(
    () => students.find((s) => s.id === selected) ?? students[0] ?? null,
    [students, selected],
  );

  const isParent = roles.includes("parent");
  const displayName = user?.user_metadata?.full_name || student?.full_name || "Welcome";

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  const value: Ctx = {
    students,
    student,
    isLoading,
    setStudentId: (id) => {
      setSelected(id);
      window.localStorage.setItem(KEY, id);
    },
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <PortalContext.Provider value={value}>
      <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
            <BrandMark brand={brand} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{institute}</p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {isParent ? "Parent portal" : "Student portal"} · {displayName}
              </p>
            </div>
            {students.length > 1 && (
              <Select value={student?.id ?? ""} onValueChange={value.setStudentId}>
                <SelectTrigger className="h-9 w-[9.5rem] text-sm">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={handleSignOut}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <nav className="mx-auto hidden w-full max-w-5xl gap-1 px-4 pb-2 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(item.to, item.exact)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>

        <footer className="mx-auto w-full max-w-5xl px-4 pb-4 pt-2">
          <PoweredByAcademix />
        </footer>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-card md:hidden">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </PortalContext.Provider>
  );
}

export function PortalCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}