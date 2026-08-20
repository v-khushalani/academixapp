import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/login-card";

export const Route = createFileRoute("/login/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Login — Academix" },
      {
        name: "description",
        content: "Teachers sign in to mark attendance and enter test marks for their batches.",
      },
      { property: "og:title", content: "Teacher Login — Academix" },
      {
        property: "og:description",
        content: "Mark attendance and enter marks in seconds from any phone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LoginCard
      kind="teacher"
      title="Teacher sign in"
      subtitle="Mark attendance and enter test marks for your batches."
      hint="Use the email your institute registered for you."
      aside={
        <>
          <p className="text-sm font-medium uppercase tracking-widest opacity-70">
            Academix · Teacher
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">
            Attendance in under a minute.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Your batches, your students, your marks — nothing else to distract you.
          </p>
        </>
      }
    />
  ),
});