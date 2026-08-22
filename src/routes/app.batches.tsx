import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { BatchFormDialog } from "@/components/app/batch-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { batchesApi, type Batch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/batches")({
  component: BatchesPage,
});

function BatchesPage() {
  const navigate = useNavigate();
  const refresh = useRefreshLinked();
  const { roles } = useAuth();
  const canWrite = can("batch:write", roles);
  const { data = [], isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
  });
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);

  const filtered = status === "all" ? data : data.filter((b) => b.status === status);

  const removeMut = useMutation({
    mutationFn: (id: string) => batchesApi.remove(id),
    onSuccess: () => {
      toast.success("Batch removed");
      refresh();
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DTColumn<Batch>[] = [
    {
      key: "name",
      header: "Batch",
      sortable: true,
      value: (r) => r.name,
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "schedule",
      header: "Schedule",
      value: (r) => r.schedule ?? "",
      cell: (r) => r.schedule ?? "—",
    },
    { key: "room", header: "Room", value: (r) => r.room ?? "", cell: (r) => r.room ?? "—" },
    { key: "capacity", header: "Capacity", sortable: true, value: (r) => r.capacity },
    {
      key: "start_date",
      header: "Starts",
      sortable: true,
      value: (r) => r.start_date ?? "",
      cell: (r) => r.start_date ?? "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      value: (r) => r.status,
      cell: (r) => (
        <Badge
          variant="secondary"
          className={r.status === "active" ? "bg-success/10 text-success" : ""}
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        canWrite ? (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(r);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => setDeleting(r)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Batches"
        description={`${filtered.length} batches`}
        actions={
          canWrite ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New batch
            </Button>
          ) : null
        }
      />
      <PageBody>
        <DataTable
          rows={filtered}
          columns={columns}
          searchKeys={["name", "schedule", "room"]}
          searchPlaceholder="Search batches, schedule, room…"
          exportName="batches"
          exportTitle="Batches"
          loading={isLoading}
          onRowClick={(r) => navigate({ to: "/app/batches/$id", params: { id: r.id } })}
          toolbar={
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </PageBody>
      <BatchFormDialog open={open} onOpenChange={setOpen} batch={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove batch?"
        description={`Delete ${deleting?.name}. Students in this batch will become unassigned.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)}
      />
    </>
  );
}
