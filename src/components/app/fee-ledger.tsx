import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, MessageCircle, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { outstandingOf, isLiveBill } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { isOverdue, displayFeeStatus, daysToDue } from "@/lib/fees";
import { openWhatsApp } from "@/lib/whatsapp";
import { logMessage } from "@/lib/api/messages";
import { getInstitute } from "@/lib/academy-settings";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type Fee = {
  id: string;
  student_id: string;
  amount: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  description: string | null;
  installment_no: number;
};

export type LedgerFee = Fee;

type Props = {
  fees: Fee[];
  onCollect: (fee: Fee) => void;
};

type Ledger = {
  id: string;
  name: string;
  admission_no: string;
  phone: string | null;
  parent_name: string | null;
  batchIds: string[];
  batchNames: string[];
  gross: number;
  discount: number;
  net: number;
  paid: number;
  pending: number;
  overdueAmt: number;
  nextDue: string | null;
  bills: Fee[];
};

export function FeeLedger({ fees, onCollect }: Props) {
  const [batch, setBatch] = useState("all");
  const [show, setShow] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["fee-ledger-context"],
    queryFn: async () => {
      const [st, bt, sb] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id, full_name, admission_no, batch_id, discount, scholarship_percent, parent_name, parent_phone, phone, father_phone, mother_phone, preferred_contact, status, approval_status",
          ),
        supabase.from("batches").select("id, name, default_fee").order("name"),
        supabase.from("student_batches").select("student_id, batch_id"),
      ]);
      if (st.error) throw st.error;
      if (bt.error) throw bt.error;
      if (sb.error) throw sb.error;
      return { students: st.data ?? [], batches: bt.data ?? [], links: sb.data ?? [] };
    },
  });

  const rows = useMemo<Ledger[]>(() => {
    if (!ctx) return [];
    const batchById = new Map(ctx.batches.map((b) => [b.id, b]));
    const linkMap = new Map<string, Set<string>>();
    for (const l of ctx.links) {
      if (!linkMap.has(l.student_id)) linkMap.set(l.student_id, new Set());
      linkMap.get(l.student_id)!.add(l.batch_id);
    }
    const feesBy = new Map<string, Fee[]>();
    for (const f of fees) {
      if (!feesBy.has(f.student_id)) feesBy.set(f.student_id, []);
      feesBy.get(f.student_id)!.push(f);
    }
    const out: Ledger[] = [];
    for (const s of ctx.students) {
      const ids = new Set(linkMap.get(s.id) ?? []);
      if (s.batch_id) ids.add(s.batch_id);
      const bills = (feesBy.get(s.id) ?? []).sort(
        (a, b) =>
          (a.due_date ?? "").localeCompare(b.due_date ?? "") || a.installment_no - b.installment_no,
      );
      if (ids.size === 0 && bills.length === 0) continue;
      const live = bills.filter(isLiveBill);
      const billed = live.reduce((a, f) => a + Number(f.amount), 0);
      const batchGross = [...ids].reduce(
        (a, id) => a + Number(batchById.get(id)?.default_fee ?? 0),
        0,
      );
      const discount = Math.min(
        batchGross,
        (batchGross * Number(s.scholarship_percent ?? 0)) / 100 + Number(s.discount ?? 0),
      );
      const net = Math.max(billed, batchGross - discount);
      const gross = net + discount;
      const paid = bills.reduce((a, f) => a + Number(f.amount_paid ?? 0), 0);
      const pending = live.reduce((a, f) => a + outstandingOf(f), 0);
      const overdueAmt = live.filter((f) => isOverdue(f)).reduce((a, f) => a + outstandingOf(f), 0);
      const nextDue =
        live
          .filter((f) => outstandingOf(f) > 0 && f.due_date)
          .map((f) => f.due_date as string)
          .sort()[0] ?? null;
      const preferred = s.preferred_contact === "mother" ? s.mother_phone : s.father_phone;
      out.push({
        id: s.id,
        name: s.full_name,
        admission_no: s.admission_no,
        phone: preferred ?? s.parent_phone ?? s.phone ?? null,
        parent_name: s.parent_name,
        batchIds: [...ids],
        batchNames: [...ids].map((id) => batchById.get(id)?.name ?? "—"),
        gross,
        discount,
        net,
        paid,
        pending,
        overdueAmt,
        nextDue,
        bills,
      });
    }
    return out.sort((a, b) => b.overdueAmt - a.overdueAmt || b.pending - a.pending);
  }, [ctx, fees]);

  const visible = useMemo(() => {
    const words = norm(q).split(" ").filter(Boolean);
    return rows.filter((r) => {
      if (batch !== "all" && !r.batchIds.includes(batch)) return false;
      if (show === "pending" && r.pending <= 0) return false;
      if (show === "overdue" && r.overdueAmt <= 0) return false;
      if (show === "cleared" && r.pending > 0) return false;
      if (words.length) {
        const hay = norm(`${r.name} ${r.admission_no} ${r.phone ?? ""} ${r.batchNames.join(" ")}`);
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [rows, batch, show, q]);

  const totals = visible.reduce(
    (a, r) => ({
      net: a.net + r.net,
      discount: a.discount + r.discount,
      paid: a.paid + r.paid,
      pending: a.pending + r.pending,
      overdue: a.overdue + (r.overdueAmt > 0 ? 1 : 0),
    }),
    { net: 0, discount: 0, paid: 0, pending: 0, overdue: 0 },
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function followUp(r: Ledger) {
    if (r.pending <= 0) {
      toast.info("Nothing pending for this student.");
      return;
    }
    const msg = [
      `Dear ${r.parent_name || "Parent"},`,
      ``,
      `Fee update for *${r.name}* (${r.batchNames.join(" + ")}):`,
      `Paid so far: ${inr(r.paid)}`,
      `*Pending: ${inr(r.pending)}*`,
      r.overdueAmt > 0 ? `Overdue now: ${inr(r.overdueAmt)}` : null,
      r.nextDue ? `Next due date: ${formatDate(r.nextDue)}` : null,
      ``,
      `Kindly clear the dues at the earliest. Thank you!`,
      `— ${getInstitute().name}`,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const ok = openWhatsApp(r.phone, msg);
    logMessage([
      {
        kind: "fee_reminder",
        title: "Fee follow-up",
        message: msg,
        status: ok ? "sent" : "failed",
        recipient_name: r.name,
        recipient_phone: r.phone,
        student_id: r.id,
      },
    ]);
    if (!ok) toast.error("No phone number on file for this parent/student.");
  }

  function collectNext(r: Ledger) {
    const next = r.bills.filter(isLiveBill).find((f) => outstandingOf(f) > 0);
    if (!next) {
      toast.info("All bills are cleared.");
      return;
    }
    onCollect(next);
  }

  function status(r: Ledger) {
    if (r.pending <= 0)
      return (
        <Badge variant="secondary" className="bg-success/10 text-success">
          Cleared
        </Badge>
      );
    if (r.overdueAmt > 0) {
      const d = r.nextDue ? -(daysToDue(r.nextDue) ?? 0) : 0;
      return (
        <Badge variant="secondary" className="bg-destructive/10 text-destructive">
          Overdue{d > 0 ? ` ${d}d` : ""}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-warning/10 text-warning">
        Due {r.nextDue ? formatDate(r.nextDue) : "—"}
      </Badge>
    );
  }

  const batches = ctx?.batches ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={batch === "all" ? "default" : "outline"}
          onClick={() => setBatch("all")}
          className="shrink-0"
        >
          All batches
        </Button>
        {batches.map((b) => (
          <Button
            key={b.id}
            size="sm"
            variant={batch === b.id ? "default" : "outline"}
            onClick={() => setBatch(b.id)}
            className="shrink-0"
          >
            {b.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Students" value={String(visible.length)} />
        <Stat label="Net fees" value={inr(totals.net)} />
        <Stat label="Discount given" value={inr(totals.discount)} />
        <Stat label="Paid" value={inr(totals.paid)} tone="text-success" />
        <Stat
          label={`Pending · ${totals.overdue} overdue`}
          value={inr(totals.pending)}
          tone="text-destructive"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student, admission no, phone…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={show} onValueChange={setShow}>
          <SelectTrigger className="h-9 w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All students</SelectItem>
            <SelectItem value="pending">Has pending</SelectItem>
            <SelectItem value="overdue">Overdue only</SelectItem>
            <SelectItem value="cleared">Fully cleared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-8 p-3" />
              <th className="p-3">Student</th>
              <th className="p-3">Batch</th>
              <th className="p-3 text-right">Total fee</th>
              <th className="p-3 text-right">Discount</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Pending</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && visible.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  No students match.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <Fragment key={r.id}>
                <tr className="cursor-pointer border-t hover:bg-muted/30" onClick={() => toggle(r.id)}>
                  <td className="p-3">
                    {open.has(r.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.admission_no}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </p>
                  </td>
                  <td className="p-3 text-xs">{r.batchNames.join(" + ") || "—"}</td>
                  <td className="p-3 text-right">{inr(r.gross)}</td>
                  <td className="p-3 text-right text-muted-foreground">
                    {r.discount > 0 ? "−" + inr(r.discount) : "—"}
                  </td>
                  <td className="p-3 text-right">{inr(r.net)}</td>
                  <td className="p-3 text-right text-success">{inr(r.paid)}</td>
                  <td className="p-3 text-right font-semibold text-destructive">
                    {r.pending > 0 ? inr(r.pending) : "—"}
                  </td>
                  <td className="p-3">{status(r)}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Collect next bill" onClick={() => collectNext(r)}>
                        <QrCode className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" title="WhatsApp follow-up" onClick={() => followUp(r)}>
                        <MessageCircle className="h-4 w-4 text-success" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {open.has(r.id) && (
                  <tr className="bg-muted/20">
                    <td />
                    <td colSpan={9} className="p-3">
                      {r.bills.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No bills yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {r.bills.map((f) => (
                            <div key={f.id} className="flex flex-wrap items-center gap-3 text-xs">
                              <span className="min-w-[200px] flex-1">{f.description ?? "Fee"}</span>
                              <span>Due {formatDate(f.due_date)}</span>
                              <span>{inr(Number(f.amount))}</span>
                              <span className="text-success">Paid {inr(Number(f.amount_paid))}</span>
                              <Badge variant="secondary">{displayFeeStatus(f)}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
