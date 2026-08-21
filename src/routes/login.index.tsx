import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/login-card";

export const Route = createFileRoute("/login/")({
  head: () => ({
    meta: [
      { title: "Sign in — Academix" },
      {
        name: "description",
        content:
          "One Academix login for institute staff, teachers, students and parents. Sign in and land on your own dashboard.",
      },
      { property: "og:title", content: "Sign in — Academix" },
      {
        property: "og:description",
        content: "One login, every role. Academix takes you to the right dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginCard,
});
