import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Wallet } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/app/kpi-card";
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { FeeFormDialog } from "@/components/app/fee-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { feesApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/fees")({
  component: FeesPage,
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

type Row = Awaited<ReturnType<typeof feesApi.list>>[number];

function FeesPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("fees:write", roles);
  const { data = [], isLoading } = useQuery({ queryKey: ["fees"], queryFn: () => feesApi.list() });
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const filtered = useMemo(() => status === "all" ? data : data.filter((f) => f.status === status), [data, status]);

  const outstanding = data.reduce((a, b) => a + (Number(b.amount) - Number(b.amount_paid)), 0);
  const collected = data.reduce((a, b) => a + Number(b.amount_paid), 0);
  const overdue = data.filter((f) => f.status === "overdue" || (f.due_date && f.status !== "paid" && new Date(f.due_date) < new Date())).length;

  const removeMut = useMutation({
    mutationFn: (id: string) => feesApi.remove(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["fees"] }); setDeleting(null); },
  });

  const columns: DTColumn<Row>[] = [
    { key: "student", header: "Student", sortable: true, value: (r) => r.student?.full_name ?? "",
      cell: (r) => <div><p className="font-medium">{r.student?.full_name ?? "—"}</p><p className="text-xs text-muted-foreground">{r.student?.admission_no}</p></div> },
    { key: "description", header: "For", value: (r) => r.description ?? "", cell: (r) => r.description ?? "—" },
    { key: "amount", header: "Amount", sortable: true, value: (r) => Number(r.amount), cell: (r) => inr(Number(r.amount)) },
    { key: "amount_paid", header: "Paid", sortable: true, value: (r) => Number(r.amount_paid), cell: (r) => inr(Number(r.amount_paid)) },
    { key: "due_date", header: "Due", sortable: true, value: (r) => r.due_date ?? "", cell: (r) => r.due_date ?? "—" },
    {
      key: "status", header: "Status", sortable: true, value: (r) => r.status,
      cell: (r) => {
        const cls = r.status === "paid" ? "bg-success/10 text-success"
          : r.status === "overdue" ? "bg-destructive/10 text-destructive"
          : r.status === "partial" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
        return <Badge variant="secondary" className={cls}>{r.status}</Badge>;
      },
    },
    {
      key: "actions", header: "", className: "text-right",
      cell: (r) => canWrite ? (
        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Fees"
        description="Collect faster. Chase smarter."
        actions={canWrite ? <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Record payment</Button> : null}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
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
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>
      </PageBody>
      <FeeFormDialog open={open} onOpenChange={setOpen} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove fee entry?" confirmLabel="Remove" destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)} />
    </>
  );
}