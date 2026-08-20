import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2, Wallet } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facultyApi, type Faculty } from "@/lib/api";
import { salaryApi, currentMonth, type SalaryRow } from "@/lib/api/salary";
import { inr } from "@/components/app/dashboard/dashboard-cards";
import { formatDate, todayISO } from "@/lib/dates";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/rbac";

export const Route = createFileRoute("/app/salaries")({
  component: SalariesPage,
});

const METHODS = ["Cash", "UPI", "Bank transfer", "Cheque"];

function monthLabel(m: string) {
  const [y, mm] = m.split("-").map(Number);
  return new Date(y!, (mm ?? 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function SalariesPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = canAccess("reports", roles); // owner / admin / accountant
  const [month, setMonth] = useState(currentMonth());
  const [paying, setPaying] = useState<{ faculty: Faculty; amount: string } | null>(null);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.list(),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["salaries", month],
    queryFn: () => salaryApi.forMonth(month),
  });

  const paidBy = useMemo(() => {
    const m = new Map<string, SalaryRow>();
    for (const p of payments) if (p.faculty_id) m.set(p.faculty_id, p);
    return m;
  }, [payments]);

  const active = staff.filter((s) => s.status !== "inactive");
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = active.filter((s) => !paidBy.has(s.id));
  const pendingAmount = pending.reduce((s, f) => s + Number(f.base_salary || 0), 0);

  const payMut = useMutation({
    mutationFn: () =>
      salaryApi.pay({
        faculty_id: paying!.faculty.id,
        amount: Number(paying!.amount || 0),
        date,
        payment_method: method,
        description: note || null,
      }),
    onSuccess: () => {
      toast.success("Salary marked paid");
      qc.invalidateQueries({ queryKey: ["salaries"] });
      setPaying(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMut = useMutation({
    mutationFn: (id: string) => salaryApi.remove(id),
    onSuccess: () => {
      toast.success("Payment removed");
      qc.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Salaries"
        description="One row per teacher, one payment per month. Nothing else to learn."
        actions={
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="w-[170px]"
            aria-label="Month"
          />
        }
      />
      <PageBody>
        <section className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3">
          <Stat label={`Paid in ${monthLabel(month)}`} value={inr(totalPaid)} tone="success" />
          <Stat label="Still to pay" value={inr(pendingAmount)} tone="warning" />
          <Stat label="Teachers pending" value={String(pending.length)} />
        </section>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Teacher</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Monthly salary</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Paid on</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : active.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Add teachers under Faculty first.
                  </td>
                </tr>
              ) : (
                active.map((f) => {
                  const paid = paidBy.get(f.id);
                  return (
                    <tr key={f.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium">{f.full_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {f.subject || "—"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 tabular-nums sm:table-cell">
                        {f.base_salary ? inr(Number(f.base_salary)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {paid ? (
                          <Badge className="bg-success/10 text-success hover:bg-success/10">
                            Paid {inr(Number(paid.amount))}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning">
                            Unpaid
                          </Badge>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {paid ? formatDate(paid.date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!canWrite ? null : paid ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => undoMut.mutate(paid.id)}
                            title="Remove this payment"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => {
                              setPaying({ faculty: f, amount: String(f.base_salary ?? "") });
                              setDate(todayISO());
                            }}
                          >
                            <Wallet className="h-3.5 w-3.5" /> Mark paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {payments.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {payments.length} payment{payments.length === 1 ? "" : "s"} recorded in{" "}
            {monthLabel(month)}.
          </p>
        ) : null}
      </PageBody>

      <Dialog open={!!paying} onOpenChange={(v) => !v && setPaying(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay {paying?.faculty.full_name}</DialogTitle>
            <DialogDescription>{monthLabel(month)} salary</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sal-amt">Amount</Label>
              <Input
                id="sal-amt"
                inputMode="numeric"
                value={paying?.amount ?? ""}
                onChange={(e) => setPaying((p) => (p ? { ...p, amount: e.target.value } : p))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sal-date">Payment date</Label>
              <Input
                id="sal-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sal-note">Note (optional)</Label>
              <Textarea
                id="sal-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full gap-1.5"
              disabled={!Number(paying?.amount) || payMut.isPending}
              onClick={() => payMut.mutate()}
            >
              <Check className="h-4 w-4" /> Mark paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const cls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
  }[tone];
  return (
    <div className="min-w-0">
      <p className={`truncate text-2xl font-semibold tabular-nums tracking-tight ${cls}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
