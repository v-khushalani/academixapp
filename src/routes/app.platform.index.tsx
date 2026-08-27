import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  GraduationCap,
  Layers,
  ArrowUpRight,
  Users,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePlatformInstitutes } from "@/components/app/platform/shared";
import { supabase } from "@/integrations/supabase/client";
import { planFor } from "@/lib/plans";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/platform/")({
  component: PlatformOverview,
});

function PlatformOverview() {
  const { data: institutes = [], isLoading } = usePlatformInstitutes();

  const { data: changes = [] } = useQuery({
    queryKey: ["platform", "recent-plan-changes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_change_log")
        .select("id, institute_id, from_plan, to_plan, created_at, note")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = institutes.reduce(
    (a, i) => ({
      students: a.students + Number(i.students),
      faculty: a.faculty + Number(i.faculty),
      batches: a.batches + Number(i.batches),
      logins: a.logins + Number(i.staff_logins) + Number(i.teacher_logins),
    }),
    { students: 0, faculty: 0, batches: 0, logins: 0 },
  );

  const byPlan = institutes.reduce<Record<string, number>>((a, i) => {
    const key = planFor(i.plan).name;
    a[key] = (a[key] ?? 0) + 1;
    return a;
  }, {});

  const suspended = institutes.filter((i) => i.status && i.status !== "active");
  const nearLimit = institutes.filter(
    (i) => i.student_limit > 0 && Number(i.students) / i.student_limit >= 0.8,
  );
  const branches = institutes.filter((i) => i.parent_institute_id).length;
  const idle = institutes.filter((i) => Number(i.students) === 0).length;
  const top = [...institutes].sort((a, b) => Number(b.students) - Number(a.students)).slice(0, 6);
  const nameOf = (id: string) => institutes.find((i) => i.id === id)?.name ?? "Institute";

  return (
    <div className="space-y-5">
      {/* Control tower — the four numbers that describe the whole network. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Building2}
          label="Institutes live"
          value={institutes.length}
          hint={`${branches} branch${branches === 1 ? "" : "es"} · ${idle} with no students yet`}
        />
        <Kpi
          icon={GraduationCap}
          label="Students on Academix"
          value={totals.students}
          hint="Approved and active across the network"
        />
        <Kpi
          icon={Users}
          label="People logging in"
          value={totals.logins}
          hint={`${totals.faculty} faculty records`}
        />
        <Kpi
          icon={Layers}
          label="Batches running"
          value={totals.batches}
          hint="Live timetable + attendance load"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Plan mix" action={{ to: "/app/platform/plans", label: "Pricing" }}>
          {institutes.length === 0 ? (
            <Empty>{isLoading ? "Loading…" : "No institutes yet."}</Empty>
          ) : (
            <ul className="space-y-2">
              {Object.entries(byPlan).map(([name, n]) => {
                const pct = Math.round((n / institutes.length) * 100);
                return (
                  <li key={name}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{name}</span>
                      <span className="font-semibold tabular-nums">
                        {n}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {pct}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Close to their limit"
          action={{ to: "/app/platform/institutes", label: "Institutes" }}
        >
          {nearLimit.length === 0 ? (
            <Empty>Everyone has room — no upgrade calls needed today.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {nearLimit.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{i.name}</span>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {Number(i.students)}/{i.student_limit}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Needs attention">
          {suspended.length === 0 ? (
            <Empty>No suspended accounts.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {suspended.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    <span className="truncate">{i.name}</span>
                  </span>
                  <span className="shrink-0 text-xs capitalize text-destructive">{i.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Biggest institutes"
          action={{ to: "/app/platform/institutes", label: "Manage" }}
        >
          {top.length === 0 ? (
            <Empty>{isLoading ? "Loading…" : "Nothing to show yet."}</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Institute</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 text-right font-medium">Students</th>
                  <th className="pb-2 text-right font-medium">Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-2">
                      <span className="block truncate">{i.name}</span>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline">{planFor(i.plan).name}</Badge>
                    </td>
                    <td className="py-2 text-right tabular-nums">{Number(i.students)}</td>
                    <td className="py-2 text-right tabular-nums">{Number(i.batches)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Recent plan changes" action={{ to: "/app/platform/features", label: "Features" }}>
          {changes.length === 0 ? (
            <Empty>No plan changes logged yet.</Empty>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {changes.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{nameOf(c.institute_id)}</span>{" "}
                      <span className="text-muted-foreground">
                        {c.from_plan ?? "—"} → {c.to_plan ?? "—"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
        {value.toLocaleString("en-IN")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action && (
          <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
            <Link to={action.to}>
              {action.label}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
