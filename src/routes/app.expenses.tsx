import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Trash2, Wallet } from "lucide-react";
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
import { facultyApi } from "@/lib/api";
import {
  academicYearRange,
  byCategory,
  expenseLabel,
  expensesApi,
  EXPENSE_CATEGORIES,
  monthRange,
  PAYMENT_METHODS,
} from "@/lib/api/expenses";
import { inr } from "@/lib/payments";
import { formatDate, todayISO } from "@/lib/dates";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/rbac";

export const Route = createFileRoute("/app/expenses")({
  component: ExpensesPage,
  head: () => ({
    meta: [
      { title: "Expenses · Academix" },
      {
        name: "description",
        content: "Track salaries, rent, electricity and every other cost of running your institute.",
      },
      { property: "og:title", content: "Expenses · Academix" },
      {
        property: "og:description",
        content: "One ledger for salaries, rent, utilities and running costs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ALL = "__all";
const currentMonth = () => new Date().toISOString().slice(0, 7);

function ExpensesPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = canAccess("expenses", roles);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState(ALL);
  const [addOpen, setAddOpen] = useState(false);

  const ay = academicYearRange();
  const range = period === "month" ? monthRange(month) : { from: ay.from, to: ay.to };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["expenses", range.from, range.to],
    queryFn: () => expensesApi.list(range),
  });

  const visible = useMemo(
    () => (category === ALL ? rows : rows.filter((r) => r.category === category)),
    [rows, category],
  );
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const buckets = byCategory(rows);

  const removeMut = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const head = ["Date", "Category", "Amount", "Paid to", "Mode", "Note"];
    const body = visible.map((r) => [
      r.date,
      expenseLabel(r.category),
      String(r.amount),
      r.faculty?.full_name ?? "",
      r.payment_method ?? "",
      (r.description ?? "").replace(/[\r\n,]+/g, " "),
    ]);
    const csv = [head, ...body].map((l) => l.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Salaries, rent, bills — every rupee going out, in one ledger."
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add expense
              </Button>
            </div>
          ) : null
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as "month" | "year")}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This month view</SelectItem>
              <SelectItem value="year">Academic year {ay.label}</SelectItem>
            </SelectContent>
          </Select>
          {period === "month" ? (
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              className="h-9 w-[165px]"
              aria-label="Month"
            />
          ) : null}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {expenseLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <section className="mt-4 rounded-lg border border-border bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Total spend
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{inr(total)}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {buckets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded for this period.</p>
            ) : (
              buckets.map((b) => (
                <div key={b.category} className="rounded-md border border-border/70 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{expenseLabel(b.category)}</span>
                    <span className="tabular-nums text-sm">{inr(b.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${total ? Math.round((b.amount / total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Details</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No expenses recorded here yet.
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(r.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{expenseLabel(r.category)}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {[r.faculty?.full_name, r.description, r.payment_method]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {inr(Number(r.amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canWrite ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeMut.mutate(r.id)}
                          title="Remove entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageBody>

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function AddExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [facultyId, setFacultyId] = useState<string>("");

  const { data: staff = [] } = useQuery({ queryKey: ["faculty-directory"], queryFn: () => facultyApi.directory() });

  const save = useMutation({
    mutationFn: () =>
      expensesApi.create({
        category,
        amount: Number(amount || 0),
        date,
        payment_method: method,
        description: note || null,
        faculty_id: category === "salary" && facultyId ? facultyId : null,
      }),
    onSuccess: () => {
      toast.success("Expense recorded");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["salaries"] });
      onOpenChange(false);
      setAmount("");
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Anything the institute paid for.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {expenseLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category === "salary" ? (
            <div className="space-y-1.5">
              <Label>Teacher / staff</Label>
              <Select value={facultyId} onValueChange={setFacultyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="exp-amt">Amount</Label>
            <Input
              id="exp-amt"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-date">Date</Label>
            <Input
              id="exp-date"
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
            <Label htmlFor="exp-note">Note (optional)</Label>
            <Textarea
              id="exp-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full gap-1.5"
            disabled={!Number(amount) || save.isPending}
            onClick={() => save.mutate()}
          >
            <Wallet className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
