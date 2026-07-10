import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, MessageCircle, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
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
import { StudentFormDialog } from "@/components/app/student-form-dialog";
import { QuickAdmitDialog } from "@/components/app/quick-admit-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { studentsApi, type Student } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { openWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/app/students")({
  component: StudentsPage,
});

type Row = Awaited<ReturnType<typeof studentsApi.list>>[number];

function StudentsPage() {
  const { roles } = useAuth();
  const canWrite = can("student:write", roles);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });

  const [status, setStatus] = useState<string>("all");
  const [cls, setCls] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const classes = useMemo(
    () => Array.from(new Set(data.map((s) => s.class).filter(Boolean))) as string[],
    [data],
  );
  const filtered = useMemo(
    () =>
      data.filter((s) => {
        if (status !== "all" && s.status !== status) return false;
        if (cls !== "all" && s.class !== cls) return false;
        return true;
      }),
    [data, status, cls],
  );

  const removeMut = useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success("Student removed");
      qc.invalidateQueries({ queryKey: ["students"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DTColumn<Row>[] = [
    {
      key: "full_name",
      header: "Student",
      sortable: true,
      value: (r) => r.full_name,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.full_name}</p>
          <p className="text-xs text-muted-foreground">{r.school ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "admission_no",
      header: "Admission #",
      sortable: true,
      value: (r) => r.admission_no,
      cell: (r) => <span className="text-muted-foreground">{r.admission_no}</span>,
    },
    {
      key: "class",
      header: "Class",
      sortable: true,
      value: (r) => r.class ?? "",
      cell: (r) => r.class ?? "—",
    },
    {
      key: "batch",
      header: "Batch",
      value: (r) => r.batch?.name ?? "",
      cell: (r) => r.batch?.name ?? <span className="text-muted-foreground">—</span>,
    },
    { key: "phone", header: "Phone", value: (r) => r.phone ?? "", cell: (r) => r.phone ?? "—" },
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
            {r.onboarding_token && !r.onboarding_completed_at && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Copy onboarding link"
                  onClick={() => {
                    const url = `${window.location.origin}/onboard/${r.onboarding_token}`;
                    navigator.clipboard
                      .writeText(url)
                      .then(() => toast.success("Onboarding link copied"));
                  }}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Send onboarding link on WhatsApp"
                  onClick={() => {
                    const url = `${window.location.origin}/onboard/${r.onboarding_token}`;
                    const msg = `Hello ${r.full_name},\n\nWelcome to VK Academy. Please fill your admission details using the link below:\n${url}\n\nThank you.`;
                    if (!openWhatsApp(r.phone, msg)) toast.error("No phone number on file");
                  }}
                >
                  <MessageCircle className="h-4 w-4 text-success" />
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(r);
                setDialogOpen(true);
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
        title="Students"
        description={`${filtered.length} of ${data.length} students`}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setQuickOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Quick admit
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add student
              </Button>
            </div>
          ) : null
        }
      />
      <PageBody>
        <DataTable
          rows={filtered}
          columns={columns}
          searchKeys={["full_name", "admission_no", "phone", "email"]}
          searchPlaceholder="Search by name, admission no, phone…"
          exportName="students"
          exportTitle="Students"
          loading={isLoading}
          onRowClick={(r) => navigate({ to: "/app/students/$id", params: { id: r.id } })}
          toolbar={
            <>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      </PageBody>

      <StudentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} student={editing} />
      <QuickAdmitDialog open={quickOpen} onOpenChange={setQuickOpen} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove student?"
        description={`This will permanently remove ${deleting?.full_name}. This cannot be undone.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)}
      />
    </>
  );
}
