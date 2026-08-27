import { createFileRoute, Link } from "@tanstack/react-router";
import { Stat } from "@/components/app/platform/institute-detail";
import { usePlatformInstitutes } from "@/components/app/platform/shared";
import { planFor } from "@/lib/plans";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/platform/")({
  component: PlatformOverview,
});

function PlatformOverview() {
  const { data: institutes = [], isLoading } = usePlatformInstitutes();

  const totals = institutes.reduce(
    (a, i) => ({
      students: a.students + Number(i.students),
      faculty: a.faculty + Number(i.faculty),
      batches: a.batches + Number(i.batches),
    }),
    { students: 0, faculty: 0, batches: 0 },
  );

  const byPlan = institutes.reduce<Record<string, number>>((a, i) => {
    const key = planFor(i.plan).name;
    a[key] = (a[key] ?? 0) + 1;
    return a;
  }, {});

  const suspended = institutes.filter((i) => i.status && i.status !== "active");
  const nearLimit = institutes.filter(
    (i) => i.student_limit > 0 && Number(i.students) / i.student_limit >= 0.8,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Institutes" value={institutes.length} />
        <Stat label="Students" value={totals.students} />
        <Stat label="Teachers" value={totals.faculty} />
        <Stat label="Batches" value={totals.batches} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Plan mix
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(byPlan).map(([name, n]) => (
              <li key={name} className="flex justify-between">
                <span>{name}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
            {institutes.length === 0 && (
              <li className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No institutes yet."}
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Close to their limit
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {nearLimit.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="truncate">{i.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {Number(i.students)}/{i.student_limit}
                </span>
              </li>
            ))}
            {nearLimit.length === 0 && (
              <li className="text-xs text-muted-foreground">Everyone has room.</li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Needs attention
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {suspended.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="truncate">{i.name}</span>
                <span className="shrink-0 text-destructive">{i.status}</span>
              </li>
            ))}
            {suspended.length === 0 && (
              <li className="text-xs text-muted-foreground">No suspended accounts.</li>
            )}
          </ul>
        </div>
      </div>

      <Button asChild size="sm" variant="outline">
        <Link to="/app/platform/institutes">Open institutes</Link>
      </Button>
    </div>
  );
}
