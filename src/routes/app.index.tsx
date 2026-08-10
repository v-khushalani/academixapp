import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layers, UserPlus, CalendarCheck, Wallet } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { dashboardApi, batchesApi } from "@/lib/api";
import { syllabusApi, overallPct } from "@/lib/api/syllabus";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/rbac";
import { getInstitute } from "@/lib/academy-settings";
import { AbsentAlerts } from "@/components/app/absent-alerts";
import { Panel, Bar, ActionRow, HeroStat, inr } from "@/components/app/dashboard/dashboard-cards";
import { formatDate } from "@/lib/dates";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useAuth();
  const showMoney = canAccess("fees", roles);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.overview(),
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["syllabus"],
    queryFn: () => syllabusApi.chapters(),
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
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

  const behind = batches
    .map((b) => {
      const rows = chapters.filter((c) => c.batch_id === b.id);
      return { id: b.id, name: b.name, count: rows.length, pct: rows.length ? overallPct(rows) : 0 };
    })
    .filter((b) => b.count > 0)
    .filter((b) => b.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 4);

  const unmarked = Math.max(0, (today?.batchesScheduled ?? 0) - (today?.batchesMarked ?? 0));
  const dash = isLoading ? "—" : null;
  const nextTest = data?.upcomingTests?.[0];

  return (
    <>
      {showMoney ? <AbsentAlerts /> : null}
      <PageHeader
        title={`${greeting()}, ${name.split(" ")[0]}`}
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
                    count={money?.defaulters.filter((d) => d.due > 0).length ?? 0}
                    to="/app/fees"
                    tone={(money?.defaulters.length ?? 0) > 0 ? "warning" : "default"}
                  />
                  <ActionRow
                    icon={IndianRupee}
                    label="Expenses this month"
                    count={data?.expensesThisMonth ?? 0}
                    to="/app/expenses"
                    tone="default"
                    isCurrency
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

        {/* Slim strips */}
        {behind.length > 0 ? (
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.14em]">Behind on syllabus</span>
            {behind.map((b) => (
              <span key={b.id} className="tabular-nums">
                {b.name} {b.pct}%
              </span>
            ))}
          </p>
        ) : null}
        {nextTest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Next test: {nextTest.title} · {nextTest.batch?.name ?? "—"} · {nextTest.date}
          </p>
        ) : null}
      </PageBody>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
