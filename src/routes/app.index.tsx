import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Layers,
  Wallet,
  UserPlus,
  CalendarCheck,
  FileText,
  BookOpen,
  MessageCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { dashboardApi, batchesApi } from "@/lib/api";
import { syllabusApi, overallPct } from "@/lib/api/syllabus";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { getInstitute } from "@/lib/academy-settings";
import { openWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Panel,
  Metric,
  Bar,
  ActionRow,
  inr,
} from "@/components/app/dashboard/dashboard-cards";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useAuth();
  const showMoney = can("fees:read", roles);
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

  const perBatch = batches
    .map((b) => {
      const rows = chapters.filter((c) => c.batch_id === b.id);
      return { id: b.id, name: b.name, count: rows.length, pct: rows.length ? overallPct(rows) : 0 };
    })
    .filter((b) => b.count > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title={`Good day, ${name.split(" ")[0]}`}
        description={`What needs your attention at ${institute} today.`}
      />
      <PageBody>
        {/* Today strip */}
        <Panel title="Today" action={{ label: "Attendance", to: "/app/attendance" }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Metric label="Classes today" value={isLoading ? "—" : String(today?.classes ?? 0)} />
            <Metric
              label="Attendance marked"
              value={
                isLoading ? "—" : `${today?.batchesMarked ?? 0}/${today?.batchesScheduled ?? 0}`
              }
              sub="batches"
              tone={
                (today?.batchesMarked ?? 0) < (today?.batchesScheduled ?? 0) ? "warning" : "success"
              }
            />
            <Metric label="Present" value={isLoading ? "—" : String(today?.present ?? 0)} tone="success" />
            <Metric label="Absent" value={isLoading ? "—" : String(today?.absent ?? 0)} tone="danger" />
            <Metric label="Active students" value={isLoading ? "—" : String(data?.students ?? 0)} sub={`${data?.batches ?? 0} active batches`} />
          </div>
        </Panel>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {showMoney ? (
            <Panel title="Money" action={{ label: "Fees", to: "/app/fees" }} className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric
                  label="Collected this month"
                  value={inr(money?.collectedThisMonth ?? 0)}
                  tone="success"
                  sub={
                    growth === null
                      ? "no data last month"
                      : `${growth >= 0 ? "+" : ""}${growth}% vs last month`
                  }
                />
                <Metric label="Outstanding" value={inr(money?.outstanding ?? 0)} tone="warning" />
                <Metric label="Billed (all time)" value={inr(money?.billed ?? 0)} />
                <Metric label="Collected (all time)" value={inr(money?.collected ?? 0)} />
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Outstanding by age
                </p>
                {[
                  { label: "0–30 days", v: money?.ageing.current ?? 0, tone: "primary" as const },
                  { label: "31–60 days", v: money?.ageing.d30 ?? 0, tone: "warning" as const },
                  { label: "60+ days", v: money?.ageing.d60 ?? 0, tone: "danger" as const },
                ].map((a) => {
                  const total = money?.outstanding || 1;
                  return (
                    <div key={a.label} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">{a.label}</span>
                      <Bar pct={(a.v / total) * 100} tone={a.tone} />
                      <span className="w-20 shrink-0 text-right text-xs font-medium">{inr(a.v)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top pending
                </p>
                {money?.defaulters.length ? (
                  <ul className="divide-y divide-border">
                    {money.defaulters.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                        <span className="min-w-0 truncate text-sm">{d.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold">{inr(d.due)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="WhatsApp reminder"
                            onClick={() =>
                              openWhatsApp(
                                d.phone,
                                `Namaste, ${d.name} ke fees ka ${inr(d.due)} pending hai. Kripya jaldi jama karein. — ${institute}`,
                              )
                            }
                          >
                            <MessageCircle className="h-4 w-4 text-success" />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing pending. Well collected.</p>
                )}
              </div>
            </Panel>
          ) : null}

          <div className="space-y-4">
            <Panel title="Needs action">
              <div className="space-y-2">
                <ActionRow
                  icon={UserPlus}
                  label="Applications waiting for approval"
                  count={data?.pendingApprovals ?? 0}
                  to="/app/admissions"
                  tone={(data?.pendingApprovals ?? 0) > 0 ? "warning" : "default"}
                />
                <ActionRow
                  icon={CalendarCheck}
                  label="Batches without attendance today"
                  count={Math.max(0, (today?.batchesScheduled ?? 0) - (today?.batchesMarked ?? 0))}
                  to="/app/attendance"
                  tone={
                    (today?.batchesScheduled ?? 0) - (today?.batchesMarked ?? 0) > 0
                      ? "danger"
                      : "default"
                  }
                />
                {showMoney ? (
                  <ActionRow
                    icon={Wallet}
                    label="Students with dues over 60 days"
                    count={money?.defaulters.filter((d) => d.due > 0).length ?? 0}
                    to="/app/fees"
                    tone="warning"
                  />
                ) : null}
                <ActionRow
                  icon={Layers}
                  label="Active batches"
                  count={data?.batches ?? 0}
                  to="/app/batches"
                />
              </div>
            </Panel>

            <Panel title="Admissions funnel" action={{ label: "Open", to: "/app/admissions" }}>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Enquiries" value={String(data?.enquiriesThisMonth ?? 0)} sub="this month" />
                <Metric label="Applications" value={String(data?.pendingApprovals ?? 0)} sub="waiting" tone="warning" />
                <Metric label="Admitted" value={String(data?.newThisMonth ?? 0)} sub="this month" tone="success" />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                {(data?.newThisMonth ?? 0) >= (data?.enquiriesThisMonth ?? 0) ? (
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-warning" />
                )}
                Conversion{" "}
                {data?.enquiriesThisMonth
                  ? Math.round(((data.newThisMonth ?? 0) / data.enquiriesThisMonth) * 100)
                  : 0}
                % of this month's enquiries
              </p>
            </Panel>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Syllabus coverage" action={{ label: "Syllabus", to: "/app/syllabus" }}>
            {perBatch.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No chapters added yet. Add the textbook chapters batch-wise to track coverage.
              </p>
            ) : (
              <ul className="space-y-3">
                {perBatch.map((b) => (
                  <li key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{b.name}</span>
                      <span className="text-muted-foreground">{b.pct}%</span>
                    </div>
                    <Bar pct={b.pct} tone={b.pct < 40 ? "danger" : b.pct < 70 ? "warning" : "success"} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Overall {chapters.length ? `${overallPct(chapters)}%` : "—"} covered
            </p>
          </Panel>

          <Panel title="Upcoming tests" action={{ label: "Tests", to: "/app/tests" }}>
            {data?.upcomingTests?.length ? (
              <ul className="divide-y divide-border">
                {data.upcomingTests.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{t.batch?.name ?? "—"}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                No tests scheduled.
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {data?.students ?? 0} active students across {data?.batches ?? 0} batches
            </p>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
