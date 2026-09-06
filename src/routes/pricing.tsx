import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  comparisonGroups,
  fetchFeatures,
  fetchPlans,
  inr,
  termPrice,
  termSaving,
  TERMS,
  type CatalogFeature,
  type CatalogPlan,
  type FeatureValue,
  type Term,
} from "@/lib/pricing-catalog";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Academix coaching institute software" },
      {
        name: "description",
        content:
          "Plans start at ₹0 a year. Flat pricing, no setup fee, no commission on your fees — and a bigger discount when you pay for 3 or 5 years.",
      },
      { property: "og:title", content: "Academix pricing — start at ₹0 a year" },
      {
        property: "og:description",
        content:
          "Free forever for small institutes. Growth from ₹5,990 a year. Compare every feature at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

const FAQ = [
  {
    q: "Is the free plan a trial?",
    a: "No. It stays free forever — the daily work of the institute, all three portals, no card.",
  },
  {
    q: "Why no monthly plan?",
    a: "Yearly keeps the price low and your data settled through the full academic year. Longer terms cost less per year.",
  },
  {
    q: "Any setup fee or commission?",
    a: "Zero setup fee, and we never take a cut of your fee collection.",
  },
  {
    q: "Can I move my data out?",
    a: "Any time. Students, fees, attendance and marks export to CSV or PDF.",
  },
  {
    q: "What if we outgrow a plan mid-term?",
    a: "You pay only the difference for the time left. Nothing is lost and nothing is re-set up.",
  },
];

const TERM_PERKS: Record<Term, string> = {
  1: "Cancel or export any time",
  3: "Price locked for 3 years · free data migration",
  5: "Price locked for 5 years · priority WhatsApp support · every new module free",
};

function Mark({ v }: { v: FeatureValue | undefined }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (v === false || v == null) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-xs font-medium">{v}</span>;
}

function Row({ row, plans }: { row: CatalogFeature; plans: CatalogPlan[] }) {
  return (
    <tr className="border-t border-border/70">
      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-xs">{row.label}</td>
      {plans.map((p) => (
        <td key={p.id} className={`px-3 py-2.5 text-center ${p.highlight ? "bg-primary/5" : ""}`}>
          <Mark v={row.values?.[p.key]} />
        </td>
      ))}
    </tr>
  );
}

function PriceBlock({ p, term }: { p: CatalogPlan; term: Term }) {
  const total = termPrice(p, term);
  const saving = termSaving(p, term);
  const perYear = total == null ? null : Math.round(total / term);
  const hidden = !p.show_price || (p.contact_only && total == null);

  if (hidden) {
    return (
      <div className="mt-5">
        <span className="text-3xl font-semibold">Let&rsquo;s talk</span>
        <p className="mt-1 text-xs text-muted-foreground">Priced to your branches and headcount.</p>
      </div>
    );
  }

  if (!total) {
    return (
      <div className="mt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold">₹0</span>
          <span className="text-xs text-muted-foreground">a year, forever</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No card, no setup fee.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold">{inr(total)}</span>
        <span className="text-xs text-muted-foreground">
          {term === 1 ? "a year" : `for ${term} years`}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {p.contact_only ? "from " : ""}
        {inr(perYear ?? 0)} a year · about {inr(Math.round((perYear ?? 0) / 12))} a month
        {saving > 0 && (
          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
            save {saving}%
          </span>
        )}
      </p>
    </div>
  );
}

function PricingPage() {
  const { data: plans = [] } = useQuery({ queryKey: ["pricing-plans"], queryFn: fetchPlans });
  const { data: features = [] } = useQuery({
    queryKey: ["pricing-features"],
    queryFn: fetchFeatures,
  });
  const [term, setTerm] = useState<Term>(1);

  const visible = plans.filter((p) => p.visible);
  const groups = comparisonGroups(visible, features);

  const cheapest = visible
    .map((p) => (p.show_price ? (p.price_1y ?? p.price_yearly) : null))
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b)[0];

  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Plans start at {cheapest != null ? inr(cheapest) : "₹0"} a year.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Flat price for the whole institute — never per student. No setup fee, no commission on
            your fees. Pay for longer and pay less.
          </p>
        </div>

        <div className="mt-7 flex justify-center">
          <div
            role="tablist"
            aria-label="Billing term"
            className="inline-flex rounded-full border border-border bg-card p-1"
          >
            {TERMS.map((t) => (
              <button
                key={t.years}
                type="button"
                role="tab"
                aria-selected={term === t.years}
                onClick={() => setTerm(t.years)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  term === t.years
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {t.years !== 1 && <span className="ml-1 opacity-80">· save more</span>}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{TERM_PERKS[term]}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const paid = p.show_price && (termPrice(p, term) ?? 0) > 0;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  p.highlight ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                }`}
              >
                <div className="flex min-h-5 items-center">
                  {p.highlight && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Most institutes
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <PriceBlock p={p} term={term} />
                <p className="mt-3 text-xs text-muted-foreground">
                  {p.price_note ??
                    `${p.student_limit === 0 ? "Unlimited" : p.student_limit.toLocaleString("en-IN")} students · ${
                      p.room_limit === 0 ? "unlimited" : p.room_limit
                    } classrooms`}
                </p>
                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={p.highlight ? "default" : "outline"}
                >
                  {p.contact_only ? (
                    <a href="mailto:hello@academix.website?subject=Academix%20walkthrough">
                      Book a 10-min walkthrough
                    </a>
                  ) : (
                    <Link to="/signup">{paid ? p.cta : "Start free"}</Link>
                  )}
                </Button>
                {paid && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Start free today, upgrade whenever you are ready.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          No setup fee · No commission on your fees · Founding offer: the first 100 institutes keep
          their rate for life
        </p>

        <div className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">What you get</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Everything below is exactly what your institute gets on that plan.
          </p>

          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="sticky left-0 z-10 w-full bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-[220px]">
                    Compare
                  </th>
                  {visible.map((p) => (
                    <th
                      key={p.id}
                      className={`px-3 py-3 text-center text-xs font-semibold ${
                        p.highlight ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.group}>
                    <tr className="border-t border-border">
                      <td
                        colSpan={visible.length + 1}
                        className="bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <Row key={r.id} row={r} plans={visible} />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="px-4 pt-4 text-left text-lg font-semibold tracking-tight">
              How that compares
            </caption>
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-left font-semibold">Software</th>
                <th className="px-4 py-3 text-left font-semibold">Typical price</th>
                <th className="px-4 py-3 text-left font-semibold">Setup fee</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Academix", "Flat, from ₹0 a year", "None"],
                ["Teachmint", "Free app, paid quote for fees & attendance", "—"],
                ["Classplus", "₹2,000+ a month plus a cut of your fees", "₹15,000–20,000"],
                ["MyClassCampus", "₹80–150 per student a year", "₹10,000–25,000"],
                ["Fedena", "₹80–150 per student a year", "₹5,000–10,000"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-t border-border/70">
                  <td className="px-4 py-2.5 text-xs font-medium">{a}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{b}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 pb-4 pt-2 text-[11px] text-muted-foreground">
            Publicly listed rates as of August 2026; ask each vendor for a current quote.
          </p>
        </div>

        <dl className="mt-12 grid gap-3 sm:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-lg border border-border bg-card p-4">
              <dt className="text-sm font-semibold">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-7 text-center">
          <h2 className="text-lg font-semibold">Start free today.</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            No card, no setup fee. Bigger institute or multi-branch? We&rsquo;ll walk you through it
            in ten minutes.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link to="/signup">Create your institute</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:hello@academix.website?subject=Academix%20walkthrough">
                Book a 10-min walkthrough
              </a>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <a href="tel:+917066670222" className="hover:underline">
              70666 70222
            </a>{" "}
            ·{" "}
            <a href="mailto:hello@academix.website" className="hover:underline">
              hello@academix.website
            </a>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
