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

export const Route = createFileRoute("/for-institutes")({
  head: () => ({
    meta: [
      { title: "For Institutes — Academix" },
      {
        name: "description",
        content:
          "Academix is the modern ERP for coaching institutes: admissions, students, batches, attendance, fees, tests, timetable and WhatsApp — in one place.",
      },
    ],
  }),
  component: ForInstitutesPage,
});

const modules = [
  { icon: UserPlus, title: "Admissions", desc: "Leads pipeline, quick admit, QR self-onboarding and admin approvals." },
  { icon: Users, title: "Students", desc: "Full profiles, parent contacts, photos and one-click communication." },
  { icon: CalendarCheck, title: "Attendance", desc: "Batch-wise, one-click marking with WhatsApp reminders." },
  { icon: Wallet, title: "Fees", desc: "Batch-linked auto-fetch, outstanding tracking and payment logs." },
  { icon: FileText, title: "Tests & Marks", desc: "Create tests, enter marks, publish results to parents." },
  { icon: Calendar, title: "Timetable", desc: "Drag-and-drop weekly grid with room/teacher/batch conflict checks." },
  { icon: MessageCircle, title: "WhatsApp", desc: "Native deep-links — no paid API required. Templated messages, sent manually." },
  { icon: BarChart3, title: "Reports", desc: "See what's happening across the institute at a glance." },
];

function ForInstitutesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">Ax</span>
            </div>
            <span className="text-sm font-bold">Academix</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Start free trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Built for coaching institutes. By people who run one.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Academix is developed alongside <strong className="text-foreground">VK Academy</strong> —
          our own institute — so every module is shaped by real day-to-day operations.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/signup" className="gap-2">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.title} className="rounded-xl border border-border/60 bg-card p-6">
              <m.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-sm font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}