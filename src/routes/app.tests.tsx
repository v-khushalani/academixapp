import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FileText, Lock, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notificationsApi } from "@/lib/api/notifications";
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
  const [editing, setEditing] = useState<Row | null>(null);
  const isAdmin = roles.includes("owner") || roles.includes("admin");

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
        r.locked_at ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" /> Closed
          </Badge>
        ) : canWrite ? (
          <div className="flex justify-end">
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Edit test"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(r);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
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
          </div>
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
        {batchFilter && <ExamCycles tests={rows} batchId={batchFilter} isAdmin={isAdmin} />}
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
      {editing && (
        <TestDialog
          open
          editing={editing}
          siblings={data.filter((t) => t.batch_id === editing.batch_id && t.type === editing.type && t.id !== editing.id && !t.locked_at)}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}
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

function TestDialog({
  open,
  onOpenChange,
  editing,
  siblings = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Row | null;
  siblings?: Row[];
}) {
  const qc = useQueryClient();
  const [applyAll, setApplyAll] = useState(true);
  const [f, setF] = useState<TestInsert>(
    editing
      ? {
          title: editing.title,
          type: editing.type,
          subject: editing.subject,
          batch_id: editing.batch_id,
          max_marks: editing.max_marks,
          date: editing.date,
          status: editing.status,
        }
      : {
          title: "",
          type: "ut1" as TestInsert["type"],
          max_marks: 40,
          date: new Date().toISOString().slice(0, 10),
          status: "scheduled",
        },
  );
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
    enabled: open,
  });
  const mut = useMutation({
    mutationFn: async (i: TestInsert) => {
      if (!editing) return testsApi.create(i);
      const { error } = await supabase.from("tests").update(i).eq("id", editing.id);
      if (error) throw error;
      if (applyAll && i.type !== editing.type && siblings.length) {
        const { error: e2 } = await supabase
          .from("tests")
          .update({ type: i.type })
          .in("id", siblings.map((t) => t.id));
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Test updated" : "Test created");
      qc.invalidateQueries({ queryKey: ["tests"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit test" : "Create test"}</DialogTitle>
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
          {editing && f.type !== editing.type && siblings.length > 0 && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
              Also change the other {siblings.length} {examLabel(editing.type)} test(s) of this batch
            </label>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Per exam type in one batch: close all marks and publish the top 3 by overall %. */
function ExamCycles({ tests, batchId, isAdmin }: { tests: Row[]; batchId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const types = Array.from(new Set(tests.map((t) => t.type)));
  const ids = tests.map((t) => t.id);
  const { data: results = [] } = useQuery({
    queryKey: ["cycle-results", batchId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_results")
        .select("test_id, student_id, marks, student:students(full_name)")
        .in("test_id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  function top3(type: string) {
    const ts = tests.filter((t) => t.type === type);
    const maxBy = new Map(ts.map((t) => [t.id, t.max_marks]));
    const agg = new Map<string, { name: string; g: number; m: number }>();
    for (const r of results) {
      if (!maxBy.has(r.test_id) || r.marks == null) continue;
      const a = agg.get(r.student_id) ?? { name: (r.student as { full_name: string } | null)?.full_name ?? "", g: 0, m: 0 };
      a.g += Number(r.marks);
      a.m += Number(maxBy.get(r.test_id));
      agg.set(r.student_id, a);
    }
    return [...agg.values()]
      .map((a) => ({ ...a, pct: a.m ? (a.g / a.m) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }

  const lockMut = useMutation({
    mutationFn: async (type: string) => {
      const open = tests.filter((t) => t.type === type && !t.locked_at).map((t) => t.id);
      if (!open.length) return;
      const { error } = await supabase
        .from("tests")
        .update({ locked_at: new Date().toISOString(), status: "completed" } as never)
        .in("id", open);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marks closed");
      qc.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pubMut = useMutation({
    mutationFn: async (type: string) => {
      const t = top3(type);
      const batchName = tests[0]?.batch?.name ?? "";
      await notificationsApi.create({
        kind: "test",
        batch_id: batchId,
        title: `${examLabel(type)} toppers · ${batchName}`,
        body: t.map((x, i) => `${i + 1}. ${x.name} — ${x.pct.toFixed(1)}%`).join("\n"),
      });
    },
    onSuccess: () => toast.success("Top 3 published to the batch"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!types.length) return null;
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      {types.map((type) => {
        const ts = tests.filter((t) => t.type === type);
        const allLocked = ts.every((t) => t.locked_at);
        const t3 = top3(type);
        return (
          <div key={type} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {examLabel(type)} <span className="font-normal text-muted-foreground">· {ts.length} subjects</span>
              </p>
              {allLocked ? (
                <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Closed</Badge>
              ) : isAdmin ? (
                <Button size="sm" variant="outline" className="gap-1.5" disabled={lockMut.isPending}
                  onClick={() => { if (confirm(`Close marks for all ${examLabel(type)} tests? This cannot be undone.`)) lockMut.mutate(type); }}>
                  <Lock className="h-3.5 w-3.5" /> Close all
                </Button>
              ) : null}
            </div>
            {t3.length === 0 ? (
              <p className="text-xs text-muted-foreground">No marks yet.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {t3.map((x, i) => (
                  <li key={x.name + i} className="flex justify-between">
                    <span><Trophy className="mr-1 inline h-3.5 w-3.5 text-primary" />{i + 1}. {x.name}</span>
                    <span className="font-medium">{x.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ol>
            )}
            {allLocked && isAdmin && t3.length > 0 && (
              <Button size="sm" className="mt-3 w-full" disabled={pubMut.isPending} onClick={() => pubMut.mutate(type)}>
                Publish top 3 to students
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
