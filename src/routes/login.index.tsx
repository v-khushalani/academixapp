import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/login-card";

export const Route = createFileRoute("/login/")({
  head: () => ({
    meta: [
      { title: "Sign in — Academix" },
      {
        name: "description",
        content: "Sign in to your Academix workspace.",
      },
      { property: "og:title", content: "Sign in — Academix" },
      { property: "og:description", content: "Sign in to Academix to manage your institute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnifiedLogin,
});

function UnifiedLogin() {
  return (
    <LoginCard
      kind="unified"
      title="Sign in to Academix"
      subtitle="Enter your credentials to access your portal."
      aside={
        <>
          <p className="text-sm font-medium uppercase tracking-widest opacity-70">
            Academix · One Platform
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">
            Your entire institute, in one place.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Whether you are an owner, a teacher, or a student — sign in here to get to your dashboard.
          </p>
        </>
      }
      footer={
        <p>
          Running an institute and new here?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create your institute
          </Link>
        </p>
      }
    />
  );
}