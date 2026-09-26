import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { portalApi } from "@/lib/api/portal";
import { usePortalStudent, PortalCard } from "@/components/portal/portal-shell";
import { formatTime12 } from "@/lib/time";
import { formatDate } from "@/lib/dates";


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
    queryKey: ["portal-timetable", student?.id],
    queryFn: () => portalApi.timetable(student?.id ?? null),
    enabled: !!student,
  });
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
  const { data: changes = [] } = useQuery({
    queryKey: ["portal-day-changes", student?.id, from, to],
    queryFn: () => portalApi.dayChanges(student?.id ?? null, from, to),
    enabled: !!student,
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const today = new Date().getDay();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Timetable</h1>
        <p className="text-sm text-muted-foreground">
          {Array.from(new Set(data.map((s) => s.batch?.name).filter(Boolean))).join(" · ") ||
            "No batch"}
        </p>
      </div>

      {changes.length > 0 && (
        <PortalCard title="Changes coming up">
          <ul className="divide-y divide-border">
            {changes.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {c.subject || c.slot?.subject || "Class"}
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        c.kind === "cancelled"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {c.kind === "cancelled"
                        ? "Cancelled"
                        : c.kind === "extra"
                          ? "Extra class"
                          : "Time changed"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(c.date)}
                    {c.start_time ? ` · ${formatTime12(c.start_time)}` : ""}
                    {c.end_time ? ` – ${formatTime12(c.end_time)}` : ""}
                    {c.room_ref?.name ? ` · ${c.room_ref.name}` : ""}
                  </p>
                  {c.note && <p className="mt-0.5 text-xs">{c.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </PortalCard>
      )}


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
                          {(s as { room_ref?: { name?: string } | null }).room_ref?.name
                            ? ` · ${(s as { room_ref?: { name?: string } | null }).room_ref!.name}`
                            : s.room
                              ? ` · ${s.room}`
                              : ""}
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
