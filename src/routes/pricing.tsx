import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLANS,
  PLAN_FEATURE_MATRIX,
  TERM_LABEL,
  TERM_PERKS,
  TERM_YEARS,
  inr,
  termFor,
} from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Academix coaching institute software" },
      {
        name: "description",
        content:
          "Yearly plans only. Free forever for 100 students. Growth from ₹4,990/year — under ₹9 per student per year on a 5-year term. Zero setup fee, zero commission.",
      },
      { property: "og:title", content: "Academix pricing — cheaper than every coaching ERP" },
      {
        property: "og:description",
        content:
          "Free forever tier, Growth at ₹4,990/year, big discounts on 3 and 5-year terms. No setup fee, no commission, full market comparison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

type Cmp = true | false | "partial" | string;

const COMPARE: { group: string; rows: { label: string; v: Cmp[] }[] }[] = [
  {
    group: "What it costs",
    rows: [
      { label: "Setup fee", v: ["₹0", "₹15k–20k", "Variable", "₹10k–25k", "₹5k–10k", "₹50k+"] },
      { label: "Yearly plans only (no monthly churn pricing)", v: [true, false, false, false, false, false] },
      { label: "Multi-year discount (3 / 5 years)", v: ["20% / 30%", false, false, "Negotiated", "Negotiated", false] },
      {
        label: "Per student / year",
        v: ["₹9–12 (flat plan)", "Quote-based", "₹50–100", "₹80–150", "₹80–150", "₹150–200"],
      },
      { label: "Commission on your fees", v: ["₹0", "Yes", "No", "No", "No", "No"] },
      { label: "Free forever tier", v: [true, false, "partial", false, false, false] },
      { label: "Self-serve signup (no sales call)", v: [true, false, true, false, false, false] },
    ],
  },
  {
    group: "Locked behind a paid plan elsewhere",
    rows: [
      { label: "Attendance", v: ["Free plan", "Paid", "Paid", "Paid", "Paid", "Paid"] },
      { label: "Fee management & receipts", v: ["Free plan", "Paid", "Paid", "Paid", "Paid", "Paid"] },
      { label: "Parent communication", v: ["Free plan", "Paid", "Paid", "Paid", "Paid", "Paid"] },
      { label: "Reports", v: ["Growth", "Paid", "Paid", "Paid", "Paid", "Paid"] },
      { label: "Multiple admin / staff logins", v: ["Free plan", "Paid", "Paid", "Paid", "Paid", "Paid"] },
    ],
  },
  {
    group: "Daily running",
    rows: [
      { label: "QR / link admissions & enquiry pipeline", v: [true, "partial", "partial", true, true, true] },
      { label: "Batches with auto fee inheritance", v: [true, true, "partial", true, true, true] },
      { label: "Attendance + instant parent message", v: [true, true, true, true, true, true] },
      { label: "Fees, receipts, UPI QR, defaulters report", v: [true, true, "partial", true, true, true] },
      { label: "Tests & marks entry by teachers", v: [true, true, true, true, true, true] },
      { label: "Chapter-level syllabus tracking", v: [true, false, "partial", false, "partial", "partial"] },
      { label: "Multi-classroom daily timetable with clash checks", v: [true, false, false, "partial", "partial", "partial"] },
      { label: "Timetable share as WhatsApp image", v: [true, false, false, false, false, false] },
    ],
  },
  {
    group: "Who logs in",
    rows: [
      { label: "Admin / office portal", v: [true, true, true, true, true, true] },
      { label: "Teacher portal (attendance, marks, syllabus)", v: [true, true, true, true, true, true] },
      { label: "Parent & student portal", v: [true, true, true, true, true, true] },
      { label: "Role-based permissions", v: [true, "partial", "partial", true, true, true] },
      { label: "Teacher invite links (no manual accounts)", v: [true, false, "partial", false, false, false] },
    ],
  },
  {
    group: "Your data",
    rows: [
      { label: "CSV import & export of everything", v: [true, "partial", "partial", true, true, "partial"] },
      { label: "Reports: revenue, attendance, fees", v: [true, true, "partial", true, true, true] },
      { label: "Multi-branch rollup", v: ["Chain plan", true, false, true, true, true] },
      { label: "No lock-in, export and leave", v: [true, false, "partial", "partial", true, false] },
    ],
  },
];

const COLS = ["Academix", "Classplus", "Teachmint", "MyClassCampus", "Fedena", "CampusCare"];

const ROADMAP = [
  { q: "Q4 2026", item: "Scheduled WhatsApp reminders & absentee automation (Growth)" },
  { q: "Q4 2026", item: "Online fee gateway (UPI autopay + cards)" },
  { q: "Q4 2026", item: "Report-card generator with your template" },
  { q: "Q1 2027", item: "Audit log & custom fields (Campus)" },
  { q: "Q1 2027", item: "Branded parent app on Play Store" },
  { q: "Q1 2027", item: "Live classes & recorded content" },
  { q: "Q2 2027", item: "API / webhooks and analytics forecasting (Campus)" },
  { q: "Q2 2027", item: "Biometric attendance devices, transport module" },
];

const FAQ = [
  {
    q: "Is the free plan a trial?",
    a: "No. It stays free at 100 students and 4 classrooms, with every core module unlocked — admissions, attendance, fees, tests, syllabus, timetable and all three portals. You upgrade only when you want scale or automation.",
  },
  {
    q: "Why is there no monthly plan?",
    a: "Yearly terms let us keep the price this low and keep supporting you properly instead of chasing monthly renewals. A 3-year term saves 20% and a 5-year term 30%, with the rate locked for the whole period.",
  },
  {
    q: "What happens at the end of my term?",
    a: "You renew at your locked rate, move to a different term, or export everything and leave. Founding institutes keep their rate for life.",
  },
  {
    q: "Do you take a cut of my fee collection?",
    a: "Never. You collect fees directly; Academix only records them. No commission, no payment markup.",
  },
  {
    q: "Any setup or onboarding charge?",
    a: "Zero. Sign up, add your batches, import students from a CSV, and you're running the same day.",
  },
  {
    q: "What if a feature I need isn't here yet?",
    a: "The roadmap above is dated and public. Tell us what you need — early institutes get their requests prioritised.",
  },
  {
    q: "Can I get my data out?",
    a: "Any time. Students, fees, attendance, marks and reports all export to CSV or PDF.",
  },
];

function Mark({ v, own }: { v: Cmp; own: boolean }) {
  if (v === true)
    return <Check className={`mx-auto h-4 w-4 ${own ? "text-primary" : "text-foreground/70"}`} />;
  if (v === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/50" />;
  if (v === "partial") return <Minus className="mx-auto h-4 w-4 text-muted-foreground" />;
  return <span className={`text-[11px] ${own ? "font-semibold text-primary" : ""}`}>{v}</span>;
}

function PricingPage() {
  const [years, setYears] = useState<number>(3);

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
          <Button asChild size="sm" variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Cheaper than every ERP. Missing none of the features.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            The whole daily operation — admissions, attendance, fees, tests, syllabus, timetable,
            portals — is free forever. Paid plans add scale, automation and intelligence. Yearly
            plans only, with real discounts for committing longer.
          </p>

          <div className="mt-8 inline-flex rounded-lg border border-border bg-muted/40 p-1">
            {TERM_YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                  years === y
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TERM_LABEL[y]}
                {y === 3 && " · save 20%"}
                {y === 5 && " · save 30%"}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No monthly billing. Longer term, lower price — and it stays locked for the whole term.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const term = termFor(p, years);
            const highlight = p.key === "growth";
            const perYear = term.price == null ? null : Math.round(term.price / term.years);
            const price =
              term.price == null ? "Custom" : term.price === 0 ? "₹0" : inr(term.price);
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-2xl border p-6 ${
                  highlight ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"
                }`}
              >
                <div className="mb-2 flex min-h-5 items-center gap-2">
                  {highlight && (
                    <span className="inline-flex w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Most institutes
                    </span>
                  )}
                  {term.save > 0 && term.price ? (
                    <span className="inline-flex w-fit rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                      Save {term.save}%
                    </span>
                  ) : null}
                </div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{price}</span>
                  {term.price != null && (
                    <span className="text-xs text-muted-foreground">
                      {term.price === 0 ? "forever" : `/ ${TERM_LABEL[term.years]}`}
                    </span>
                  )}
                </div>
                {term.price ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {inr(perYear!)} per year · ≈ ₹{(perYear! / p.students).toFixed(2)} per student /
                    year at full capacity
                  </p>
                ) : term.price === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    No card required, no expiry
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Priced per branch — talk to us
                  </p>
                )}
                {p.key !== "free" && (
                  <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                    Everything in {p.key === "growth" ? "Free" : p.key === "campus" ? "Growth" : "Campus"},
                    plus:
                  </p>
                )}
                <ul className="mt-3 flex-1 space-y-2.5 text-sm">
                  {p.adds.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={highlight ? "default" : "outline"}
                >
                  <Link to="/signup">{p.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm font-semibold">What the {TERM_LABEL[years]} term includes</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {TERM_PERKS[years].map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border border-border bg-muted/30 p-5 sm:grid-cols-4">
          {[
            ["₹0 setup fee", "Others charge ₹5,000 to ₹50,000 before you start."],
            ["₹0 commission", "Your fee collection is yours. We never touch it."],
            ["₹0 per student", "Add students without watching the meter."],
            ["Free tier stays free", "100 students, every core module, forever."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Founding offer: the first 100 institutes keep their rate for life, on any term. Growth on a
          5-year term works out to ₹8.75 per student per year — Teachmint charges ₹50–100 and Fedena
          ₹80–150.
        </p>
      </section>

      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold tracking-tight">What each plan includes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything an institute does every day sits in the free plan. Paid tiers buy scale,
            automation and accountability.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="w-[320px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Capability
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.key}
                      className={`px-3 py-3 text-center text-xs font-semibold ${
                        p.key === "growth" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURE_MATRIX.map((g) => (
                  <Fragment key={g.group}>
                    <tr className="border-t border-border">
                      <td
                        colSpan={PLANS.length + 1}
                        className="bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-t border-border/70">
                        <td className="px-4 py-2.5 text-xs">{r.label}</td>
                        {r.v.map((v, i) => (
                          <td
                            key={i}
                            className={`px-3 py-2.5 text-center ${
                              PLANS[i]?.key === "growth" ? "bg-primary/5" : ""
                            }`}
                          >
                            <Mark v={v as Cmp} own={PLANS[i]?.key === "growth"} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold tracking-tight">Compared with the whole market</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Competitor pricing from their publicly listed rates, 2026. Full tick means included at
            no extra cost; dash means partial or paid add-on.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="w-[280px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Feature
                  </th>
                  {COLS.map((c, i) => (
                    <th
                      key={c}
                      className={`px-3 py-3 text-center text-xs font-semibold ${
                        i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((g) => (
                  <Fragment key={g.group}>
                    <tr className="border-t border-border">
                      <td
                        colSpan={COLS.length + 1}
                        className="bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-t border-border/70">
                        <td className="px-4 py-2.5 text-xs">{r.label}</td>
                        {r.v.map((v, i) => (
                          <td
                            key={i}
                            className={`px-3 py-2.5 text-center ${i === 0 ? "bg-primary/5" : ""}`}
                          >
                            <Mark v={v} own={i === 0} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold">What we don't have yet — and when it lands</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We'd rather tell you upfront than let you discover it after paying.
            </p>
            <ul className="mt-4 space-y-2">
              {ROADMAP.map((r) => (
                <li key={r.item} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 rounded bg-muted px-2 py-0.5 text-center text-[10px] font-semibold text-muted-foreground">
                    {r.q}
                  </span>
                  <span>{r.item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <h2 className="text-2xl font-bold tracking-tight">Questions institutes ask us</h2>
        <dl className="mt-6 space-y-5">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-lg border border-border bg-card p-5">
              <dt className="text-sm font-semibold">{f.q}</dt>
              <dd className="mt-1.5 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="text-xl font-bold">Built for coaching institutes. By people who run one.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start on the free plan today — no card, no sales call, no setup fee. Move to a yearly
            term whenever you are ready.
          </p>
          <Button asChild className="mt-5">
            <Link to="/signup">Create your institute</Link>
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Competitor figures are from publicly available pricing pages and reviews and may change.
          Spotted something wrong? Tell us and we'll correct it.
        </p>
      </section>
    </div>
  );
}
