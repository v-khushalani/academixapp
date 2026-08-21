import { createFileRoute, redirect } from "@tanstack/react-router";

// Salaries now live inside Expenses (category: Salary). Old bookmarks keep working.
export const Route = createFileRoute("/app/salaries")({
  beforeLoad: () => {
    throw redirect({ to: "/app/expenses" });
  },
});
