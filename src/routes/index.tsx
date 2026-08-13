import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-card pt-16 pb-20 sm:pt-24 sm:pb-32">
          {/* Brand Identity Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-[0.03] pointer-events-none overflow-hidden">
            <span className="absolute -top-20 -left-20 text-[40rem] font-bold select-none text-primary">Ax</span>
          </div>

          <div className="relative mx-auto max-w-6xl px-5 text-center sm:px-6">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
              #1 ERP for Modern Institutes
            </div>
            
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Academix: Run your institute like a <span className="text-primary italic">Pro</span>.
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Consolidate admissions, fee management, attendance, and syllabus tracking into one powerful platform. 
              Give your teachers, students, and parents the portal they deserve.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl" className="h-14 px-8 text-base shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Link to="/signup">
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="h-14 px-8 text-base bg-background/50 backdrop-blur-sm">
                <Link to="/login">Sign in to Portal</Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Used by 500+ top institutes across India
            </p>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="border-t border-border bg-background py-20 sm:py-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                title="Smart Admissions"
                description="Unique QR-based admission forms. Collect enquiries and approve enrollments in seconds."
              />
              <FeatureCard 
                title="Automated Fees"
                description="Auto-generate fee receipts, send WhatsApp reminders, and track installments effortlessly."
              />
              <FeatureCard 
                title="Syllabus Pulse"
                description="Real-time progress tracking. Know exactly how much syllabus is completed in every batch."
              />
            </div>
          </div>
        </section>

        {/* CTA Footer Section */}
        <section className="bg-primary py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
              Ready to modernize your academy?
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/80">
              Join the future of education management. Zero setup cost, unlimited possibilities.
            </p>
            <Button asChild size="xl" variant="secondary" className="mt-10 h-14 px-10 text-base shadow-xl">
              <Link to="/signup">Create Your Institute Now</Link>
            </Button>
          </div>
        </section>
      </MarketingShell>
    </PostAuthGate>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors">
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
