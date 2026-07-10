import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Academix" },
      {
        name: "description",
        content:
          "Simple, per-institute subscription pricing for Academix. Start free, upgrade when you're ready.",
      },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Starter",
    price: "Free",
    tagline: "For small institutes getting started.",
    features: ["Up to 50 students", "1 admin user", "Core modules", "Community support"],
    cta: "Start free",
  },
  {
    name: "Growth",
    price: "₹1,999",
    period: "/month",
    tagline: "For growing coaching institutes.",
    features: [
      "Up to 500 students",
      "Unlimited staff & faculty",
      "All modules",
      "WhatsApp deep-links",
      "Priority email support",
    ],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Pro",
    price: "Custom",
    tagline: "For multi-branch institutes.",
    features: [
      "Unlimited students",
      "Multi-branch support",
      "Custom branding & domain",
      "Dedicated success manager",
    ],
    cta: "Talk to us",
  },
];

function PricingPage() {
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

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing per institute
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            One subscription per institute. No per-student fees. Cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 ${
                tier.highlight
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              }`}
            >
              <h2 className="text-lg font-semibold">{tier.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full"
                variant={tier.highlight ? "default" : "outline"}
              >
                <Link to="/signup">{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Prices are indicative during private beta. Final pricing will be published when billing
          goes live.
        </p>
      </section>
    </div>
  );
}