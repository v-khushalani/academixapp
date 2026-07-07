import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testsApi, batchesApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/tests/$id")({
  component: TestDetail,
});

function TestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("test:write", roles);

  const { data: test, isLoading } = useQuery({ queryKey: ["test", id], queryFn: () => testsApi.get(id) });
  const { data: results = [] } = useQuery({ queryKey: ["test-results", id], queryFn: () => testsApi.results(id) });
  const { data: roster = [] } = useQuery({
    queryKey: ["test-roster", test?.batch_id],
    queryFn: () => test?.batch_id ? batchesApi.roster(test.batch_id) : Promise.resolve([]),
    enabled: Boolean(test),
  });

  const [marks, setMarks] = useState<Record<string, string>>({});

  const initialised = useMemo(() => {
    const m: Record<string, string> = {};
    results.forEach((r) => { m[r.student_id] = r.marks?.toString() ?? ""; });
    return m;
  }, [results]);

  const merged = { ...initialised, ...marks };

  const saveMut = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(merged)
        .filter(([, v]) => v !== "" && v != null)
        .map(([student_id, v]) => ({ test_id: id, student_id, marks: Number(v) }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("test_results").upsert(rows, { onConflict: "test_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Results saved");
      qc.invalidateQueries({ queryKey: ["test-results", id] });
      setMarks({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageBody><p className="text-sm text-muted-foreground">Loading…</p></PageBody>;
  if (!test) return (
    <PageBody>
      <p className="text-sm text-muted-foreground">Test not found.</p>
      <Button variant="link" onClick={() => navigate({ to: "/app/tests" })}>Back</Button>
    </PageBody>
  );

  const avg = results.length > 0
    ? (results.reduce((s, r) => s + Number(r.marks ?? 0), 0) / results.length).toFixed(1)
    : "—";

  return (
    <>
      <PageHeader
        title={test.title}
        description={`${test.subject ?? "—"} · ${test.batch?.name ?? "All batches"} · ${test.date} · Max ${test.max_marks}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5"><Link to="/app/tests"><ArrowLeft className="h-4 w-4" />Back</Link></Button>
            {canWrite && <Button size="sm" className="gap-1.5" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="h-4 w-4" />Save marks</Button>}
          </>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Attempted" value={String(results.length)} />
          <Stat label="Average" value={String(avg)} />
          <Stat label="Max marks" value={String(test.max_marks)} />
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Marks</h3></div>
          {roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {test.batch_id ? "No students in this batch." : "Assign this test to a batch to enter marks."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Admission #</th><th className="px-4 py-3 w-40">Marks / {test.max_marks}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.admission_no}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number" min={0} max={test.max_marks} className="h-8"
                        value={merged[s.id] ?? ""}
                        disabled={!canWrite}
                        onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageBody>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}