import { supabase } from "@/integrations/supabase/client";
import { FEATURES, FEATURE_GROUPS } from "@/lib/features";

export type CatalogPlan = {
  id: string;
  key: string;
  name: string;
  tagline: string;
  price_yearly: number | null;
  price_1y: number | null;
  price_3y: number | null;
  price_5y: number | null;
  price_note: string | null;
  show_price: boolean;
  student_limit: number;
  room_limit: number;
  batch_limit: number;
  faculty_limit: number;
  staff_login_limit: number;
  teacher_login_limit: number;
  custom_branding: boolean;
  attendance_devices: boolean;
  features: Record<string, boolean> | null;
  contact_only: boolean;
  highlight: boolean;
  visible: boolean;
  sort_order: number;
  cta: string;
};

/** Billing terms we sell. Everything is billed up front for the whole term. */
export type Term = 1 | 3 | 5;
export const TERMS: { years: Term; label: string }[] = [
  { years: 1, label: "1 year" },
  { years: 3, label: "3 years" },
  { years: 5, label: "5 years" },
];

/** Price for a term, falling back to the yearly price × years when unset. */
export function termPrice(p: CatalogPlan, years: Term): number | null {
  const base = p.price_1y ?? p.price_yearly;
  const raw = years === 1 ? base : years === 3 ? p.price_3y : p.price_5y;
  if (raw != null) return raw;
  return base == null ? null : base * years;
}

/** Whole-rupee saving against paying the 1-year price every year. */
export function termSaving(p: CatalogPlan, years: Term): number {
  const base = p.price_1y ?? p.price_yearly;
  const total = termPrice(p, years);
  if (!base || total == null || years === 1) return 0;
  const full = base * years;
  return full <= total ? 0 : Math.round(((full - total) / full) * 100);
}


/** true = tick, false = cross, string = short text value */
export type FeatureValue = boolean | string;

export type CatalogFeature = {
  id: string;
  group_name: string;
  label: string;
  sort_order: number;
  values: Record<string, FeatureValue>;
};

export async function fetchPlans(): Promise<CatalogPlan[]> {
  const { data, error } = await supabase.from("plan_catalog").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as CatalogPlan[];
}

export async function fetchFeatures(): Promise<CatalogFeature[]> {
  const { data, error } = await supabase.from("plan_features").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...(r as unknown as CatalogFeature),
    values: ((r as { values: unknown }).values ?? {}) as Record<string, FeatureValue>,
  }));
}

/** Feature rows grouped by their group heading, order preserved. */
export function groupFeatures(rows: CatalogFeature[]) {
  const out: { group: string; rows: CatalogFeature[] }[] = [];
  rows.forEach((r) => {
    const last = out[out.length - 1];
    if (last && last.group === r.group_name) last.rows.push(r);
    else out.push({ group: r.group_name, rows: [r] });
  });
  return out;
}

/**
 * What the public comparison table shows: the module switches Team Academix
 * sets per plan (plan_catalog.features), plus any extra rows typed into the
 * console (plan_features). Both come straight from the database, so anything
 * changed in the console appears here immediately.
 */
export function comparisonGroups(plans: CatalogPlan[], extra: CatalogFeature[]) {
  const moduleGroups = FEATURE_GROUPS.map((g) => ({
    group: g as string,
    rows: FEATURES.filter((f) => f.group === g).map((f) => ({
      id: `module-${f.key}`,
      group_name: g as string,
      label: f.label,
      sort_order: 0,
      values: Object.fromEntries(
        plans.map((p) => [p.key, (p.features as Record<string, boolean> | null)?.[f.key] !== false]),
      ) as Record<string, FeatureValue>,
    })),
  }));

  const limitRow = (label: string, pick: (p: CatalogPlan) => number): CatalogFeature => ({
    id: `limit-${label}`,
    group_name: "Capacity",
    label,
    sort_order: 0,
    values: Object.fromEntries(
      plans.map((p) => {
        const n = pick(p);
        return [p.key, n === 0 ? "Unlimited" : n.toLocaleString("en-IN")];
      }),
    ) as Record<string, FeatureValue>,
  });

  const capacity = {
    group: "Capacity",
    rows: [
      limitRow("Students", (p) => p.student_limit),
      limitRow("Classrooms", (p) => p.room_limit),
      limitRow("Batches", (p) => p.batch_limit),
      limitRow("Teachers", (p) => p.faculty_limit),
      limitRow("Office logins", (p) => p.staff_login_limit),
      limitRow("Teacher logins", (p) => p.teacher_login_limit),
    ],
  };

  return [capacity, ...moduleGroups, ...groupFeatures(extra)].filter((g) => g.rows.length > 0);
}


export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
