import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/login-card";

export const Route = createFileRoute("/login/student")({
  head: () => ({
    meta: [
      { title: "Student & Parent Login — Academix" },
      {
        name: "description",
        content:
          "Students and parents sign in to track attendance, test scores, fees, timetable and homework.",
      },
      { property: "og:title", content: "Student & Parent Login — Academix" },
      {
        property: "og:description",
        content: "Attendance, marks, fees and timetable — all in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LoginCard
      kind="family"
      title="Student & parent login"
      subtitle="Track attendance, test scores, fees, timetable and homework."
      hint="Your login ID and password were shared by the institute on WhatsApp."
      aside={
        <>
          <p className="text-sm font-medium uppercase tracking-widest opacity-70">
            Academix · Family
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">
            Know exactly how your child is doing.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Attendance, every test score, fee dues and the week&apos;s timetable — updated by the
            institute, visible to you the moment it changes.
          </p>
        </>
      }
    />
  ),
});