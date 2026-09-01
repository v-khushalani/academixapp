import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GlobalFeatureFlags } from "@/components/app/platform-features";
import { PlanControl } from "@/components/app/platform/institute-detail";
import { usePlatformInstitutes } from "@/components/app/platform/shared";

export const Route = createFileRoute("/app/platform/features")({
  component: PlatformFeatures,
});

function PlatformFeatures() {
  const { data: institutes = [] } = usePlatformInstitutes();
  const [id, setId] = useState<string>("");
  const chosen = institutes.find((i) => i.id === id) ?? null;

  return (
    <div className="space-y-4">
      <GlobalFeatureFlags />

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          One institute at a time
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Give a single institute a module their plan does not include, or take one away. Their plan
          and limits stay untouched.
        </p>
        <select
          aria-label="Institute"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="mt-2 h-9 w-full max-w-sm rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">Choose an institute…</option>
          {institutes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      {chosen && <PlanControl key={chosen.id} institute={chosen} featuresOnly />}
    </div>
  );
}
