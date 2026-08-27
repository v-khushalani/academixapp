import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdmin } from "@/lib/rbac";

export const Route = createFileRoute("/app/platform")({
  head: () => ({
    meta: [
      { title: "Platform Console — Academix" },
      {
        name: "description",
        content: "Internal Academix console for institute-wide oversight and support.",
      },
      { property: "og:title", content: "Platform Console — Academix" },
      { property: "og:description", content: "Internal console for Team Academix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformLayout,
});

const TABS = [
  { to: "/app/platform", label: "Overview", exact: true },
  { to: "/app/platform/institutes", label: "Institutes" },
  { to: "/app/platform/plans", label: "Plans & pricing" },
  { to: "/app/platform/features", label: "Features" },
];

function PlatformLayout() {
  const { roles, loading } = useAuth();
  const allowed = isSuperAdmin(roles);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  if (loading) return null;

  if (!allowed) {
    return (
      <PageBody>
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Page not found.
        </div>
      </PageBody>
    );
  }

  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      <PageHeader
        title="Academix platform console"
        description="Team Academix only — every institute on the network, their usage and plan control. Money stays with the institute."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Super admin
          </Badge>
        }
      />
      <PageBody>
        <nav className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active(t.to, t.exact)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </PageBody>
    </>
  );
}
