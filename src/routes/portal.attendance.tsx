import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { attendanceStats, portalApi } from "@/lib/api/portal";
import { usePortalStudent, StatTile, PortalCard } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Academix Portal" },
      {
        name: "description",
        content: "Month-by-month attendance record with every absent and late day listed.",
      },
      { property: "og:title", content: "Attendance — Academix Portal" },
      { property: "og:description", content: "Track present, absent and late days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalAttendance,
});

const STATUS_STYLE: Record<string, string> = {
  present: "bg-success/15 text-success",
  absent: "bg-destructive/15 text-destructive",
  late: "bg-warning/15 text-warning",
  excused: "bg-muted text-muted-foreground",
};

function PortalAttendance() {
  const { student } = usePortalStudent();
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-attendance", student?.id],
    queryFn: () => portalApi.attendance(student!.id),
    enabled: !!student,
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const stats = attendanceStats(data);
  const byMonth = new Map<string, typeof data>();
  data.forEach((r) => {
    const key = String(r.date).slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), r]);
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Overall"
          value={`${stats.pct}%`}
          tone={stats.pct >= 75 ? "success" : "warning"}
        />
        <StatTile label="Present" value={String(stats.present)} tone="success" />
        <StatTile label="Absent" value={String(stats.absent)} tone="warning" />
        <StatTile label="Late" value={String(stats.late)} />
      </div>

      {data.length === 0 ? (
        <PortalCard title="Daily record">
          <p className="text-sm text-muted-foreground">No attendance marked yet.</p>
        </PortalCard>
      ) : (
        [...byMonth.entries()].map(([month, rows]) => (
          <PortalCard
            key={month}
            title={new Date(month + "-01").toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          >
            <div className="flex flex-wrap gap-1.5">
              {rows.map((r) => (
                <span
                  key={r.id}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    STATUS_STYLE[r.status] ?? "bg-muted"
                  }`}
                  title={r.remarks ?? r.status}
                >
                  {String(r.date).slice(8)} · {r.status.slice(0, 3).toUpperCase()}
                </span>
              ))}
            </div>
          </PortalCard>
        ))
      )}
    </div>
  );
}
