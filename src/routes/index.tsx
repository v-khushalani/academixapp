import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPicker } from "@/components/marketing/portal-picker";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PostAuthGate } from "@/components/auth/post-auth-gate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Academix — Best Coaching Institute ERP & School LMS Software India" },
      {
        name: "description",
        content:
          "Academix is India's leading coaching institute ERP and school LMS. Manage admissions with QR, automate fee collections, track syllabus progress, and provide parent portals. All-in-one institute management software.",
      },
      { property: "og:title", content: "Academix — Best Coaching Institute ERP & School LMS Software India" },
      {
        property: "og:description",
        content:
          "Transform your academy with the most advanced ERP for coaching centers and schools. Featuring QR admissions, automated WhatsApp fee receipts, syllabus tracking, and dedicated portals for parents and teachers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "keywords", content: "coaching institute management software, best school erp india, institute lms software, academy management erp, fee management software for coaching, student attendance management app, syllabus tracker for teachers, multi-tenant school software, coaching portal software" },
      { name: "author", content: "Academix Team" },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "Academix" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PostAuthGate>
    <MarketingShell>
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
              <Link to="/for-institutes">See the features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Portal picker — the thing users get lost in */}
      <section>
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
          <p className="mt-5 text-xs text-muted-foreground">
            Students and teachers do not create their own accounts — your institute sends the login
            link.
          </p>
        </div>
      </section>
    </MarketingShell>
    </PostAuthGate>
  );
}
