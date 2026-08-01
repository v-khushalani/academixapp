import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPicker } from "@/components/marketing/portal-picker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Academix — Institute ERP for Coaching Centres" },
      {
        name: "description",
        content:
          "Admissions by QR, attendance, fees with UPI, tests and timetable — plus separate portals for admin, teachers and parents. Built for coaching institutes.",
      },
      { property: "og:title", content: "Academix — Institute ERP for Coaching Centres" },
      {
        property: "og:description",
        content:
          "Run admissions, attendance, fees, tests and timetable in one place. Separate logins for admin, teachers and families.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              Ax
            </span>
            <span className="text-base font-semibold tracking-tight">Academix</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/for-institutes"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Built for coaching institutes. By people who run one.
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Your whole institute, from the enquiry desk to the parent&rsquo;s phone.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Academix replaces the register, the fee diary and the WhatsApp chaos with one system —
            and gives your office, your teachers and your parents each their own view of it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link to="/signup">
                Create your institute <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/for-institutes">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Portal picker — the thing users get lost in */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Already using Academix? Start here.
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Three portals, one platform. Pick the one that describes you.
              </p>
            </div>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Not sure which one?
            </Link>
          </div>
          <div className="mt-7">
            <PortalPicker />
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Academix</span>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/for-institutes" className="hover:text-foreground">
              How it works
            </Link>
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
