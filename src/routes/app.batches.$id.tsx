import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRightLeft, Archive, Merge } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { batchList, students } from "@/lib/mock/data";

export const Route = createFileRoute("/app/batches/$id")({
  loader: ({ params }) => {
    const batch = batchList.find((b) => b.id === params.id);
    if (!batch) throw notFound();
    return { batch };
  },
  errorComponent: () => <Fallback />,
  notFoundComponent: () => <Fallback />,
  component: BatchDetail,
});

function Fallback() { return <PageBody><p className="text-sm text-muted-foreground">Batch not found.</p></PageBody>; }

function BatchDetail() {
  const { batch } = Route.useLoaderData();
  const roster = students.filter((s) => s.batch === batch.name).slice(0, 20);
  return (
    <>
      <PageHeader
        title={batch.name}
        description={`${batch.faculty} · ${batch.timing} · ${batch.classroom}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5"><Link to="/app/batches"><ArrowLeft className="h-4 w-4" />Back</Link></Button>
            <Button variant="outline" size="sm" className="gap-1.5"><ArrowRightLeft className="h-4 w-4" />Shift students</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Merge className="h-4 w-4" />Merge</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive"><Archive className="h-4 w-4" />Archive</Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Strength" value={`${batch.strength}/${batch.capacity}`} />
          <Stat label="Attendance %" value={`${batch.attendancePct}%`} />
          <Stat label="Subjects" value={batch.subjects.join(", ")} />
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Roster</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Admission #</th><th className="px-4 py-3">Attendance</th><th className="px-4 py-3">Pending</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roster.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link to="/app/students/$id" params={{ id: s.id }} className="font-medium hover:text-primary">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.admissionNo}</td>
                  <td className="px-4 py-3">{s.attendancePct}%</td>
                  <td className="px-4 py-3">{s.pendingFees ? `₹${s.pendingFees.toLocaleString("en-IN")}` : "—"}</td>
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
      <p className="mt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}