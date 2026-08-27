import { createFileRoute } from "@tanstack/react-router";
import { PricingAdmin } from "@/components/app/pricing-admin";

export const Route = createFileRoute("/app/platform/plans")({
  component: PlatformPlans,
});

function PlatformPlans() {
  return (
    <div>
      <h2 className="text-sm font-semibold">Pricing control</h2>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        Prices, limits and the comparison table on the public pricing page. Changes go live
        immediately.
      </p>
      <PricingAdmin />
    </div>
  );
}
