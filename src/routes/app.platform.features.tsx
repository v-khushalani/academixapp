import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { GlobalFeatureFlags } from "@/components/app/platform-features";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/platform/features")({
  component: PlatformFeatures,
});

function PlatformFeatures() {
  return (
    <div className="space-y-4">
      <GlobalFeatureFlags />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            One institute at a time
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Exceptions for a single institute live on its own page, next to its plan and limits.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="ml-auto gap-1">
          <Link to="/app/platform/institutes">
            Open institutes
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
