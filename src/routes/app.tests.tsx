import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { batchesApi, testsApi, type TestInsert } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/tests")({
  component: TestsPage,
});

type Row = Awaited<ReturnType<typeof testsApi.list>>[number];

function TestsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canWrite = can("test:write", roles);
  const { data = [], isLoading } = useQuery({ queryKey: ["tests"], queryFn: () => testsApi.list() });
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const removeMut = useMutation({
    mutationFn: (id: string) => testsApi.remove(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["tests"] }); setDeleting(null); },
  });

  const columns: DTColumn<Row>[] = [
    { key: "title", header: "Test", sortable: true, value: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "type", header: "Type", value: (r) => r.type, cell: (r) => <span className="uppercase text-muted-foreground">{r.type}</span> },
    { key: "subject", header: "Subject", sortable: true, value: (r) => r.subject ?? "", cell: (r) => r.subject ?? "—" },
    { key: "batch", header: "Batch", value: (r) => r.batch?.name ?? "", cell: (r) => r.batch?.name ?? "—" },
    { key: "date", header: "Date", sortable: true, value: (r) => r.date },
    { key: "max_marks", header: "Max", sortable: true, value: (r) => r.max_marks },
    {
      key: "status", header: "Status", sortable: true, value: (r) => r.status,
      cell: (r) => <Badge variant="secondary" className={r.status === "completed" ? "bg-success/10 text-success" : "bg-accent text-primary"}>{r.status}</Badge>,
    },
    {
      key: "actions", header: "", className: "text-right",
      cell: (r) => canWrite ? (
        <Button size="icon" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleting(r); }}><Trash2 className="h-4 w-4" /></Button>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tests"
        description={`${data.length} tests`}
        actions={canWrite ? <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create test</Button> : null}
      />
      <PageBody>
        <DataTable
          rows={data}
          columns={columns}
          searchKeys={["title", "subject"]}
          searchPlaceholder="Search tests…"
          exportName="tests"
          exportTitle="Tests"
          loading={isLoading}
          onRowClick={(r) => navigate({ to: "/app/tests/$id", params: { id: r.id } })}
        />
      </PageBody>
      <TestDialog open={open} onOpenChange={setOpen} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove test?" confirmLabel="Remove" destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)} />
    </>
  );
}

function TestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<TestInsert>({ title: "", type: "quiz", max_marks: 100, date: new Date().toISOString().slice(0,10), status: "scheduled" });
  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list(), enabled: open });
  const mut = useMutation({
    mutationFn: (i: TestInsert) => testsApi.create(i),
    onSuccess: () => { toast.success("Test created"); qc.invalidateQueries({ queryKey: ["tests"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create test</DialogTitle></DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); mut.mutate(f); }} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={f.type ?? "quiz"} onValueChange={(v) => setF({ ...f, type: v as TestInsert["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["quiz","unit","midterm","final","mock","practice"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Subject</Label><Input value={f.subject ?? ""} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Batch</Label>
            <Select value={f.batch_id ?? "none"} onValueChange={(v) => setF({ ...f, batch_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any / All</SelectItem>
                {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.date ?? ""} onChange={(e) => setF({ ...f, date: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Max marks</Label><Input type="number" min={1} value={f.max_marks ?? 100} onChange={(e) => setF({ ...f, max_marks: Number(e.target.value) })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Status</Label>
            <Select value={f.status ?? "scheduled"} onValueChange={(v) => setF({ ...f, status: v as TestInsert["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["scheduled","ongoing","completed","cancelled"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}