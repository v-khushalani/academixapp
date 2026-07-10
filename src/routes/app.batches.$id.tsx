import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { batchesApi } from "@/lib/api";

export const Route = createFileRoute("/app/batches/$id")({
  component: BatchDetail,
});

function BatchDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: batch, isLoading } = useQuery({
    queryKey: ["batch", id],
    queryFn: () => batchesApi.get(id),
  });
  const { data: roster = [] } = useQuery({
    queryKey: ["batch-roster", id],
    queryFn: () => batchesApi.roster(id),
    enabled: Boolean(batch),
  });

  if (isLoading)
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageBody>
    );
  if (!batch)
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Batch not found.</p>
        <Button variant="link" onClick={() => navigate({ to: "/app/batches" })}>
          Back to batches
        </Button>
      </PageBody>
    );

  return (
    <>
      <PageHeader
        title={batch.name}
        description={`${batch.schedule ?? "No schedule"} · ${batch.room ?? "No room"}`}
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/app/batches">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Enrolled" value={`${roster.length}/${batch.capacity}`} />
          <Stat label="Status" value={batch.status} />
          <Stat label="Starts" value={batch.start_date ?? "—"} />
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold">Roster</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Admission #</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roster.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No students in this batch yet.
                  </td>
                </tr>
              )}
              {roster.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/app/students/$id"
                      params={{ id: s.id }}
                      className="font-medium hover:text-primary"
                    >
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.admission_no}</td>
                  <td className="px-4 py-3">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}
