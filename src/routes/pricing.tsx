import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, inr } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Academix coaching institute software" },
      {
        name: "description",
        content:
          "Zero setup fee, zero commission, no per-student billing. Free forever for 75 students, ₹999/month for 300. Compare Academix with Classplus, Teachmint, MyClassCampus and Fedena.",
      },
      { property: "og:title", content: "Academix pricing — cheaper than every coaching ERP" },
      {
        property: "og:description",
        content:
          "Free forever tier, ₹999/month Growth, no setup fee and no commission. Full feature comparison with the Indian market.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

const TIER_COPY: Record<string, { tagline: string; cta: string; features: string[] }> = {
  free: {
    tagline: "Enough to actually run a small centre.",
    cta: "Start free",
    features: [
      "75 students, 3 classrooms",
      "Unlimited staff & teachers",
      "Admissions, batches, attendance, fees",
      "Tests, syllabus tracker, timetable",
      "Teacher & parent portals",
      "WhatsApp messaging (no API cost)",
    ],
  },
  growth: {
    tagline: "The single-centre coaching plan.",
    cta: "Start free, upgrade later",
    features: [
      "300 students, 8 classrooms",
      "Everything in Free",
      "Reports & CSV/PDF exports",
      "Fee receipts + UPI QR collection",
      "Multi-room daily scheduling",
      "Email support within 24h",
    ],
  },
  campus: {
    tagline: "For established institutes.",
    cta: "Start free, upgrade later",
    features: [
      "1,000 students, 25 classrooms",
      "Everything in Growth",
      "Priority support",
      "Onboarding & data import help",
      "Role-based access for large teams",
    ],
  },
  chain: {
    tagline: "Multiple branches, one dashboard.",
    cta: "Talk to us",
    features: [
      "Unlimited students & classrooms",
      "Branch-wise rollup reporting",
      "Dedicated onboarding manager",
      "Custom branding",
    ],
  },
};

type Cmp = true | false | "partial" | string;

const COMPARE: { group: string; rows: { label: string; v: Cmp[] }[] }[] = [
  {
    group: "What it costs",
    rows: [
      { label: "Setup fee", v: ["₹0", "₹15k–20k", "Variable", "₹10k–25k", "₹5k–10k", "₹50k+"] },
      {
        label: "Per student / year",
        v: ["₹0 (flat plan)", "Quote-based", "₹50–100", "₹80–150", "₹80–150", "₹150–200"],
      },
      { label: "Commission on your fees", v: ["₹0", "Yes", "No", "No", "No", "No"] },
      { label: "Free forever tier", v: [true, false, "partial", false, false, false] },
      { label: "Self-serve signup (no sales call)", v: [true, false, true, false, false, false] },
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
  { q: "Q4 2026", item: "Online fee gateway (UPI autopay + cards)" },
  { q: "Q4 2026", item: "Report-card generator with your template" },
  { q: "Q1 2027", item: "Branded parent app on Play Store" },
  { q: "Q1 2027", item: "Live classes & recorded content" },
  { q: "Q2 2027", item: "Biometric attendance devices, transport module" },
];

const FAQ = [
  {
    q: "Is the free plan a trial?",
    a: "No. It stays free at 75 students and 3 classrooms, with every core module unlocked. You upgrade only when the centre grows.",
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
  const [yearly, setYearly] = useState(true);

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
            No setup fee. No commission on your fee collection. No per-student billing. One flat
            plan per institute — and a free tier that actually runs a small centre.
          </p>

          <div className="mt-8 inline-flex rounded-lg border border-border bg-muted/40 p-1">
            {[
              { k: false, label: "Monthly" },
              { k: true, label: "Yearly · 2 months free" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setYearly(o.k)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                  yearly === o.k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const copy = TIER_COPY[p.key];
            const highlight = p.key === "growth";
            const price =
              p.priceMonthly == null
                ? "Custom"
                : p.priceMonthly === 0
                  ? "₹0"
                  : yearly
                    ? inr(p.priceYearly!)
                    : inr(p.priceMonthly);
            const period =
              p.priceMonthly == null ? null : p.priceMonthly === 0 ? "forever" : yearly ? "/year" : "/month";
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-2xl border p-6 ${
                  highlight ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"
                }`}
              >
                {highlight && (
                  <span className="mb-2 inline-flex w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Most institutes
                  </span>
                )}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{price}</span>
                  {period && <span className="text-xs text-muted-foreground">{period}</span>}
                </div>
                {p.priceMonthly ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ≈ ₹{Math.round((p.priceYearly ?? 0) / p.students)} per student / year at full
                    capacity
                  </p>
                ) : p.priceMonthly === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">No card required</p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Priced per branch — talk to us
                  </p>
                )}
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {copy.features.map((f) => (
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
                  <Link to="/signup">{copy.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-3 rounded-xl border border-border bg-muted/30 p-5 sm:grid-cols-3">
          {[
            ["₹0 setup fee", "Others charge ₹5,000 to ₹50,000 before you start."],
            ["₹0 commission", "Your fee collection is yours. We never touch it."],
            ["₹0 per student", "Add students without watching the meter."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Launch offer: the first 50 institutes keep their price locked for life.
        </p>
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
            Start on the free plan today — no card, no sales call, no setup fee.
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
