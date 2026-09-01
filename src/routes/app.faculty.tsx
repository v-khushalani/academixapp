import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Send, Trash2, Wallet } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { FacultyFormDialog } from "@/components/app/faculty-form-dialog";
import { FacultyInviteDialog } from "@/components/app/faculty-invite-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FacultySalaryDialog } from "@/components/app/faculty-salary-dialog";
import { inr } from "@/lib/payments";
import { facultyApi, type Faculty } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/faculty")({
  component: FacultyPage,
});

function FacultyPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("role:manage", roles);
  const { data = [], isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.list(),
  });
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState<Faculty | null>(null);
  const [salaryFor, setSalaryFor] = useState<Faculty | null>(null);

  const removeMut = useMutation({
    mutationFn: (id: string) => facultyApi.remove(id),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DTColumn<Faculty>[] = [
    {
      key: "full_name",
      header: "Name",
      sortable: true,
      value: (r) => r.full_name,
      cell: (r) => <span className="font-medium">{r.full_name}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      value: (r) => r.subject ?? "",
      cell: (r) => r.subject ?? "—",
    },
    {
      key: "qualification",
      header: "Qualification",
      value: (r) => r.qualification ?? "",
      cell: (r) => r.qualification ?? "—",
    },
    {
      key: "base_salary",
      header: "Monthly salary",
      sortable: true,
      value: (r) => Number(r.base_salary ?? 0),
      cell: (r) =>
        r.base_salary ? (
          <span className="tabular-nums">{inr(Number(r.base_salary))}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "phone", header: "Phone", value: (r) => r.phone ?? "", cell: (r) => r.phone ?? "—" },
    { key: "email", header: "Email", value: (r) => r.email ?? "", cell: (r) => r.email ?? "—" },
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
            <Button size="icon" variant="ghost" title="Salary" onClick={() => setSalaryFor(r)}>
              <Wallet className="h-4 w-4" />
            </Button>
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
        title="Faculty"
        description={`${data.length} teachers`}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setInviteOpen(true)}
              >
                <Send className="h-4 w-4" />
                Invite on WhatsApp
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add faculty
              </Button>
            </div>
          ) : null
        }
      />
      <PageBody>
        <DataTable
          rows={data}
          columns={columns}
          searchKeys={["full_name", "subject", "email", "phone"]}
          searchPlaceholder="Search faculty…"
          exportName="faculty"
          exportTitle="Faculty"
          loading={isLoading}
        />
      </PageBody>
      <FacultySalaryDialog
        faculty={salaryFor}
        canWrite={canWrite}
        onOpenChange={(v) => !v && setSalaryFor(null)}
      />
      <FacultyFormDialog open={open} onOpenChange={setOpen} faculty={editing} />
      <FacultyInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove faculty?"
        description={deleting?.full_name}
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)}
      />
    </>
  );
}
