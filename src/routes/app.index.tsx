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
import { ActionRow, HeroStat, inr } from "@/components/app/dashboard/dashboard-cards";
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

        {/* Three things you actually do every day. */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BigAction
            icon={CalendarCheck}
            title="Take attendance"
            hint={
              unmarked > 0
                ? `${unmarked} batch${unmarked === 1 ? "" : "es"} still unmarked today`
                : "All batches marked today"
            }
            to="/app/attendance"
            urgent={unmarked > 0}
          />
          {showMoney ? (
            <BigAction
              icon={Wallet}
              title="Collect fees"
              hint={`${inr(money?.outstanding ?? 0)} outstanding`}
              to="/app/fees"
              urgent={(money?.outstanding ?? 0) > 0}
            />
          ) : null}
          {showMessages ? (
            <BigAction
              icon={MessageSquare}
              title="Send a message"
              hint="Fee reminders, absent alerts, results"
              to="/app/messages"
            />
          ) : null}
        </div>

        {/* Numbers, kept to four. */}
        <section className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 rounded-lg border border-border bg-card p-5 sm:grid-cols-4">
          <HeroStat label="Students" value={dash ?? String(data?.students ?? 0)} to="/app/students" />
          <HeroStat
            label="Attendance today"
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
          {showMoney ? (
            <HeroStat
              label="Collected this month"
              value={dash ?? inr(money?.collectedThisMonth ?? 0)}
              tone="success"
              to="/app/fees"
            />
          ) : (
            <HeroStat label="Active batches" value={dash ?? String(data?.batches ?? 0)} to="/app/batches" />
          )}
        </section>

        {/* Anything waiting on a human. */}
        <div className="mt-6 space-y-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Needs you
          </h2>
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
            icon={Layers}
            label="Active batches"
            count={data?.batches ?? 0}
            to="/app/batches"
          />
        </div>
      </PageBody>
    </>
  );
}

function BigAction({
  icon: Icon,
  title,
  hint,
  to,
  urgent,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  to: string;
  urgent?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 active:bg-muted/50 sm:p-5"
    >
      <span
        className={
          "grid h-11 w-11 shrink-0 place-items-center rounded-lg " +
          (urgent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold tracking-tight">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
