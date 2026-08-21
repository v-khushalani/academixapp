import { createFileRoute, redirect } from "@tanstack/react-router";

// Academix now has a single sign-in. Old portal URLs keep working.
export const Route = createFileRoute("/login/platform")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
