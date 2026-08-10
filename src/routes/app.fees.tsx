import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, MessageCircle, Plus, QrCode, Trash2, Wallet } from "lucide-react";
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
import { WA_TEMPLATES, openWhatsApp, renderTemplate } from "@/lib/whatsapp";
import { getTemplates, getInstitute } from "@/lib/academy-settings";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/dates";

export const Route = createFileRoute("/app/fees")({
  component: FeesPage,
});

import { inr } from "@/lib/format";

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

  const filtered = useMemo(
    () => (status === "all" ? data : data.filter((f) => f.status === status)),
    [data, status],
  );

  const live = data.filter(isLiveBill);
  const outstanding = live.reduce((a, b) => a + outstandingOf(b), 0);
  const collected = data.reduce((a, b) => a + Number(b.amount_paid), 0);
  const overdue = live.filter(
    (f) =>
      f.status === "overdue" ||
      (f.due_date && f.status !== "paid" && new Date(f.due_date) < new Date()),
  ).length;

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
      key: "status",
      header: "Status",
      sortable: true,
      value: (r) => r.status,
      cell: (r) => {
        const cls =
          r.status === "paid"
            ? "bg-success/10 text-success"
            : r.status === "overdue"
              ? "bg-destructive/10 text-destructive"
              : r.status === "partial"
                ? "bg-warning/10 text-warning"
                : r.status === "cancelled"
                  ? "bg-muted text-muted-foreground line-through"
                  : "bg-muted text-muted-foreground";
        return (
          <Badge variant="secondary" className={cls}>
            {r.status}
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
      .select("full_name, admission_no, class, parent_phone, phone, preferred_contact, father_phone, mother_phone, batch:batches(name)")
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
    const tpl = getTemplates()[isPaid ? "fee_received" : "fee_pending"];
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
    if (!openWhatsApp(phone, msg)) toast.error("No phone number on file for this parent/student.");
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
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-[140px]">
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
            }
          />
        </div>
      </PageBody>
      <PaymentDialog target={collecting} onOpenChange={(v) => !v && setCollecting(null)} />
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
