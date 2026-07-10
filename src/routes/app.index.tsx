import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Layers, Wallet, UserPlus } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { dashboardApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

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
  const institute = typeof window !== "undefined" ? (require("@/lib/academy-settings").getInstitute().name || "your institute") : "your institute";

  return (
    <>
      <PageHeader
        title={`Good day, ${name.split(" ")[0]}`}
        description={`Here is what is happening at ${institute} today.`}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Quick tips</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Create a batch first, then add students to it.</li>
            <li>Mark today’s attendance from the Attendance page — one batch per screen.</li>
            <li>Record payments as they come in from the Fees page.</li>
            <li>Export any table as CSV or PDF from the toolbar.</li>
          </ul>
        </div>
      </PageBody>
    </>
  );
}
