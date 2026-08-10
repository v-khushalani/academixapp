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

        <section className="mt-20">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why choose Growth?</h2>
              <p className="mt-4 text-muted-foreground">
                As your institute scales beyond 100 students, the manual effort of tracking fees,
                reminding parents, and marking attendance becomes a bottleneck. The Growth plan
                introduces the **Automation Engine** — saving your staff hours every single day.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Automated WhatsApp fee reminders & absentee alerts",
                  "RFID card & biometric attendance machine integration",
                  "Full revenue, collection & teacher load reports",
                  "Branded receipts & documents with your logo",
                  "500 student capacity & 10 classrooms",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 rounded-full bg-primary/10 p-0.5 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5" />
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">The Campus Standard</h2>
              <p className="mt-4 text-muted-foreground">
                For large-scale operations and multi-branch potential. Campus is about
                **Accountability and Insight**.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Governance", desc: "Granular roles & audit logs" },
                  { title: "Insights", desc: "Trend forecasting & analytics" },
                  { title: "Capacity", desc: "1,500 students & 30 rooms" },
                  { title: "Support", desc: "Priority WhatsApp support line" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-border bg-background p-4">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm font-medium italic text-primary">
                "Campus gives us the bird's eye view we needed to manage 1,200 students across
                multiple sessions without losing a single fee entry."
              </p>
            </div>
          </div>
        </section>

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
