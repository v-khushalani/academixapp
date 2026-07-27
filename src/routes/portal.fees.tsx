import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { feeStats, portalApi } from "@/lib/api/portal";
import { usePortalStudent, StatTile, PortalCard } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/portal/fees")({
  head: () => ({
    meta: [
      { title: "Fees — Academix Portal" },
      {
        name: "description",
        content: "Fee instalments, amounts paid, pending dues and due dates.",
      },
      { property: "og:title", content: "Fees — Academix Portal" },
      { property: "og:description", content: "See what is paid and what is still due." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalFees,
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function PortalFees() {
  const { student } = usePortalStudent();
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-fees", student?.id],
    queryFn: () => portalApi.fees(student!.id),
    enabled: !!student,
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const stats = feeStats(data);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Fees</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Billed" value={inr(stats.billed)} />
        <StatTile label="Paid" value={inr(stats.paid)} tone="success" />
        <StatTile
          label="Due"
          value={inr(stats.due)}
          tone={stats.due > 0 ? "warning" : "success"}
        />
      </div>

      <PortalCard title="Instalments">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fees have been raised yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.description ?? "Fee"}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {f.due_date ?? "—"}
                    {f.receipt_no ? ` · Receipt ${f.receipt_no}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold">{inr(Number(f.amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {inr(Number(f.amount_paid ?? 0))} paid
                    </p>
                  </div>
                  <Badge variant={f.status === "paid" ? "secondary" : "outline"}>{f.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>

      <p className="text-xs text-muted-foreground">
        Payments are recorded by the institute office. Contact them for receipts or corrections.
      </p>
    </div>
  );
}