import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Layers,
  MessageSquare,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { dashboardApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/rbac";
import { getInstitute } from "@/lib/academy-settings";
import { AbsentAlerts } from "@/components/app/absent-alerts";
import { SetupChecklist } from "@/components/app/setup-checklist";
import { Metric, Panel, inr } from "@/components/app/dashboard/dashboard-cards";
import { formatDate } from "@/lib/dates";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useAuth();
  const showMoney = canAccess("fees", roles);
  const showMessages = canAccess("messages", roles);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.overview(),
  });

  const name = user?.user_metadata?.full_name || user?.email || "there";
  const institute = getInstitute().name || "your institute";
  const money = data?.money;
  const today = data?.today;
  const unmarked = Math.max(0, (today?.batchesScheduled ?? 0) - (today?.batchesMarked ?? 0));
  const dash = isLoading ? "—" : null;

  return (
    <>
      {showMoney ? <AbsentAlerts /> : null}
      <PageHeader
        title={`${greeting()}, ${name.split(" ")[0]}`}
        description={`${institute} · ${formatDate(new Date())}`}
      />
      <PageBody>
        <SetupChecklist
          signals={{
            batches: data?.batches ?? 0,
            students: data?.students ?? 0,
            firstActionDone:
              (today?.batchesMarked ?? 0) > 0 || (money?.collectedThisMonth ?? 0) > 0,
          }}
        />

        {/* Four plain stats — same card treatment as the rest of the app. */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Students"
            value={dash ?? String(data?.students ?? 0)}
            to="/app/students"
          />
          <StatCard
            label="Attendance today"
            value={dash ?? `${today?.batchesMarked ?? 0}/${today?.batchesScheduled ?? 0}`}
            sub={
              unmarked > 0 ? `${unmarked} batch${unmarked === 1 ? "" : "es"} left` : "All marked"
            }
            to="/app/attendance"
            tone={unmarked > 0 ? "warning" : "success"}
          />
          <StatCard
            label="Absent today"
            value={dash ?? String(today?.absent ?? 0)}
            sub={today?.absent ? "WhatsApp-ready below" : "All present"}
            to="/app/attendance"
            tone={(today?.absent ?? 0) > 0 ? "danger" : "default"}
          />
          {showMoney ? (
            <StatCard
              label="Collected this month"
              value={dash ?? inr(money?.collectedThisMonth ?? 0)}
              sub={`${inr(money?.outstanding ?? 0)} outstanding`}
              to="/app/fees"
              tone="success"
            />
          ) : (
            <StatCard
              label="Active batches"
              value={dash ?? String(data?.batches ?? 0)}
              to="/app/batches"
            />
          )}
        </section>

        {/* Anything waiting on a human. */}
        <Panel title="Needs you" className="mt-6">
          <div className="space-y-2">
            <ActionRow
              icon={UserPlus}
              label="Applications waiting for approval"
              count={data?.pendingApprovals ?? 0}
              to="/app/admissions"
              tone={(data?.pendingApprovals ?? 0) > 0 ? "warning" : "default"}
            />
            {showMoney ? (
              <ActionRow
                icon={Wallet}
                label="Parents with dues"
                count={money?.defaulters.filter((d) => d.due > 0).length ?? 0}
                to="/app/fees"
                tone={(money?.defaulters.length ?? 0) > 0 ? "warning" : "default"}
              />
            ) : null}
            <ActionRow
              icon={CalendarCheck}
              label="Batches still unmarked today"
              count={unmarked}
              to="/app/attendance"
              tone={unmarked > 0 ? "warning" : "default"}
            />
            {showMessages ? (
              <ActionRow
                icon={MessageSquare}
                label="Send a message"
                count={0}
                to="/app/messages"
                tone="default"
              />
            ) : null}
            <ActionRow
              icon={Layers}
              label="Active batches"
              count={data?.batches ?? 0}
              to="/app/batches"
              tone="default"
            />
          </div>
        </Panel>
      </PageBody>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  to,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  to: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <Metric label={label} value={value} sub={sub} tone={tone} />
    </Link>
  );
}

function ActionRow({
  icon: Icon,
  label,
  count,
  to,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  to: string;
  tone?: "default" | "warning" | "danger";
}) {
  const dot = {
    default: "bg-muted text-muted-foreground",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:border-primary/30"
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${dot}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <span className="text-sm font-semibold">{count}</span>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
