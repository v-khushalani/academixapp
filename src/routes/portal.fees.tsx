import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { feeStats, portalApi } from "@/lib/api/portal";
import { usePortalStudent, StatTile, PortalCard } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { getInstitute } from "@/lib/academy-settings";
import { inr, upiLink } from "@/lib/payments";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

function PortalFees() {
  const { student, isParent } = usePortalStudent();
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-fees", student?.id],
    queryFn: () => portalApi.fees(student!.id),
    enabled: !!student,
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const stats = feeStats(data);
  const institute = getInstitute();
  const payableFee = data.find(
    (f) =>
      f.status !== "cancelled" &&
      f.status !== "waived" &&
      Number(f.amount) > Number(f.amount_paid ?? 0),
  );
  const payableAmount = payableFee
    ? Math.max(0, Number(payableFee.amount) - Number(payableFee.amount_paid ?? 0))
    : 0;
  const paymentLink = payableFee
    ? upiLink({
        amount: payableAmount,
        note: `${student.full_name} · ${payableFee.description ?? "Fees"}`,
        refId: payableFee.id,
      })
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Fees</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Billed" value={inr(stats.billed)} />
        <StatTile label="Paid" value={inr(stats.paid)} tone="success" />
        <StatTile label="Due" value={inr(stats.due)} tone={stats.due > 0 ? "warning" : "success"} />
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
                    Due {formatDate(f.due_date)}
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

      {paymentLink && institute.upi_id && payableFee && (
        <PortalCard title="Pay online by UPI">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="rounded-lg border border-border bg-white p-2">
              <QRCodeCanvas value={paymentLink} size={156} includeMargin />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Pay {inr(payableAmount)} using any UPI app</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {institute.upi_name || institute.name}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {institute.upi_id}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button size="sm" className="gap-1.5" asChild>
                  <a href={paymentLink}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open UPI app
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    void navigator.clipboard.writeText(institute.upi_id);
                    toast.success("UPI ID copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy UPI ID
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" /> After payment, the institute office will update your
            receipt.
          </p>
        </PortalCard>
      )}

      {isParent && stats.due > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">{inr(stats.due)} is still due</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pay at the institute office or on the UPI details shared with you on WhatsApp. The
            receipt appears here as soon as the office records the payment.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Payments are recorded by the institute office. Contact them for receipts or corrections.
      </p>
    </div>
  );
}
