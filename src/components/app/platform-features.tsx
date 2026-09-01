import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ALWAYS_ON,
  FEATURE_GROUPS,
  FEATURES,
  type FeatureKey,
  type FeatureMap,
} from "@/lib/features";

type Flag = { key: string; enabled: boolean; note: string | null };

async function fetchFlags(): Promise<Flag[]> {
  const { data, error } = await supabase
    .from("platform_feature_flags")
    .select("key, enabled, note")
    .order("key");
  if (error) throw error;
  return (data ?? []) as Flag[];
}

/** Network-wide kill switches. Off here = off for every institute. */
export function GlobalFeatureFlags() {
  const qc = useQueryClient();
  const { data: flags = [] } = useQuery({ queryKey: ["platform-flags"], queryFn: fetchFlags });

  async function toggle(key: string, enabled: boolean) {
    const { error } = await supabase
      .from("platform_feature_flags")
      .upsert({ key, enabled }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["platform-flags"] });
    await qc.invalidateQueries({ queryKey: ["resolved-features"] });
    toast.success(`${key} ${enabled ? "enabled" : "disabled"} network-wide`);
  }

  const state = (key: string) => flags.find((f) => f.key === key)?.enabled !== false;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Network-wide switches
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Turning a module off here hides it for every institute, whatever their plan says. Use it
          for a staged rollout or an emergency stop.
        </p>
        {FEATURE_GROUPS.map((g) => (
          <div key={g} className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.filter((f) => f.group === g).map((f) => {
                const on = state(f.key);
                return (
                  <div
                    key={f.key}
                    className="flex items-start justify-between gap-2 rounded-md border border-border p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{f.hint}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => void toggle(f.key, !on)}
                    >
                      {on ? "On" : "Off"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Always included
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Every institute gets these — they cannot be switched off.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALWAYS_ON.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-2 rounded-md border border-dashed border-border p-2 text-muted-foreground"
            >
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{f.label}</p>
                <p className="truncate text-[11px]">{f.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Per-institute module switches, grouped. Missing key = on. */
export function FeatureMatrix({
  value,
  defaults,
  onChange,
}: {
  value: FeatureMap;
  defaults?: FeatureMap;
  onChange: (next: FeatureMap) => void;
}) {
  const isOn = (k: FeatureKey) => value[k] !== false;
  return (
    <div className="space-y-3">
      {FEATURE_GROUPS.map((g) => (
        <div key={g}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {g}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FEATURES.filter((f) => f.group === g).map((f) => {
              const on = isOn(f.key);
              const offByPlan = defaults?.[f.key] === false;
              return (
                <Button
                  key={f.key}
                  size="sm"
                  variant={on ? "default" : "outline"}
                  title={offByPlan ? `${f.hint} · not in this plan by default` : f.hint}
                  onClick={() => onChange({ ...value, [f.key]: !on })}
                >
                  {f.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
