import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalPicker } from "@/components/marketing/portal-picker";

export const Route = createFileRoute("/login/")({
  head: () => ({
    meta: [
      { title: "Sign in — Academix" },
      {
        name: "description",
        content:
          "Pick your Academix portal: student & parent, teacher, or institute admin, then sign in.",
      },
      { property: "og:title", content: "Sign in — Academix" },
      {
        property: "og:description",
        content: "Three portals, one platform. Choose yours and sign in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginChooser,
});

function LoginChooser() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <div className="w-full max-w-4xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            Ax
          </span>
          <span className="text-sm font-semibold">Academix</span>
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Which login do you need?</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Academix has three separate portals so everyone sees only what matters to them. Pick
          yours — if you land on the wrong one, we will point you to the right door.
        </p>
        <div className="mt-8">
          <PortalPicker />
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Running an institute and new here?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create your institute workspace
          </Link>
        </p>
      </div>
    </div>
  );
}