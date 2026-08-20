import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Link2, MessageCircle, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
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
import { StudentInviteDialog } from "@/components/app/student-invite-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { BulkImportDialog } from "@/components/app/bulk-import-dialog";
import { supabase } from "@/integrations/supabase/client";
import { studentsApi, batchesApi, type Student } from "@/lib/api";
import { studentInvitesApi, portalStatus } from "@/lib/api/invites";
import { Input } from "@/components/ui/input";
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
  const canEdit = can("student:edit", roles);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });

  const [status, setStatus] = useState<string>("all");
  const [cls, setCls] = useState<string>("all");
  const [batchId, setBatchId] = useState<string>("all");
  const [approval, setApproval] = useState<string>("all");
  const [dues, setDues] = useState<string>("all");
  const [portal, setPortal] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [inviting, setInviting] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list() });
  const { data: invites = [] } = useQuery({
    queryKey: ["student-invites"],
    queryFn: () => studentInvitesApi.list(),
  });
  const { data: feeRows = [] } = useQuery({
    queryKey: ["student-dues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("student_id, amount, amount_paid, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const withDues = useMemo(() => {
    const s = new Set<string>();
    for (const f of feeRows) {
      if (f.status === "waived" || f.status === "cancelled") continue;
      if (Number(f.amount ?? 0) - Number(f.amount_paid ?? 0) > 0) s.add(f.student_id as string);
    }
    return s;
  }, [feeRows]);

  const classes = useMemo(
    () => Array.from(new Set(data.map((s) => s.class).filter(Boolean))) as string[],
    [data],
  );
  const filtered = useMemo(
    () =>
      data.filter((s) => {
        if (status !== "all" && s.status !== status) return false;
        if (cls !== "all" && s.class !== cls) return false;
        if (batchId !== "all" && (s.batch_id ?? "none") !== batchId) return false;
        if (approval !== "all" && s.approval_status !== approval) return false;
        if (dues !== "all") {
          const has = withDues.has(s.id);
          if (dues === "dues" && !has) return false;
          if (dues === "clear" && has) return false;
        }
        if (portal !== "all" && portalStatus(s, invites) !== portal) return false;
        if (from && (s.admission_date ?? "") < from) return false;
        if (to && (s.admission_date ?? "") > to) return false;
        return true;
      }),
    [data, status, cls, batchId, approval, dues, portal, from, to, withDues, invites],
  );

  const activeFilters =
    (status !== "all" ? 1 : 0) +
    (cls !== "all" ? 1 : 0) +
    (batchId !== "all" ? 1 : 0) +
    (approval !== "all" ? 1 : 0) +
    (dues !== "all" ? 1 : 0) +
    (portal !== "all" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  function clearFilters() {
    setStatus("all");
    setCls("all");
    setBatchId("all");
    setApproval("all");
    setDues("all");
    setPortal("all");
    setFrom("");
    setTo("");
  }

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
      key: "portal",
      header: "Portal",
      value: (r) => portalStatus(r, invites),
      cell: (r) => {
        const st = portalStatus(r, invites);
        return (
          <Badge
            variant="secondary"
            className={
              st === "active"
                ? "bg-success/10 text-success"
                : st === "invited"
                  ? "bg-warning/10 text-warning"
                  : ""
            }
          >
            {st === "none" ? "Not invited" : st === "invited" ? "Invited" : "Active"}
          </Badge>
        );
      },
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
              title="Portal access for student / parent"
              onClick={() => setInviting(r)}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
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
                    const inst = (typeof window !== "undefined" && JSON.parse(window.localStorage.getItem("vk_institute") ?? "{}").name) || "our institute";
                    const msg = `Hello ${r.full_name},\n\nWelcome to ${inst}. Please fill your admission details using the link below:\n${url}\n\nThank you.`;
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
              disabled={!canEdit}
              title={canEdit ? "Edit student" : "Only admins can edit enrolment details"}
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
              disabled={!canEdit}
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
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Import CSV
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
                New student
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
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  <SelectItem value="none">No batch</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
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
              <Select value={approval} onValueChange={setApproval}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All approvals</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="enquiry">Enquiry</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dues} onValueChange={setDues}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Fees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fees</SelectItem>
                  <SelectItem value="dues">Has dues</SelectItem>
                  <SelectItem value="clear">Fully paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={portal} onValueChange={setPortal}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Portal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All portal states</SelectItem>
                  <SelectItem value="none">Not invited</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="Admitted from"
                className="h-9 w-[150px]"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                type="date"
                aria-label="Admitted to"
                className="h-9 w-[150px]"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              {activeFilters > 0 ? (
                <Button size="sm" variant="ghost" className="h-9 gap-1" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />
                  Clear {activeFilters}
                </Button>
              ) : null}
            </>
          }
        />
      </PageBody>

      <StudentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} student={editing} />
      <StudentInviteDialog
        open={Boolean(inviting)}
        onOpenChange={(v) => !v && setInviting(null)}
        student={inviting}
      />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import students"
        description="Upload a CSV to add many students at once. Download the template first so the column names match."
        templateName="students"
        fields={[
          { key: "full_name", label: "Full name", required: true },
          { key: "phone", label: "Phone" },
          { key: "class", label: "Class" },
          { key: "father_name", label: "Father name" },
          { key: "father_phone", label: "Father phone" },
          { key: "mother_name", label: "Mother name" },
          { key: "mother_phone", label: "Mother phone" },
          { key: "email", label: "Email" },
          { key: "address", label: "Address" },
        ]}
        onImport={async (rows) => {
          const payload = rows.map((r) => ({
            ...r,
            approval_status: "approved",
            parent_name: (r.father_name as string) ?? (r.mother_name as string) ?? null,
            parent_phone: (r.father_phone as string) ?? (r.mother_phone as string) ?? null,
          }));
          const { error } = await supabase.from("students").insert(payload as never);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["students"] });
        }}
      />
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
