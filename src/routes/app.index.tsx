import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Layers, Wallet, UserPlus, CalendarCheck, FileText } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { dashboardApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getInstitute } from "@/lib/academy-settings";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.summary(),
  });

  const name = user?.user_metadata?.full_name || user?.email || "there";
  const institute = getInstitute().name || "your institute";

  return (
    <>
      <PageHeader
        title={`Good day, ${name.split(" ")[0]}`}
        description={`Here is what is happening at ${institute} today.`}
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard
            label="Active students"
            value={isLoading ? "—" : String(data?.students ?? 0)}
            icon={Users}
          />
          <KpiCard
            label="Active batches"
            value={isLoading ? "—" : String(data?.batches ?? 0)}
            icon={Layers}
          />
          <KpiCard
            label="Outstanding fees"
            value={isLoading ? "—" : inr(data?.outstanding ?? 0)}
            icon={Wallet}
            tone="warning"
          />
          <KpiCard
            label="New this month"
            value={isLoading ? "—" : String(data?.newThisMonth ?? 0)}
            icon={UserPlus}
            tone="success"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
          {QUICK.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <q.icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">{q.label}</span>
            </Link>
          ))}
        </div>
      </PageBody>
    </>
  );
}
