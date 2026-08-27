import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatures } from "@/hooks/use-features";
import { FEATURE_LABEL, MODULE_FEATURE, type FeatureKey } from "@/lib/features";
import type { ModuleKey } from "@/lib/rbac";

/** Route prefix → feature, longest match first. */
const ROUTE_FEATURE: [string, FeatureKey][] = [
  ["/app/admissions", "admissions"],
  ["/app/tests", "tests"],
  ["/app/syllabus", "syllabus"],
  ["/app/timetable", "timetable"],
  ["/app/expenses", "expenses"],
  ["/app/salaries", "salaries"],
  ["/app/messages", "messages"],
  ["/app/reports", "reports"],
  ["/app/fees", "fees"],
  ["/app/group", "branches"],
];

export function featureForPath(pathname: string): FeatureKey | null {
  const hit = ROUTE_FEATURE.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? hit[1] : null;
}


/** Shown instead of a module the institute's plan does not include. */
export function FeatureLocked({ feature }: { feature: FeatureKey }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          {FEATURE_LABEL[feature]} is not on your plan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is switched off for your institute. Team Academix can enable it right away —
          call 70666 70222 or ask for an upgrade.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild size="sm">
            <a href="/pricing">See what&rsquo;s included</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Wrap children; renders the locked screen when the feature is off. */
export function FeatureGate({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const { isOn, loading } = useFeatures();
  const feature = featureForPath(pathname);
  if (!feature || loading || isOn(feature)) return <>{children}</>;
  return <FeatureLocked feature={feature} />;
}
