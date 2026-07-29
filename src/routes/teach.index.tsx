import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { myFaculty, mySlots } from "@/lib/api/teach";

export const Route = createFileRoute("/teach/")({
  head: () => ({
    meta: [
      { title: "Today's Classes — Teacher Portal" },
      { name: "description", content: "Your classes for today, attendance and marks in one tap." },
      { property: "og:title", content: "Today's Classes — Teacher Portal" },
      { property: "og:description", content: "Mark attendance and enter marks from your phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachHome,
});

function TeachHome() {
  const { user } = useAuth();
  const { data: faculty } = useQuery({
    queryKey: ["my-faculty", user?.id],
    queryFn: () => myFaculty(user?.id, user?.email),
    enabled: Boolean(user),
  });
  const day = new Date().getDay();
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["my-slots", faculty?.id, day],
    queryFn: () => mySlots(faculty!.id, day),
    enabled: Boolean(faculty?.id),
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold">
        {faculty ? `Hello, ${faculty.full_name.split(" ")[0]}` : "Hello"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/teach/attendance"
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm font-medium hover:bg-muted"
        >
          <CalendarCheck className="h-5 w-5 text-primary" /> Mark attendance
        </Link>
        <Link
          to="/teach/marks"
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm font-medium hover:bg-muted"
        >
          <ClipboardList className="h-5 w-5 text-primary" /> Enter marks
        </Link>
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Today's classes
      </h2>
      <div className="mt-2 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !faculty && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Your teacher record isn't linked to this login yet. Ask the office to add your email to
            the Faculty list.
          </p>
        )}
        {!isLoading && faculty && slots.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No classes scheduled for you today.
          </p>
        )}
        {slots.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex w-24 shrink-0 flex-col text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Clock className="h-3 w-3" />
                {formatTime12(s.start_time)}
              </span>
              <span>{formatTime12(s.end_time)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.subject ?? "Class"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {(s as { batch?: { name?: string } }).batch?.name ?? "—"}
                {s.room ? ` · Room ${s.room}` : ""}
              </p>
            </div>
            <Link
              to="/teach/attendance"
              search={{ batch: s.batch_id ?? undefined }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Attendance
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
