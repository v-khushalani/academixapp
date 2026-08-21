import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Faculty } from "@/lib/api";
import { salaryApi } from "@/lib/api/salary";
import { academicYearRange, monthRange, PAYMENT_METHODS } from "@/lib/api/expenses";
import { inr } from "@/lib/payments";
import { formatDate, todayISO } from "@/lib/dates";

export function FacultySalaryDialog({
  faculty,
  canWrite,
  onOpenChange,
}: {
  faculty: Faculty | null;
  canWrite: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["salaries", faculty?.id],
    queryFn: () => salaryApi.forFaculty(faculty!.id),
    enabled: Boolean(faculty),
  });

  const pay = useMutation({
    mutationFn: () =>
      salaryApi.pay({
        faculty_id: faculty!.id,
        amount: Number(amount || 0),
        date,
        payment_method: method,
        description: note || null,
      }),
    onSuccess: () => {
      toast.success("Salary payment recorded");
      qc.invalidateQueries({ queryKey: ["salaries"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setPaying(false);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => salaryApi.remove(id),
    onSuccess: () => {
      toast.success("Payment removed");
      qc.invalidateQueries({ queryKey: ["salaries"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!faculty) return null;

  const month = monthRange(new Date().toISOString().slice(0, 7));
  const ay = academicYearRange();
  const sum = (from: string, to: string) =>
    payments
      .filter((p) => p.date >= from && p.date <= to)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidMonth = sum(month.from, month.to);
  const paidYear = sum(ay.from, ay.to);
  const monthly = Number(faculty.base_salary || 0);

  return (
    <Dialog open onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{faculty.full_name} · Salary</DialogTitle>
          <DialogDescription>{faculty.subject || "Faculty"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-card p-4">
          <Stat label="Monthly" value={monthly ? inr(monthly) : "—"} />
          <Stat label="Paid this month" value={inr(paidMonth)} tone="success" />
          <Stat label={`Paid ${ay.label}`} value={inr(paidYear)} />
        </div>

        {canWrite ? (
          paying ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="fs-amt">Amount</Label>
                <Input
                  id="fs-amt"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fs-date">Payment date</Label>
                <Input
                  id="fs-date"
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
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fs-note">Note (optional)</Label>
                <Textarea
                  id="fs-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPaying(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  disabled={!Number(amount) || pay.isPending}
                  onClick={() => pay.mutate()}
                >
                  <Check className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="w-full gap-1.5"
              onClick={() => {
                setAmount(monthly ? String(monthly) : "");
                setDate(todayISO());
                setPaying(true);
              }}
            >
              <Wallet className="h-4 w-4" /> Pay salary
            </Button>
          )
        ) : null}

        <div className="rounded-lg border border-border">
          <p className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Payment history
          </p>
          <ul className="divide-y divide-border">
            {payments.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No salary payments recorded yet.
              </li>
            ) : (
              payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">{formatDate(p.date)}</span>
                  <span className="flex-1 truncate text-muted-foreground">
                    {[p.payment_method, p.description].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="tabular-nums font-medium">{inr(Number(p.amount))}</span>
                  {canWrite ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove.mutate(p.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Salary payments appear in Expenses under the Salary category.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="min-w-0">
      <p
        className={`truncate text-lg font-semibold tabular-nums ${tone === "success" ? "text-success" : ""}`}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
