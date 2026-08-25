import { supabase } from "@/integrations/supabase/client";

export type CatalogPlan = {
  id: string;
  key: string;
  name: string;
  tagline: string;
  price_yearly: number | null;
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
  const { data, error } = await supabase
    .from("plan_catalog")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as CatalogPlan[];
}

export async function fetchFeatures(): Promise<CatalogFeature[]> {
  const { data, error } = await supabase
    .from("plan_features")
    .select("*")
    .order("sort_order");
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

export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}