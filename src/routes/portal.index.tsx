import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { attendanceStats, feeStats, portalApi } from "@/lib/api/portal";
import { usePortalStudent, StatTile, PortalCard } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "My Progress — Academix Portal" },
      {
        name: "description",
        content: "Attendance, latest test score, fee dues and today's classes at a glance.",
      },
      { property: "og:title", content: "My Progress — Academix Portal" },
      {
        property: "og:description",
        content: "A student's attendance, marks and fees in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalHome,
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function PortalHome() {
  const { student, isLoading } = usePortalStudent();
  const id = student?.id;

  const attendance = useQuery({
    queryKey: ["portal-attendance", id],
    queryFn: () => portalApi.attendance(id!),
    enabled: !!id,
  });
  const results = useQuery({
    queryKey: ["portal-results", id],
    queryFn: () => portalApi.results(id!),
    enabled: !!id,
  });
  const fees = useQuery({
    queryKey: ["portal-fees", id],
    queryFn: () => portalApi.fees(id!),
    enabled: !!id,
  });
  const slots = useQuery({
    queryKey: ["portal-timetable", student?.batch_id],
    queryFn: () => portalApi.timetable(student?.batch_id ?? null),
    enabled: !!student,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!student)
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-medium">No student linked to this login yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Please contact the institute office so they can link your account.
        </p>
      </div>
    );

  const att = attendanceStats(attendance.data ?? []);
  const fee = feeStats(fees.data ?? []);
  const rows = results.data ?? [];
  const last = rows[rows.length - 1];
  const todayIdx = new Date().getDay();
  const today = (slots.data ?? []).filter((s) => s.day_of_week === todayIdx);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{student.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {student.batch?.name ?? "No batch assigned"} · {student.class ?? "—"} ·{" "}
          {student.admission_no}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Attendance"
          value={`${att.pct}%`}
          sub={`${att.present + att.late}/${att.total} classes`}
          tone={att.pct >= 75 ? "success" : "warning"}
        />
        <StatTile
          label="Last test"
          value={
            last?.test ? `${last.marks ?? "—"}/${last.test.max_marks}` : "—"
          }
          sub={last?.test?.title ?? "No tests yet"}
        />
        <StatTile
          label="Fees due"
          value={inr(fee.due)}
          sub={`${inr(fee.paid)} paid of ${inr(fee.billed)}`}
          tone={fee.due > 0 ? "warning" : "success"}
        />
        <StatTile label="Classes today" value={String(today.length)} sub={DAYS[todayIdx]} />
      </div>

      <PortalCard
        title={`Today · ${DAYS[todayIdx]}`}
        action={
          <Link to="/portal/timetable" className="text-xs text-primary hover:underline">
            Full week
          </Link>
        }
      >
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {today.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{s.subject ?? "Class"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.faculty?.full_name ?? "—"}
                    {s.room ? ` · Room ${s.room}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>

      <PortalCard
        title="Recent tests"
        action={
          <Link to="/portal/progress" className="text-xs text-primary hover:underline">
            See progress
          </Link>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test results published yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows
              .slice(-4)
              .reverse()
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{r.test?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.test?.subject ?? "—"} · {r.test?.date}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">
                    {r.marks ?? "—"}/{r.test?.max_marks}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </PortalCard>
    </div>
  );
}