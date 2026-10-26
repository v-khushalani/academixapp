import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, Save, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { testsApi, batchesApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { examLabel } from "@/lib/exam-types";
import { formatDate } from "@/lib/dates";

export const Route = createFileRoute("/app/tests_/$id")({
  head: () => ({
    meta: [
      { title: "Test marks · Academix" },
      { name: "description", content: "Enter, review and close marks for a test." },
      { property: "og:title", content: "Test marks · Academix" },
      { property: "og:description", content: "Enter, review and close marks for a test." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestDetail,
});

function TestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("test:write", roles);
  const isAdmin = roles.includes("owner") || roles.includes("admin");
  const [confirmLock, setConfirmLock] = useState(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ["test", id],
    queryFn: () => testsApi.get(id),
  });
  const { data: results = [] } = useQuery({
    queryKey: ["test-results", id],
    queryFn: () => testsApi.results(id),
  });
  const { data: roster = [] } = useQuery({
    queryKey: ["test-roster", test?.batch_id],
    queryFn: () => (test?.batch_id ? batchesApi.roster(test.batch_id) : Promise.resolve([])),
    enabled: Boolean(test),
  });

  const [marks, setMarks] = useState<Record<string, string>>({});
  const initialised = useMemo(() => {
    const m: Record<string, string> = {};
    results.forEach((r) => {
      m[r.student_id] = r.marks?.toString() ?? "";
    });
    return m;
  }, [results]);
  const merged = { ...initialised, ...marks };
  const locked = Boolean((test as { locked_at?: string | null } | null)?.locked_at);
  const editable = canWrite && !locked;

  // Rank = position among saved marks (ties share a rank)
  const rankOf = useMemo(() => {
    const saved = results.filter((r) => r.marks != null).map((r) => Number(r.marks));
    return (v: number) => saved.filter((x) => x > v).length + 1;
  }, [results]);
  const top3 = results.filter((r) => r.marks != null).slice(0, 3);

  const saveMut = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(merged)
        .filter(([, v]) => v !== "" && v != null)
        .map(([student_id, v]) => ({ test_id: id, student_id, marks: Number(v) }));
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("test_results")
        .upsert(rows, { onConflict: "test_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marks saved");
      qc.invalidateQueries({ queryKey: ["test-results", id] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      setMarks({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lockMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tests")
        .update({ locked_at: new Date().toISOString(), status: "completed" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marks closed");
      qc.invalidateQueries({ queryKey: ["test", id] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      setConfirmLock(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageBody>
    );
  if (!test)
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Test not found.</p>
        <Button variant="link" onClick={() => navigate({ to: "/app/tests" })}>
          Back
        </Button>
      </PageBody>
    );

  const scoredCount = results.filter((r) => r.marks != null).length;
  const avg =
    scoredCount > 0
      ? (results.reduce((s, r) => s + Number(r.marks ?? 0), 0) / scoredCount).toFixed(1)
      : "—";

  return (
    <>
      <PageHeader
        title={test.title}
        description={`${test.subject ?? "—"} · ${examLabel(test.type)} · ${test.batch?.name ?? "All batches"} · ${formatDate(test.date)} · Max ${test.max_marks}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/app/tests">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            {locked ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Closed
              </Badge>
            ) : (
              <>
                {isAdmin && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConfirmLock(true)}>
                    <Lock className="h-4 w-4" />
                    Close marks
                  </Button>
                )}
                {canWrite && (
                  <Button size="sm" className="gap-1.5" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                    <Save className="h-4 w-4" />
                    Save marks
                  </Button>
                )}
              </>
            )}
          </>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Marks entered" value={`${scoredCount}/${roster.length}`} />
          <Stat label="Average" value={String(avg)} />
          <Stat label="Max marks" value={String(test.max_marks)} />
        </div>

        {top3.length > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-primary" /> Top 3
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {top3.map((r) => (
                <div key={r.id} className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Rank {rankOf(Number(r.marks))}</p>
                  <p className="font-medium">{r.student?.full_name}</p>
                  <p className="text-sm">
                    {r.marks}/{test.max_marks} · {((Number(r.marks) / test.max_marks) * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold">Student scores</h3>
          </div>
          {roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {test.batch_id ? "No students in this batch." : "Assign this test to a batch to enter marks."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Admission #</th>
                  <th className="w-36 px-4 py-3">Marks / {test.max_marks}</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3 text-right">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((s) => {
                  const saved = results.find((r) => r.student_id === s.id)?.marks;
                  const has = saved != null;
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium">{s.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.admission_no}</td>
                      <td className="px-4 py-3">
                        {editable ? (
                          <Input
                            type="number"
                            min={0}
                            max={test.max_marks}
                            className="h-8"
                            placeholder="Not entered"
                            value={merged[s.id] ?? ""}
                            onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                          />
                        ) : (
                          <span>{has ? saved : <span className="text-muted-foreground">Not entered</span>}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {has ? `${((Number(saved) / test.max_marks) * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{has ? rankOf(Number(saved)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </PageBody>
      <ConfirmDialog
        open={confirmLock}
        onOpenChange={setConfirmLock}
        title="Close marks for this test?"
        description="After closing, no one can change marks, edit or delete this test."
        confirmLabel="Close marks"
        onConfirm={() => lockMut.mutate()}
      />
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
