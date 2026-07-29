import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { portalApi } from "@/lib/api/portal";
import { usePortalStudent, PortalCard } from "@/components/portal/portal-shell";
import { formatTime12 } from "@/lib/time";

export const Route = createFileRoute("/portal/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Academix Portal" },
      {
        name: "description",
        content: "Weekly class schedule with subject, teacher, room and timing.",
      },
      { property: "og:title", content: "Timetable — Academix Portal" },
      { property: "og:description", content: "The week's classes for your batch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalTimetable,
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function PortalTimetable() {
  const { student } = usePortalStudent();
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-timetable", student?.batch_id],
    queryFn: () => portalApi.timetable(student?.batch_id ?? null),
    enabled: !!student,
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const today = new Date().getDay();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Timetable</h1>
        <p className="text-sm text-muted-foreground">{student.batch?.name ?? "No batch"}</p>
      </div>

      {data.length === 0 ? (
        <PortalCard title="This week">
          <p className="text-sm text-muted-foreground">No timetable published for your batch.</p>
        </PortalCard>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day, idx) => {
            const slots = data.filter((s) => s.day_of_week === idx);
            if (slots.length === 0) return null;
            return (
              <PortalCard
                key={day}
                title={day}
                action={
                  idx === today ? (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Today
                    </span>
                  ) : null
                }
              >
                <ul className="divide-y divide-border">
                  {slots.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.subject ?? "Class"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.faculty?.full_name ?? "—"}
                          {s.room ? ` · Room ${s.room}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
                        {formatTime12(s.start_time)} – {formatTime12(s.end_time)}
                      </span>
                    </li>
                  ))}
                </ul>
              </PortalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}