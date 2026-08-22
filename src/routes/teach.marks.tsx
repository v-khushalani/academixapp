import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { myBatches, myFaculty } from "@/lib/api/teach";
import { batchesApi, testsApi } from "@/lib/api";
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

  const tests = useMemo(() => {
    const ids = new Set(myBatchList.map((b) => b.id));
    return ids.size ? allTests.filter((t) => t.batch_id && ids.has(t.batch_id)) : allTests;
  }, [allTests, myBatchList]);

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
        .map(([student_id, v]) => ({ test_id: testId, student_id, marks: Number(v) }));
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
      <h1 className="text-xl font-semibold">Enter marks</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={testId} onValueChange={setTestId}>
          <SelectTrigger className="h-9 w-full sm:w-[240px]">
            <SelectValue placeholder="Select test" />
          </SelectTrigger>
          <SelectContent>
            {tests.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} · {t.date}
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
