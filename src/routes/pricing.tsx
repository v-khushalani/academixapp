import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchFeatures,
  fetchPlans,
  groupFeatures,
  type FeatureValue,
} from "@/lib/pricing-catalog";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Academix coaching institute software" },
      {
        name: "description",
        content:
          "Free forever for 100 students. Growth and Campus for bigger institutes — pricing shared on a quick call. No setup fee, no commission.",
      },
      { property: "og:title", content: "Academix plans — start free, scale simple" },
      {
        property: "og:description",
        content:
          "Free forever tier plus two paid plans. Compare every feature at a glance.",
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
    a: "No. It stays free forever — every core module, all three portals, no card.",
  },
  {
    q: "What do the paid plans cost?",
    a: "We walk you through plans on a quick call, so you only pay for what your institute actually needs.",
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
    q: "Longer commitments?",
    a: "Talk to us — multi-year institutes get a better rate, locked for the term.",
  },
];

function Mark({ v }: { v: FeatureValue | undefined }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (v === false || v == null) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-xs font-medium">{v}</span>;
}

function PricingPage() {
  const { data: plans = [] } = useQuery({ queryKey: ["pricing-plans"], queryFn: fetchPlans });
  const { data: features = [] } = useQuery({
    queryKey: ["pricing-features"],
    queryFn: fetchFeatures,
  });

  const visible = plans.filter((p) => p.visible);
  const groups = groupFeatures(features);

  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple plans. Start free.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Run your whole institute free. Need more scale or automation? We'll take you through
            the paid plans on a quick call.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
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
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold">
                  {p.price_yearly === 0 && !p.contact_only ? "Free" : "Talk to us"}
                </span>
                {p.price_yearly === 0 && !p.contact_only && (
                  <span className="text-xs text-muted-foreground">forever</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.student_limit.toLocaleString("en-IN")} students · {p.room_limit} classrooms
              </p>
              <Button
                asChild
                className="mt-6 w-full"
                variant={p.highlight ? "default" : "outline"}
              >
                {p.price_yearly === 0 && !p.contact_only ? (
                  <Link to="/signup">{p.cta}</Link>
                ) : (
                  <a href="mailto:hello@academix.website?subject=Academix%20plan%20enquiry">
                    Talk to us
                  </a>
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          No setup fee · No commission on your fees · Multi-branch or longer terms?{" "}
          <a
            href="mailto:hello@academix.website?subject=Academix%20plan%20enquiry"
            className="text-primary hover:underline"
          >
            Talk to us
          </a>
        </p>

        <div className="mt-12 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 w-[240px] bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <tr key={r.id} className="border-t border-border/70">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-xs">{r.label}</td>
                      {visible.map((p) => (
                        <td
                          key={p.id}
                          className={`px-3 py-2.5 text-center ${p.highlight ? "bg-primary/5" : ""}`}
                        >
                          <Mark v={r.values?.[p.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
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
            No card, no sales call, no setup fee.
          </p>
          <Button asChild className="mt-5">
            <Link to="/signup">Create your institute</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
