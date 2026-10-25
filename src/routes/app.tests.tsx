import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { ReportCardDialog } from "@/components/app/report-card-dialog";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { batchesApi, testsApi, type TestInsert } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { EXAM_TYPES, examLabel } from "@/lib/exam-types";

export const Route = createFileRoute("/app/tests")({
  component: TestsPage,
});

type Row = Awaited<ReturnType<typeof testsApi.list>>[number];

function TestsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canWrite = can("test:write", roles);
  const { data = [], isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: () => testsApi.list(),
  });
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

  const removeMut = useMutation({
    mutationFn: (id: string) => testsApi.remove(id),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["tests"] });
      setDeleting(null);
    },
  });

  const columns: DTColumn<Row>[] = [
    {
      key: "title",
      header: "Test",
      sortable: true,
      value: (r) => r.title,
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      value: (r) => r.type,
      cell: (r) => <span className="text-muted-foreground">{examLabel(r.type)}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      value: (r) => r.subject ?? "",
      cell: (r) => r.subject ?? "—",
    },
    {
      key: "batch",
      header: "Batch",
      value: (r) => r.batch?.name ?? "",
      cell: (r) => r.batch?.name ?? "—",
    },
    { key: "date", header: "Date", sortable: true, value: (r) => r.date },
    { key: "max_marks", header: "Max", sortable: true, value: (r) => r.max_marks },
    {
      key: "status",
      header: "Status",
      sortable: true,
      value: (r) => r.status,
      cell: (r) => (
        <Badge
          variant="secondary"
          className={
            r.status === "completed" ? "bg-success/10 text-success" : "bg-accent text-primary"
          }
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
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(r);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  const batchList = Array.from(
    new Map(data.filter((r) => r.batch).map((r) => [r.batch_id!, r.batch!.name])).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const rows = batchFilter ? data.filter((r) => r.batch_id === batchFilter) : data;

  return (
    <>
      <PageHeader
        title="Tests"
        description={`${rows.length} tests`}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCardOpen(true)}>
              <FileText className="h-4 w-4" />
              Report card
            </Button>
            {canWrite ? (
              <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Create test
              </Button>
            ) : null}
          </>
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={batchFilter ? "outline" : "default"}
            onClick={() => setBatchFilter(null)}
          >
            All batches
          </Button>
          {batchList.map(([id, name]) => (
            <Button
              key={id}
              size="sm"
              variant={batchFilter === id ? "default" : "outline"}
              onClick={() => setBatchFilter(id)}
            >
              {name}
            </Button>
          ))}
        </div>
        <DataTable
          rows={rows}
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
      {cardOpen && (
        <ReportCardDialog
          open={cardOpen}
          onOpenChange={setCardOpen}
          batches={batchList.map(([id, name]) => ({ id, name }))}
          initialBatchId={batchFilter}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove test?"
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleting && removeMut.mutate(deleting.id)}
      />
    </>
  );
}

function TestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<TestInsert>({
    title: "",
    type: "ut1" as TestInsert["type"],
    max_marks: 40,
    date: new Date().toISOString().slice(0, 10),
    status: "scheduled",
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
    enabled: open,
  });
  const mut = useMutation({
    mutationFn: (i: TestInsert) => testsApi.create(i),
    onSuccess: () => {
      toast.success("Test created");
      qc.invalidateQueries({ queryKey: ["tests"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create test</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            mut.mutate(f);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={f.type ?? "ut1"}
              onValueChange={(v) => {
                const t = EXAM_TYPES.find((x) => x.value === v);
                setF({ ...f, type: v as TestInsert["type"], max_marks: t?.max ?? f.max_marks });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label} · {t.term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              value={f.subject ?? ""}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Select
              value={f.batch_id ?? "none"}
              onValueChange={(v) => setF({ ...f, batch_id: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any / All</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={f.date ?? ""}
              onChange={(e) => setF({ ...f, date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max marks</Label>
            <Input
              type="number"
              min={1}
              value={f.max_marks ?? 100}
              onChange={(e) => setF({ ...f, max_marks: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status</Label>
            <Select
              value={f.status ?? "scheduled"}
              onValueChange={(v) => setF({ ...f, status: v as TestInsert["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["scheduled", "ongoing", "completed", "cancelled"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
