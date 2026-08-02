import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { portalApi } from "@/lib/api/portal";
import { usePortalStudent, StatTile, PortalCard } from "@/components/portal/portal-shell";
import { syllabusApi } from "@/lib/api/syllabus";
import { SyllabusBars } from "@/components/app/syllabus-bar";

export const Route = createFileRoute("/portal/progress")({
  head: () => ({
    meta: [
      { title: "Test Scores & Progress — Academix Portal" },
      {
        name: "description",
        content: "Every test score with percentage trend over time, subject by subject.",
      },
      { property: "og:title", content: "Test Scores & Progress — Academix Portal" },
      { property: "og:description", content: "Marks, percentages and the trend across tests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalProgress,
});

function PortalProgress() {
  const { student } = usePortalStudent();
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-results", student?.id],
    queryFn: () => portalApi.results(student!.id),
    enabled: !!student,
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["syllabus", student?.batch_id],
    queryFn: () => syllabusApi.chapters(student!.batch_id!),
    enabled: Boolean(student?.batch_id),
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const points = data
    .filter((r) => r.test && r.marks != null)
    .map((r) => ({
      name: r.test!.title,
      date: r.test!.date,
      pct: Math.round((Number(r.marks) / Number(r.test!.max_marks || 1)) * 100),
    }));

  const avg =
    points.length === 0
      ? 0
      : Math.round(points.reduce((s, p) => s + p.pct, 0) / points.length);
  const best = points.reduce((m, p) => Math.max(m, p.pct), 0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Progress</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Tests" value={String(points.length)} />
        <StatTile label="Average" value={`${avg}%`} tone={avg >= 60 ? "success" : "warning"} />
        <StatTile label="Best" value={`${best}%`} tone="success" />
      </div>

      <PortalCard title="Score trend">
        {points.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            At least two test results are needed to draw a trend.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </PortalCard>

      <PortalCard title="All results">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results published yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...data].reverse().map((r) => {
              const pct = r.test
                ? Math.round((Number(r.marks ?? 0) / Number(r.test.max_marks || 1)) * 100)
                : 0;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.test?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.test?.subject ?? "—"} · {r.test?.date}
                      {r.remarks ? ` · ${r.remarks}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">
                      {r.marks ?? "—"}/{r.test?.max_marks}
                    </p>
                    <p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PortalCard>
    </div>
  );
}