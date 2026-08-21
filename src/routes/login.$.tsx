import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Academix has one sign-in page. Any stray old portal link (/login/admin,
 * /login/teacher, /login/student, /login/platform, printed QR codes…) lands
 * on the single /login instead of dead-ending.
 */
export const Route = createFileRoute("/login/$")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});
