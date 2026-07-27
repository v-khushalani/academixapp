import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, ShieldCheck, Users } from "lucide-react";

export const PORTALS = [
  {
    to: "/login/student" as const,
    icon: Users,
    name: "Student & Parent",
    who: "For families",
    desc: "Attendance, marks, fees and timetable of your child.",
    id: "Login ID printed on the slip from the institute office",
  },
  {
    to: "/login/teacher" as const,
    icon: GraduationCap,
    name: "Teacher",
    who: "For faculty",
    desc: "Today's classes, one-tap attendance and marks entry.",
    id: "The email your institute registered for you",
  },
  {
    to: "/login/admin" as const,
    icon: ShieldCheck,
    name: "Institute Admin",
    who: "For office & owners",
    desc: "Admissions, students, batches, fees, reports — everything.",
    id: "Your staff email",
  },
];

export function PortalPicker({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PORTALS.map((p) => (
        <Link
          key={p.to}
          to={p.to}
          className="group relative flex flex-col rounded-xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <p.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.who}</p>
              <p className="text-base font-semibold leading-tight">{p.name}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
          {!compact && (
            <p className="mt-3 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              {p.id}
            </p>
          )}
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Sign in <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}