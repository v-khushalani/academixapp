import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { myBatches, myFaculty, mySubjectsByBatch } from "@/lib/api/teach";
import { batchesApi, testsApi, type TestInsert } from "@/lib/api";
import { EXAM_TYPES, examLabel } from "@/lib/exam-types";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/teach/marks")({
  head: () => ({
    meta: [
      { title: "Enter Marks — Teacher Portal" },
      { name: "description", content: "Enter test marks for your batches in one screen." },
      { property: "og:title", content: "Enter Marks — Teacher Portal" },
      { property: "og:description", content: "Score entry built for phones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachMarks,
});

function TeachMarks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [testId, setTestId] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});

  const { data: faculty } = useQuery({
    queryKey: ["my-faculty", user?.id],
    queryFn: () => myFaculty(user?.id, user?.email),
    enabled: Boolean(user),
  });
  const { data: myBatchList = [] } = useQuery({
    queryKey: ["my-batches", faculty?.id],
    queryFn: () => myBatches(faculty!.id),
    enabled: Boolean(faculty?.id),
  });
  const { data: allTests = [] } = useQuery({ queryKey: ["tests"], queryFn: () => testsApi.list() });

  const { data: subjectMap } = useQuery({
    queryKey: ["my-subjects", faculty?.id],
    queryFn: () => mySubjectsByBatch(faculty!.id),
    enabled: Boolean(faculty?.id),
  });

  /** Only tests of the batches AND subjects this teacher is timetabled for. */
  const tests = useMemo(() => {
    const ids = new Set(myBatchList.map((b) => b.id));
    let list = ids.size ? allTests.filter((t) => t.batch_id && ids.has(t.batch_id)) : allTests;
    if (subjectMap?.size) {
      list = list.filter((t) => {
        const mine = t.batch_id ? subjectMap.get(t.batch_id) : null;
        if (!mine || !mine.size) return false;
        return t.subject ? mine.has(t.subject.trim().toLowerCase()) : true;
      });
    }
    return list;
  }, [allTests, myBatchList, subjectMap]);

  useEffect(() => {
    if (!testId && tests[0]) setTestId(tests[0].id);
  }, [tests, testId]);

  const test = tests.find((t) => t.id === testId);
  const { data: roster = [] } = useQuery({
    queryKey: ["teach-marks-roster", test?.batch_id],
    queryFn: () => batchesApi.roster(test!.batch_id!),
    enabled: Boolean(test?.batch_id),
  });
  const { data: results = [] } = useQuery({
    queryKey: ["test-results", testId],
    queryFn: () => testsApi.results(testId),
    enabled: Boolean(testId),
  });

  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    results.forEach((r) => {
      m[r.student_id] = r.marks?.toString() ?? "";
    });
    return m;
  }, [results]);
  const merged = { ...initial, ...marks };

  const save = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(merged)
        .filter(([, v]) => v !== "" && v != null)
        .map(([student_id, v]) => {
          const marksValue = Number(v);
          if (
            !Number.isFinite(marksValue) ||
            marksValue < 0 ||
            (test?.max_marks != null && marksValue > test.max_marks)
          ) {
            throw new Error(`Marks must be between 0 and ${test?.max_marks ?? "the maximum"}`);
          }
          return { test_id: testId, student_id, marks: marksValue };
        });
      if (!rows.length) return;
      const { error } = await supabase
        .from("test_results")
        .upsert(rows, { onConflict: "test_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marks saved");
      qc.invalidateQueries({ queryKey: ["test-results", testId] });
      setMarks({});
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Enter marks</h1>
        <NewTestDialog
          batches={myBatchList}
          subjectMap={subjectMap}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ["tests"] });
            setTestId(id);
            setMarks({});
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Select
          value={testId}
          onValueChange={(v) => {
            setTestId(v);
            setMarks({});
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-[280px]">
            <SelectValue placeholder="Select test" />
          </SelectTrigger>
          <SelectContent>
            {tests.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} · {examLabel(t.type)} · {t.date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="ml-auto gap-1.5"
          disabled={!testId || roster.length === 0 || save.isPending}
          onClick={() => save.mutate()}
        >
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>
      {test ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Max marks: {test.max_marks ?? "—"} · {roster.length} students
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {tests.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No tests created for your batches yet.
          </p>
        )}
        {roster.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.full_name}</p>
              <p className="text-xs text-muted-foreground">{s.admission_no}</p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              className="h-9 w-24"
              placeholder="—"
              value={merged[s.id] ?? ""}
              onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Teacher creates a test only for batch + subject they are timetabled for. */
function NewTestDialog({
  batches,
  subjectMap,
  onCreated,
}: {
  batches: { id: string; name: string }[];
  subjectMap?: Map<string, Set<string>>;
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<string>("ut1");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [max, setMax] = useState("40");

  const subjects = useMemo(
    () => Array.from(subjectMap?.get(batchId) ?? []).map(titleCase),
    [subjectMap, batchId],
  );
  useEffect(() => {
    if (subjects.length && !subjects.includes(subject)) setSubject(subjects[0]);
  }, [subjects, subject]);

  const create = useMutation({
    mutationFn: async () => {
      if (!batchId || !subject) throw new Error("Pick your batch and subject");
      const maxMarks = Number(max);
      if (!Number.isFinite(maxMarks) || maxMarks <= 0) throw new Error("Enter max marks");
      const label = EXAM_TYPES.find((t) => t.value === type)?.label ?? "Test";
      const t = await testsApi.create({
        title: title.trim() || `${label} — ${subject}`,
        type: type as TestInsert["type"],
        subject,
        batch_id: batchId,
        date,
        max_marks: maxMarks,
        status: "scheduled",
      });
      if (!t) throw new Error("Could not create test");
      return (t as { id: string }).id;
    },
    onSuccess: (id) => {
      toast.success("Test created — enter marks below");
      setOpen(false);
      setTitle("");
      onCreated(id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!batches.length}>
          <Plus className="h-4 w-4" /> New test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New test</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Your batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={setSubject} disabled={!subjects.length}>
              <SelectTrigger>
                <SelectValue placeholder={batchId ? "No subject assigned" : "Pick batch first"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Exam</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v);
                const t = EXAM_TYPES.find((x) => x.value === v);
                if (t) setMax(String(t.max));
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max marks</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto" />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
