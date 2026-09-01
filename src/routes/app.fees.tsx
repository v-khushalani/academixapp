import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, MessageCircle, Pencil, Plus, QrCode, Trash2, Wallet } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/app/kpi-card";
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { FeeFormDialog } from "@/components/app/fee-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PaymentDialog, type PaymentTarget } from "@/components/app/payment-dialog";
import { feesApi, outstandingOf, isLiveBill } from "@/lib/api";
import { FeeCorrectionDialog, type CorrectionTarget } from "@/components/app/fee-correction-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";
import { can } from "@/lib/rbac";
import { openWhatsApp, renderTemplate } from "@/lib/whatsapp";
import { logMessage } from "@/lib/api/messages";
import { getTemplates, getInstitute } from "@/lib/academy-settings";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/dates";
import { displayFeeStatus, feeFollowUpState, FOLLOW_UP_LABEL, isOverdue } from "@/lib/fees";
import {
  ReviseInstallmentDialog,
  type ReviseTarget,
} from "@/components/app/revise-installment-dialog";

export const Route = createFileRoute("/app/fees")({
  component: FeesPage,
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

type Row = Awaited<ReturnType<typeof feesApi.list>>[number];

function FeesPage() {
  const refresh = useRefreshLinked();
  const { roles } = useAuth();
  const canWrite = can("fees:write", roles);
  const { data = [], isLoading } = useQuery({ queryKey: ["fees"], queryFn: () => feesApi.list() });
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [collecting, setCollecting] = useState<PaymentTarget | null>(null);
  const [correcting, setCorrecting] = useState<CorrectionTarget | null>(null);
  const [revising, setRevising] = useState<ReviseTarget | null>(null);
  const [followUp, setFollowUp] = useState("all");

  const filtered = useMemo(() => {
    let rows = data;
    if (status !== "all") rows = rows.filter((f) => displayFeeStatus(f) === status);
    if (followUp !== "all") rows = rows.filter((f) => feeFollowUpState(f) === followUp);
    return rows;
  }, [data, status, followUp]);

  const live = data.filter(isLiveBill);
  const outstanding = live.reduce((a, b) => a + outstandingOf(b), 0);
  const collected = data.reduce((a, b) => a + Number(b.amount_paid), 0);
  const overdue = live.filter((f) => isOverdue(f)).length;

  const removeMut = useMutation({
    mutationFn: (id: string) => feesApi.remove(id),
    onSuccess: () => {
      toast.success("Removed");
      refresh();
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const columns: DTColumn<Row>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      value: (r) => r.student?.full_name ?? "",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.student?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{r.student?.admission_no}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: "For",
      value: (r) => r.description ?? "",
      cell: (r) => r.description ?? "—",
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      value: (r) => Number(r.amount),
      cell: (r) => inr(Number(r.amount)),
    },
    {
      key: "amount_paid",
      header: "Paid",
      sortable: true,
      value: (r) => Number(r.amount_paid),
      cell: (r) => inr(Number(r.amount_paid)),
    },
    {
      key: "due_date",
      header: "Due",
      sortable: true,
      value: (r) => r.due_date ?? "",
      cell: (r) => formatDate(r.due_date),
    },
    {
      key: "followup",
      header: "Follow-up",
      value: (r) => feeFollowUpState(r),
      cell: (r) => {
        const st = feeFollowUpState(r);
        if (st === "none") return <span className="text-muted-foreground">—</span>;
        const cls =
          st === "overdue"
            ? "bg-destructive/10 text-destructive"
            : st === "due_2"
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground";
        return (
          <Badge variant="secondary" className={cls}>
            {FOLLOW_UP_LABEL[st]}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      value: (r) => displayFeeStatus(r),
      cell: (r) => {
        const st = displayFeeStatus(r);
        const cls =
          st === "paid"
            ? "bg-success/10 text-success"
            : st === "overdue"
              ? "bg-destructive/10 text-destructive"
              : st === "partial"
                ? "bg-warning/10 text-warning"
                : st === "cancelled"
                  ? "bg-muted text-muted-foreground line-through"
                  : "bg-muted text-muted-foreground";
        return (
          <Badge variant="secondary" className={cls}>
            {st}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            title="Collect via UPI / receipt"
            onClick={() => openCollect(r)}
          >
            <QrCode className="h-4 w-4 text-primary" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Send WhatsApp reminder"
            onClick={() => sendReminder(r)}
          >
            <MessageCircle className="h-4 w-4 text-success" />
          </Button>
          {canWrite && r.status !== "cancelled" && r.status !== "paid" && (
            <Button
              size="icon"
              variant="ghost"
              title="Revise installment amount / due date"
              onClick={() =>
                setRevising({
                  id: r.id,
                  student_name: r.student?.full_name ?? "Student",
                  description: r.description,
                  amount: Number(r.amount),
                  amount_paid: Number(r.amount_paid),
                  due_date: r.due_date,
                })
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canWrite && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() =>
                Number(r.amount_paid) > 0
                  ? setCorrecting({
                      id: r.id,
                      student_name: r.student?.full_name ?? "Student",
                      description: r.description,
                      amount: Number(r.amount),
                      amount_paid: Number(r.amount_paid),
                      status: r.status,
                    })
                  : setDeleting(r)
              }
              title={
                Number(r.amount_paid) > 0 ? "Cancel bill / reverse payment" : "Delete wrong entry"
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function openCollect(r: Row) {
    const { data } = await supabase
      .from("students")
      .select(
        "full_name, admission_no, class, parent_phone, phone, preferred_contact, father_phone, mother_phone, batch:batches(name)",
      )
      .eq("id", r.student_id)
      .maybeSingle();
    const s = data as {
      full_name?: string;
      admission_no?: string | null;
      class?: string | null;
      parent_phone?: string | null;
      phone?: string | null;
      preferred_contact?: string | null;
      father_phone?: string | null;
      mother_phone?: string | null;
      batch?: { name?: string } | null;
    } | null;
    const preferred =
      s?.preferred_contact === "mother" ? s?.mother_phone : (s?.father_phone ?? null);
    setCollecting({
      id: r.id,
      student_name: s?.full_name ?? r.student?.full_name ?? "Student",
      admission_no: s?.admission_no ?? r.student?.admission_no ?? null,
      class_name: s?.class ?? null,
      batch_name: s?.batch?.name ?? null,
      description: r.description,
      amount: Number(r.amount),
      amount_paid: Number(r.amount_paid),
      due_date: r.due_date,
      paid_date: r.paid_date,
      receipt_no: r.receipt_no,
      phone: preferred ?? s?.parent_phone ?? s?.phone ?? null,
    });
  }

  async function sendReminder(r: Row) {
    // Look up parent_phone if not on relation
    const { data: student } = await supabase
      .from("students")
      .select("parent_phone, phone, parent_name, full_name, batch:batches(name)")
      .eq("id", r.student_id)
      .maybeSingle();
    const s = student as {
      parent_phone?: string | null;
      phone?: string | null;
      parent_name?: string | null;
      full_name?: string;
      batch?: { name?: string } | null;
    } | null;
    const phone = s?.parent_phone ?? s?.phone ?? null;
    const isPaid = r.status === "paid" || Number(r.amount_paid) >= Number(r.amount);
    const state = feeFollowUpState(r);
    const tpl =
      getTemplates()[
        isPaid
          ? "fee_received"
          : state === "overdue"
            ? "fee_overdue"
            : state === "due_2" || state === "due_7"
              ? "fee_due_soon"
              : "fee_pending"
      ];
    const msg = renderTemplate(tpl, {
      student_name: s?.full_name,
      parent_name: s?.parent_name ?? "Parent",
      batch_name: s?.batch?.name ?? "—",
      amount: inr(Number(r.amount)),
      amount_paid: inr(Number(r.amount_paid)),
      amount_due: inr(Number(r.amount) - Number(r.amount_paid)),
      due_date: formatDate(r.due_date),
      paid_date: r.paid_date ?? new Date().toISOString().slice(0, 10),
      receipt_no: r.receipt_no ?? "—",
      academy_name: getInstitute().name,
    });
    const ok = openWhatsApp(phone, msg);
    logMessage([
      {
        kind: isPaid ? "fee_receipt" : "fee_reminder",
        title: isPaid ? "Fee receipt" : "Fee reminder",
        message: msg,
        status: ok ? "sent" : "failed",
        recipient_name: s?.full_name ?? null,
        recipient_phone: phone,
        student_id: r.student_id,
        fee_id: r.id,
      },
    ]);
    if (!ok) toast.error("No phone number on file for this parent/student.");
  }

  return (
    <>
      <PageHeader
        title="Fees"
        description="Collect faster. Chase smarter."
        actions={
          canWrite ? (
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Collect payment
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard
            label="Total billed"
            value={inr(data.reduce((a, b) => a + Number(b.amount), 0))}
            icon={Wallet}
          />
          <KpiCard label="Outstanding" value={inr(outstanding)} icon={Wallet} tone="warning" />
          <KpiCard label="Collected" value={inr(collected)} icon={Wallet} tone="success" />
          <KpiCard label="Overdue" value={overdue} icon={Bell} tone="danger" />
        </div>
        <div className="mt-6">
          <DataTable
            rows={filtered}
            columns={columns}
            searchKeys={["description"]}
            searchPlaceholder="Search fees…"
            exportName="fees"
            exportTitle="Fees"
            loading={isLoading}
            toolbar={
              <div className="flex flex-wrap gap-2">
                <Select value={followUp} onValueChange={setFollowUp}>
                  <SelectTrigger className="h-9 w-full sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All follow-ups</SelectItem>
                    <SelectItem value="due_7">Due in 7 days</SelectItem>
                    <SelectItem value="due_2">Due in 2 days</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </div>
      </PageBody>
      <PaymentDialog target={collecting} onOpenChange={(v) => !v && setCollecting(null)} />
      <ReviseInstallmentDialog target={revising} onOpenChange={(v) => !v && setRevising(null)} />
      <FeeCorrectionDialog target={correcting} onOpenChange={(v) => !v && setCorrecting(null)} />
      <FeeFormDialog open={open} onOpenChange={setOpen} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete this fee entry?"
        description="Nothing has been collected on it, so it can be removed safely."
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)}
      />
    </>
  );
}
