import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
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
import { FEATURES, FEATURE_GROUPS } from "@/lib/features";

const LIMIT_ROWS = [
  ["Students", "student_limit"],
  ["Classrooms", "room_limit"],
  ["Batches", "batch_limit"],
  ["Teachers", "faculty_limit"],
  ["Office logins", "staff_login_limit"],
  ["Teacher logins", "teacher_login_limit"],
] as const;

const FLAG_ROWS = [
  ["Custom branding", "custom_branding"],
  ["Attendance machines", "attendance_devices"],
  ["Popular badge", "highlight"],
  ["Visible on pricing page", "visible"],
  ["Sales-led (Talk to us)", "contact_only"],
] as const;

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
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pricing-plans"] });
    qc.invalidateQueries({ queryKey: ["pricing-features"] });
    qc.invalidateQueries({ queryKey: ["platform-institutes"] });
    qc.invalidateQueries({ queryKey: ["resolved-features"] });
  };

  async function savePlan(p: CatalogPlan, patch: Partial<CatalogPlan>) {
    setBusy(true);
    const { error } = await supabase.from("plan_catalog").update(patch).eq("id", p.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${p.name} updated · institutes on this plan synced`);
    refresh();
  }

  async function pushPlan(p: CatalogPlan) {
    const { data, error } = await supabase.rpc("platform_push_plan", { _key: p.key });
    if (error) return toast.error(error.message);
    toast.success(`${p.name} pushed to ${data ?? 0} institute(s)`);
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

  const colCount = plans.length + 1;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Plan matrix — every value here is live
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Change a number or a module and every institute on that plan is updated instantly. 0 means
          unlimited. Prices stay internal — the public page shows “Talk to us”.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left text-xs uppercase text-muted-foreground">
                  Feature
                </th>
                {plans.map((p) => (
                  <th key={p.id} className="px-2 py-2 align-top">
                    <Input
                      defaultValue={p.name}
                      className="h-8 text-center font-semibold"
                      onBlur={(e) =>
                        e.target.value !== p.name && savePlan(p, { name: e.target.value })
                      }
                    />
                    <Input
                      defaultValue={p.tagline}
                      className="mt-1 h-7 text-center text-[11px]"
                      onBlur={(e) =>
                        e.target.value !== p.tagline && savePlan(p, { tagline: e.target.value })
                      }
                    />
                    <p className="mt-1 text-[10px] font-normal text-muted-foreground">{p.key}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SectionRow title="Pricing" span={colCount} />
              <tr className="border-t border-border">
                <RowHead>Internal ₹ / year</RowHead>
                {plans.map((p) => (
                  <Cell key={p.id}>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={p.price_yearly ?? 0}
                      className="mx-auto h-8 w-28 text-center"
                      onBlur={(e) => savePlan(p, { price_yearly: Number(e.target.value) })}
                    />
                  </Cell>
                ))}
              </tr>

              <SectionRow title="Limits (0 = unlimited)" span={colCount} />
              {LIMIT_ROWS.map(([label, key]) => (
                <tr key={key} className="border-t border-border">
                  <RowHead>{label}</RowHead>
                  {plans.map((p) => (
                    <Cell key={p.id}>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={p[key]}
                        className="mx-auto h-8 w-24 text-center"
                        onBlur={(e) =>
                          Number(e.target.value) !== p[key] &&
                          savePlan(p, { [key]: Math.max(0, Number(e.target.value)) })
                        }
                      />
                    </Cell>
                  ))}
                </tr>
              ))}

              <SectionRow title="Plan settings" span={colCount} />
              {FLAG_ROWS.map(([label, key]) => (
                <tr key={key} className="border-t border-border">
                  <RowHead>{label}</RowHead>
                  {plans.map((p) => (
                    <Cell key={p.id}>
                      <TickButton on={!!p[key]} onClick={() => savePlan(p, { [key]: !p[key] })} />
                    </Cell>
                  ))}
                </tr>
              ))}

              {FEATURE_GROUPS.map((g) => (
                <FeatureGroupRows
                  key={g}
                  group={g}
                  plans={plans}
                  colCount={colCount}
                  onToggle={(p, k, on) =>
                    savePlan(p, {
                      features: { ...((p.features ?? {}) as Record<string, boolean>), [k]: on },
                    })
                  }
                />
              ))}

              <SectionRow title="Extra comparison rows (public page only)" span={colCount} />
              {features.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <Input
                        defaultValue={r.label}
                        className="h-8 w-full min-w-[180px]"
                        onBlur={(e) =>
                          e.target.value !== r.label && saveFeature(r, { label: e.target.value })
                        }
                      />
                      <Input
                        defaultValue={r.group_name}
                        className="h-8 w-28 shrink-0 text-[11px]"
                        onBlur={(e) =>
                          e.target.value !== r.group_name &&
                          saveFeature(r, { group_name: e.target.value })
                        }
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeFeature(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                  {plans.map((p) => {
                    const v = r.values?.[p.key];
                    return (
                      <Cell key={p.id}>
                        {typeof v === "string" ? (
                          <Input
                            defaultValue={v}
                            placeholder="text"
                            className="mx-auto h-8 w-24 text-center"
                            onBlur={(e) =>
                              saveFeature(r, { values: { ...r.values, [p.key]: e.target.value } })
                            }
                            onDoubleClick={() =>
                              saveFeature(r, { values: { ...r.values, [p.key]: true } })
                            }
                          />
                        ) : (
                          <TickButton
                            on={v === true}
                            onClick={() =>
                              saveFeature(r, { values: { ...r.values, [p.key]: nextValue(v) } })
                            }
                          />
                        )}
                      </Cell>
                    );
                  })}
                </tr>
              ))}

              <tr className="border-t border-border">
                <RowHead>Sync now</RowHead>
                {plans.map((p) => (
                  <Cell key={p.id}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void pushPlan(p)}
                    >
                      Push to institutes
                    </Button>
                  </Cell>
                ))}
              </tr>
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
            placeholder="New comparison row"
            className="h-9 w-64"
          />
          <Button size="sm" onClick={addFeature} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add row
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Tap a tick to cycle tick → cross → text. Double-click a text cell to make it a tick.
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureGroupRows({
  group,
  plans,
  colCount,
  onToggle,
}: {
  group: string;
  plans: CatalogPlan[];
  colCount: number;
  onToggle: (p: CatalogPlan, key: string, on: boolean) => void;
}) {
  const rows = FEATURES.filter((f) => f.group === group);
  return (
    <>
      <SectionRow title={`Modules · ${group}`} span={colCount} />
      {rows.map((f) => (
        <tr key={f.key} className="border-t border-border">
          <RowHead hint={f.hint}>{f.label}</RowHead>
          {plans.map((p) => {
            const on = (p.features as Record<string, boolean> | null)?.[f.key] !== false;
            return (
              <Cell key={p.id}>
                <TickButton on={on} onClick={() => onToggle(p, f.key, !on)} />
              </Cell>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function SectionRow({ title, span }: { title: string; span: number }) {
  return (
    <tr>
      <td
        colSpan={span}
        className="sticky left-0 bg-muted/60 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {title}
      </td>
    </tr>
  );
}

function RowHead({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <td className="sticky left-0 z-10 bg-card px-2 py-1.5" title={hint}>
      <span className="text-sm">{children}</span>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </td>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1.5 text-center">{children}</td>;
}

function TickButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={on ? "Included" : "Not included"}
      onClick={onClick}
      className="mx-auto grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
    >
      {on ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
