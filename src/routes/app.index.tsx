import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layers, UserPlus, CalendarCheck, Wallet, IndianRupee } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { dashboardApi, batchesApi } from "@/lib/api";
import { syllabusApi, overallPct } from "@/lib/api/syllabus";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/rbac";
import { getInstitute } from "@/lib/academy-settings";
import { AbsentAlerts } from "@/components/app/absent-alerts";
import { Panel, Bar, ActionRow, HeroStat, inr } from "@/components/app/dashboard/dashboard-cards";
import { formatDate } from "@/lib/dates";
import { DemoDataButton } from "@/components/app/demo-data-button";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useAuth();
  const showMoney = canAccess("fees", roles);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.overview(),
    staleTime: 60000, // 1 minute
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["syllabus-overview"],
    queryFn: async () => {
      const all = await syllabusApi.chapters();
      return batches.map((b) => {
        const rows = all.filter((c) => c.batch_id === b.id);
        return { 
          id: b.id, 
          name: b.name, 
          count: rows.length, 
          pct: rows.length ? overallPct(rows) : 0 
        };
      }).filter(b => b.count > 0);
    },
    enabled: batches.length > 0,
  });

  const name = user?.user_metadata?.full_name || user?.email || "there";
  const institute = getInstitute().name || "your institute";
  const money = data?.money;
  const today = data?.today;
  const growth =
    money && money.collectedLastMonth > 0
      ? Math.round(
          ((money.collectedThisMonth - money.collectedLastMonth) / money.collectedLastMonth) * 100,
        )
      : null;

  const behind = progress
    .filter((b) => b.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 4);

  const unmarked = Math.max(0, (today?.batchesScheduled ?? 0) - (today?.batchesMarked ?? 0));
  const dash = isLoading ? "—" : null;
  const nextTest = data?.upcomingTests?.[0];

  const greetingText = greeting();

  return (
    <>
      {showMoney ? <AbsentAlerts /> : null}
      <PageHeader
        title={`${greetingText}, ${name.split(" ")[0]}`}
        description={`${institute} · ${formatDate(new Date())}`}
      />
      <PageBody>
        {/* Hero numbers */}
        <section className="grid grid-cols-2 gap-x-6 gap-y-8 rounded-lg border border-border bg-card p-5 sm:grid-cols-4">
          {showMoney ? (
            <HeroStat
              label="Outstanding"
              value={dash ?? inr(money?.outstanding ?? 0)}
              tone={(money?.outstanding ?? 0) > 0 ? "warning" : "success"}
              to="/app/fees"
            />
          ) : (
            <HeroStat label="Classes today" value={dash ?? String(today?.classes ?? 0)} />
          )}
          <HeroStat
            label="Students"
            value={dash ?? String(data?.students ?? 0)}
            to="/app/students"
          />
          <HeroStat
            label="Attendance"
            value={dash ?? `${today?.batchesMarked ?? 0}/${today?.batchesScheduled ?? 0}`}
            tone={unmarked > 0 ? "warning" : "success"}
            to="/app/attendance"
          />
          <HeroStat
            label="Absent today"
            value={dash ?? String(today?.absent ?? 0)}
            tone={(today?.absent ?? 0) > 0 ? "danger" : "default"}
            to="/app/attendance"
          />
        </section>

        {/* Two panels */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Panel title="Needs you now">
            <div className="space-y-2">
              <ActionRow
                icon={UserPlus}
                label="Applications waiting"
                count={data?.pendingApprovals ?? 0}
                to="/app/admissions"
                tone={(data?.pendingApprovals ?? 0) > 0 ? "warning" : "default"}
              />
              <ActionRow
                icon={CalendarCheck}
                label="Batches unmarked today"
                count={unmarked}
                to="/app/attendance"
                tone={unmarked > 0 ? "danger" : "default"}
              />
              {showMoney ? (
                <>
                  <ActionRow
                    icon={Wallet}
                    label="Parents with dues"
                    count={money?.defaulters?.filter((d: any) => d.due > 0).length ?? 0}
                    to="/app/fees"
                    tone={(money?.defaulters.length ?? 0) > 0 ? "warning" : "default"}
                  />
                  <ActionRow
                    icon={IndianRupee}
                    label="Expenses this month"
                    count={data?.expensesThisMonth ?? 0}
                    to="/app/expenses"
                    tone="default"
                  />
                </>
              ) : null}
              <ActionRow
                icon={Layers}
                label="Active batches"
                count={data?.batches ?? 0}
                to="/app/batches"
              />
            </div>
          </Panel>

          {showMoney ? (
            <Panel title="Money" action={{ label: "Fees", to: "/app/fees" }}>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-success">
                {inr(money?.collectedThisMonth ?? 0)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                collected this month
                {growth === null ? "" : ` · ${growth >= 0 ? "+" : ""}${growth}% vs last month`}
              </p>
              <div className="mt-4 space-y-2">
                {[
                  { label: "0–30 days", v: money?.ageing.current ?? 0, tone: "primary" as const },
                  { label: "31–60 days", v: money?.ageing.d30 ?? 0, tone: "warning" as const },
                  { label: "60+ days", v: money?.ageing.d60 ?? 0, tone: "danger" as const },
                ].map((a) => (
                  <div key={a.label} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{a.label}</span>
                    <Bar pct={(a.v / (money?.outstanding || 1)) * 100} tone={a.tone} />
                    <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums">
                      {inr(a.v)}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        {/* Enhanced Syllabus & Pulse */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Panel title="Syllabus Pulse" className="lg:col-span-2">
            <div className="space-y-4">
              {progress.length === 0 && !isLoading && (
                <p className="py-4 text-center text-xs text-muted-foreground">No syllabus tracking data yet.</p>
              )}
              {progress.map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{b.name}</span>
                    <span className="tabular-nums text-muted-foreground">{b.pct}% complete</span>
                  </div>
                  <Bar pct={b.pct} tone={b.pct < 40 ? "danger" : b.pct < 70 ? "warning" : "success"} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Quick Links">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Admission", to: "/app/admissions", icon: UserPlus },
                { label: "Mark Attendance", to: "/app/attendance", icon: CalendarCheck },
                { label: "Collect Fee", to: "/app/fees", icon: IndianRupee },
                { label: "View Reports", to: "/app/reports", icon: Layers },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <link.icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{link.label}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        {nextTest ? (
          <div className="mt-6 flex items-center gap-2 rounded-full bg-primary/5 px-4 py-2 text-[11px] font-medium text-primary">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span>UPCOMING TEST: {nextTest.title} · {nextTest.batch?.name} · {nextTest.date}</span>
          </div>
        ) : null}
      </PageBody>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Burning the midnight oil";
}
