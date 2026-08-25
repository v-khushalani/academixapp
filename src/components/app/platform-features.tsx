import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FEATURES, type FeatureKey, type FeatureMap } from "@/lib/features";

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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Network-wide switches
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Turning a module off here hides it for every institute, whatever their plan says. Use it for
        a staged rollout or an emergency stop.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
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
  );
}

/** Per-institute module chips used inside the plan editor. */
export function FeatureChips({
  value,
  onChange,
}: {
  value: FeatureMap;
  onChange: (next: FeatureMap) => void;
}) {
  const isOn = (k: FeatureKey) => value[k] !== false;
  return (
    <div className="flex flex-wrap gap-1.5">
      {FEATURES.map((f) => (
        <Button
          key={f.key}
          size="sm"
          variant={isOn(f.key) ? "default" : "outline"}
          title={f.hint}
          onClick={() => onChange({ ...value, [f.key]: !isOn(f.key) })}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
