import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Minus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFeatures,
  fetchPlans,
  type CatalogFeature,
  type CatalogPlan,
  type FeatureValue,
} from "@/lib/pricing-catalog";

/** Cycle: tick -> cross -> text -> tick */
function nextValue(v: FeatureValue | undefined): FeatureValue {
  if (v === true) return false;
  if (v === false || v == null) return "";
  return true;
}

export function PricingAdmin() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["pricing-plans"], queryFn: fetchPlans });
  const { data: features = [] } = useQuery({
    queryKey: ["pricing-features"],
    queryFn: fetchFeatures,
  });
  const [newLabel, setNewLabel] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pricing-plans"] });
    qc.invalidateQueries({ queryKey: ["pricing-features"] });
  };

  async function savePlan(id: string, patch: Partial<CatalogPlan>) {
    const { error } = await supabase.from("plan_catalog").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function saveFeature(row: CatalogFeature, patch: Partial<CatalogFeature>) {
    const { error } = await supabase.from("plan_features").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function addFeature() {
    if (!newLabel.trim()) return;
    const { error } = await supabase.from("plan_features").insert({
      label: newLabel.trim(),
      group_name: newGroup.trim() || "Features",
      sort_order: (features[features.length - 1]?.sort_order ?? 0) + 10,
      values: {},
    });
    if (error) return toast.error(error.message);
    setNewLabel("");
    refresh();
  }

  async function removeFeature(id: string) {
    const { error } = await supabase.from("plan_features").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Plans & limits (live on the public pricing page)
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Prices are internal only — the public page shows “Talk to us” instead of an amount.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5">Plan</th>
                <th className="px-2 py-1.5">Tagline</th>
                <th className="px-2 py-1.5">₹ / year (internal)</th>
                <th className="px-2 py-1.5">Students</th>
                <th className="px-2 py-1.5">Rooms</th>
                <th className="px-2 py-1.5">Popular</th>
                <th className="px-2 py-1.5">Visible</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-2 py-2">
                    <Input
                      defaultValue={p.name}
                      className="h-8 w-32"
                      onBlur={(e) =>
                        e.target.value !== p.name && savePlan(p.id, { name: e.target.value })
                      }
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">{p.key}</p>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      defaultValue={p.tagline}
                      className="h-8 w-full sm:min-w-[220px]"
                      onBlur={(e) =>
                        e.target.value !== p.tagline && savePlan(p.id, { tagline: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      defaultValue={p.price_yearly ?? 0}
                      className="h-8 w-24"
                      onBlur={(e) => savePlan(p.id, { price_yearly: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      defaultValue={p.student_limit}
                      className="h-8 w-24"
                      onBlur={(e) => savePlan(p.id, { student_limit: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      defaultValue={p.room_limit}
                      className="h-8 w-20"
                      onBlur={(e) => savePlan(p.id, { room_limit: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      size="sm"
                      variant={p.highlight ? "default" : "outline"}
                      onClick={() => savePlan(p.id, { highlight: !p.highlight })}
                    >
                      {p.highlight ? "Yes" : "No"}
                    </Button>
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      size="sm"
                      variant={p.visible ? "default" : "outline"}
                      onClick={() => savePlan(p.id, { visible: !p.visible })}
                    >
                      {p.visible ? "Shown" : "Hidden"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Comparison table — tap a cell to cycle tick → cross → text
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5">Group</th>
                <th className="px-2 py-1.5">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="px-2 py-1.5 text-center">
                    {p.name}
                  </th>
                ))}
                <th className="px-2 py-1.5">Order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {features.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <Input
                      defaultValue={r.group_name}
                      className="h-8 w-36"
                      onBlur={(e) =>
                        e.target.value !== r.group_name &&
                        saveFeature(r, { group_name: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      defaultValue={r.label}
                      className="h-8 w-full sm:min-w-[240px]"
                      onBlur={(e) =>
                        e.target.value !== r.label && saveFeature(r, { label: e.target.value })
                      }
                    />
                  </td>
                  {plans.map((p) => {
                    const v = r.values?.[p.key];
                    return (
                      <td key={p.id} className="px-2 py-1.5 text-center">
                        {typeof v === "string" ? (
                          <Input
                            defaultValue={v}
                            placeholder="text"
                            className="h-8 w-24"
                            onBlur={(e) =>
                              saveFeature(r, {
                                values: { ...r.values, [p.key]: e.target.value },
                              })
                            }
                            onDoubleClick={() =>
                              saveFeature(r, { values: { ...r.values, [p.key]: true } })
                            }
                          />
                        ) : (
                          <button
                            type="button"
                            aria-label="toggle"
                            className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
                            onClick={() =>
                              saveFeature(r, {
                                values: { ...r.values, [p.key]: nextValue(v) },
                              })
                            }
                          >
                            {v === true ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      defaultValue={r.sort_order}
                      className="h-8 w-20"
                      onBlur={(e) => saveFeature(r, { sort_order: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button size="icon" variant="ghost" onClick={() => removeFeature(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="Group (e.g. Automation)"
            className="h-9 w-48"
          />
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New feature row"
            className="h-9 w-64"
          />
          <Button size="sm" onClick={addFeature} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add row
          </Button>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Minus className="h-3 w-3" /> Double-click a text cell to turn it back into a tick.
          </span>
        </div>
      </div>
    </div>
  );
}
