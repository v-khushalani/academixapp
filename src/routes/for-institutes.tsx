import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Users,
  Wallet,
  CalendarCheck,
  FileText,
  Calendar,
  MessageCircle,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const Route = createFileRoute("/for-institutes")({
  head: () => ({
    meta: [
      { title: "Features — Academix institute software" },
      {
        name: "description",
        content:
          "Academix is the modern ERP for coaching institutes: admissions, students, batches, attendance, fees, tests, timetable and WhatsApp — in one place.",
      },
      { property: "og:title", content: "Features — Academix institute software" },
      {
        property: "og:description",
        content:
          "Admissions, attendance, fees, tests, syllabus and timetable, plus admin, teacher and family portals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForInstitutesPage,
});

const modules = [
  {
    icon: UserPlus,
    title: "Admissions",
    desc: "Leads pipeline, quick admit, QR self-onboarding and admin approvals.",
  },
  {
    icon: Users,
    title: "Students",
    desc: "Full profiles, parent contacts, photos and one-click communication.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    desc: "Batch-wise, one-click marking with WhatsApp reminders.",
  },
  {
    icon: Wallet,
    title: "Fees",
    desc: "Batch-linked auto-fetch, outstanding tracking and payment logs.",
  },
  {
    icon: FileText,
    title: "Tests & Marks",
    desc: "Create tests, enter marks, publish results to parents.",
  },
  {
    icon: Calendar,
    title: "Timetable",
    desc: "Drag-and-drop weekly grid with room/teacher/batch conflict checks.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    desc: "Native deep-links — no paid API required. Templated messages, sent manually.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    desc: "See what's happening across the institute at a glance.",
  },
];

function ForInstitutesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-6 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Built for coaching institutes. By people who run one.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
          Every module is shaped by day-to-day admissions, classroom and fee-desk work.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/signup" className="gap-2">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.title} className="rounded-xl border border-border bg-card p-5">
              <m.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-sm font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-7 text-center">
          <h2 className="text-lg font-semibold">All of it is free up to 100 students.</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Paid plans only add scale, automation and deeper reporting.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/signup">Create your institute</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
