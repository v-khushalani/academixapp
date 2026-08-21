import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, IndianRupee, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PostAuthGate } from "@/components/auth/post-auth-gate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Academix — Run your coaching institute on one screen" },
      {
        name: "description",
        content:
          "Attendance, fees and parent updates for coaching institutes. Free for your first 100 students. One login for office, teachers, students and parents.",
      },
      { property: "og:title", content: "Academix — Run your coaching institute on one screen" },
      {
        property: "og:description",
        content:
          "Attendance, fees and parent updates in one place. Free for your first 100 students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const OUTCOMES = [
  {
    icon: CalendarCheck,
    title: "Attendance in a minute",
    body: "Teachers tap through the batch on their phone. Parents of absentees get a message the same morning.",
  },
  {
    icon: IndianRupee,
    title: "Fees that collect themselves",
    body: "Batch fee auto-applies to every student, instalments generate on their own, dues never go quiet.",
  },
  {
    icon: MessageCircle,
    title: "Parents stay informed",
    body: "Receipts, marks and reminders go out on WhatsApp — and the family portal shows it all anyway.",
  },
];

const STEPS = [
  "Create your institute — name, logo, one batch.",
  "Add students by QR admission form or bulk import.",
  "Mark today's attendance and collect a fee. That's the whole system.",
];

function Index() {
  return (
    <PostAuthGate>
      <MarketingShell>
        {/* Hero — one promise, one action */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 sm:py-28">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Run your coaching institute on one screen.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Admissions, attendance, fees and parent updates — replacing the register, the fee
              diary and the WhatsApp chaos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                <Link to="/signup">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free forever for your first 100 students. No card, no setup fee.
            </p>
          </div>
        </section>

        {/* Three outcomes, not a feature dump */}
        <section>
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-5 md:grid-cols-3">
              {OUTCOMES.map((o) => (
                <div key={o.title} className="rounded-xl border border-border bg-card p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <o.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight">{o.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{o.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it starts */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Live in ten minutes.
            </h2>
            <ol className="mt-7 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm text-muted-foreground sm:text-base">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* One login */}
        <section>
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              One login. Everyone lands in the right place.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Office staff see the console, teachers see their classes, students and parents see
              their own progress. Nobody has to remember which portal is theirs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                <Link to="/signup">
                  Create your institute <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
                <Link to="/pricing">See plans</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Teachers, students and parents don&apos;t sign up — your institute sends them the
              login link.
            </p>
          </div>
        </section>
      </MarketingShell>
    </PostAuthGate>
  );
}
