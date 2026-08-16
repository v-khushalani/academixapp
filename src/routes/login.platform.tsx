import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/login-card";

export const Route = createFileRoute("/login/platform")({
  head: () => ({
    meta: [
      { title: "Platform Console Login — Academix" },
      {
        name: "description",
        content:
          "Academix platform owners sign in here to manage institutes, plans and pricing across the network.",
      },
      { property: "og:title", content: "Platform Console Login — Academix" },
      {
        property: "og:description",
        content: "Super-admin access to the Academix platform console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformLogin,
});

function PlatformLogin() {
  return (
    <LoginCard
      kind="platform"
      title="Academix platform console"
      subtitle="Super-admin access only — institutes, plans and pricing."
      aside={
        <>
          <p className="text-sm font-medium uppercase tracking-widest opacity-70">
            Academix · Platform
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">
            Run the whole network from one console.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Every institute, every plan, every price — controlled centrally.
          </p>
        </>
      }
      footer={
        <p>
          Institute staff?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Use the standard login
          </Link>
        </p>
      }
    />
  );
}
