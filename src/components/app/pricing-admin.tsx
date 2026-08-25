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
import { FeatureChips } from "@/components/app/platform-features";
import type { FeatureMap } from "@/lib/features";

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
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className="rounded-md border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Plan name"><Input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && savePlan(p.id, { name: e.target.value })} /></Labeled>
                <Labeled label="Internal ₹ / year"><Input type="number" min={0} defaultValue={p.price_yearly ?? 0} onBlur={(e) => savePlan(p.id, { price_yearly: Number(e.target.value) })} /></Labeled>
                <Labeled label="Tagline" wide><Input defaultValue={p.tagline} onBlur={(e) => e.target.value !== p.tagline && savePlan(p.id, { tagline: e.target.value })} /></Labeled>
                {([
                  ["Students", "student_limit"], ["Classrooms", "room_limit"], ["Batches", "batch_limit"],
                  ["Teachers", "faculty_limit"],
                  ["Office logins", "staff_login_limit"], ["Teacher logins", "teacher_login_limit"],
                ] as const).map(([label, key]) => (
                  <Labeled key={key} label={label}><Input type="number" min={0} defaultValue={p[key]} onBlur={(e) => savePlan(p.id, { [key]: Math.max(0, Number(e.target.value)) })} /></Labeled>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Toggle active={p.custom_branding} onClick={() => savePlan(p.id, { custom_branding: !p.custom_branding })}>Custom branding</Toggle>
                <Toggle active={p.attendance_devices} onClick={() => savePlan(p.id, { attendance_devices: !p.attendance_devices })}>Attendance machines</Toggle>
                <Toggle active={p.highlight} onClick={() => savePlan(p.id, { highlight: !p.highlight })}>Popular</Toggle>
                <Toggle active={p.visible} onClick={() => savePlan(p.id, { visible: !p.visible })}>Visible</Toggle>
                <Toggle active={p.contact_only} onClick={() => savePlan(p.id, { contact_only: !p.contact_only })}>Sales only</Toggle>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Modules included by default
                </p>
                <div className="mt-2">
                  <FeatureChips
                    value={(p.features ?? {}) as FeatureMap}
                    onChange={(next) => savePlan(p.id, { features: next as Record<string, boolean> })}
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Key: {p.key} · 0 means unlimited</p>
            </div>
          ))}
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

function Labeled({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`space-y-1 text-xs text-muted-foreground ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}</label>;
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>{children}: {active ? "On" : "Off"}</Button>;
}
