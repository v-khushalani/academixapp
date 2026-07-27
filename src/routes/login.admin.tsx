import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/login-card";

export const Route = createFileRoute("/login/admin")({
  head: () => ({
    meta: [
      { title: "Staff & Admin Login — Academix" },
      {
        name: "description",
        content:
          "Sign in to the Academix institute console to manage students, batches, fees and reports.",
      },
      { property: "og:title", content: "Staff & Admin Login — Academix" },
      {
        property: "og:description",
        content: "Institute console login for owners, admins and office staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  return (
    <LoginCard
      kind="admin"
      title="Institute console"
      subtitle="For owners, admins, reception, counsellors and accounts."
      aside={
        <>
          <p className="text-sm font-medium uppercase tracking-widest opacity-70">
            Academix · Institute OS
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">
            One dashboard for the entire institute.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Students, admissions, batches, attendance, fees and tests — one calm, fast workspace.
          </p>
        </>
      }
      footer={
        <p>
          First time?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create the owner account
          </Link>
        </p>
      }
    />
  );
}