import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarCheck,
  ClipboardList,
  MessageCircle,
  QrCode,
  Users,
} from "lucide-react";
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

const MODULES = [
  {
    icon: QrCode,
    title: "Paperless admissions",
    desc: "One QR at the front desk. Parents fill the full form on their phone; you approve and the student record, login and fee plan are created.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Fees that add up",
    desc: "Batch fee auto-applies to every student, discounts and scholarships adjust it, UPI QR collects it, and receipts print as PDF.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance in one tap",
    desc: "Teachers mark a whole batch from their phone. Absentee parents get a WhatsApp message with a single tap.",
  },
  {
    icon: ClipboardList,
    title: "Tests and progress",
    desc: "Enter marks batch-wise; families see scores, trends and rank movement in their own portal.",
  },
  {
    icon: Users,
    title: "Batches and timetable",
    desc: "A visual weekly grid with room, teacher and subject on one card — with clash warnings before you save.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp, zero cost",
    desc: "No paid API. Every reminder opens WhatsApp with the message ready — you press send.",
  },
];

const FLOW = [
  { step: "01", title: "Enquiry", desc: "Parent scans your QR and fills the form." },
  { step: "02", title: "Approval", desc: "Office reviews and approves — or keeps it for follow-up." },
  { step: "03", title: "Enrolled", desc: "Student, batch fee and portal logins are created together." },
  { step: "04", title: "Everyday", desc: "Attendance, marks, fees and reminders run on their own rails." },
];

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

      {/* Modules */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything an institute actually does in a day
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div key={m.title} className="bg-background p-6">
                <m.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3.5 text-base font-semibold">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            From walk-in to enrolled, without a single paper form
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((f) => (
              <li key={f.step} className="border-t-2 border-primary pt-4">
                <span className="text-xs font-semibold tracking-widest text-primary">{f.step}</span>
                <p className="mt-1.5 text-base font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Set up your institute today. Take your first admission tomorrow.
          </h2>
          <p className="mt-3 max-w-xl text-sm opacity-80">
            No card, no installation. Create a workspace, add a batch, print your admission QR.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/signup">
                Create your institute <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Academix</span>
          <span className="text-xs">Built for coaching institutes. By people who run one.</span>
        </div>
      </footer>
    </div>
  );
}
