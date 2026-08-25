import type { ModuleKey } from "@/lib/rbac";

/**
 * Sellable modules. Team Academix controls these per institute (bargains,
 * one-off sweeteners) and network-wide (staged rollout / emergency off).
 *
 * Resolution order: global switch OFF wins over everything; then the
 * institute's own map; a missing key means ON (legacy institutes keep access).
 */
export type FeatureKey =
  | "admissions"
  | "tests"
  | "syllabus"
  | "timetable"
  | "expenses"
  | "reports"
  | "messages"
  | "portal"
  | "devices"
  | "branding"
  | "branches"
  | "bulk_import"
  | "receipts";

export type FeatureMap = Partial<Record<FeatureKey, boolean>>;

export const FEATURES: { key: FeatureKey; label: string; hint: string }[] = [
  { key: "admissions", label: "Admissions CRM", hint: "Enquiry + admission QR, funnel, approvals" },
  { key: "tests", label: "Tests & marks", hint: "Exams, marks entry, result sheets" },
  { key: "syllabus", label: "Syllabus tracking", hint: "Chapter progress per batch" },
  { key: "timetable", label: "Timetable", hint: "Rooms × periods grid, day plan" },
  { key: "expenses", label: "Expenses & salaries", hint: "Spend log and teacher salaries" },
  { key: "reports", label: "Reports", hint: "Collection, attendance and result reports" },
  { key: "messages", label: "WhatsApp messaging", hint: "Reminders, alerts, message log" },
  { key: "portal", label: "Student & parent portal", hint: "Family logins" },
  { key: "devices", label: "Attendance machines", hint: "RFID / biometric punch-in" },
  { key: "branding", label: "Custom branding", hint: "Logo and colours on app + receipts" },
  { key: "branches", label: "Multi-branch group", hint: "Group dashboard across branches" },
  { key: "bulk_import", label: "Bulk import", hint: "Excel/CSV student import" },
  { key: "receipts", label: "Receipts & print kit", hint: "Printable receipts and posters" },
];

export const FEATURE_LABEL = Object.fromEntries(FEATURES.map((f) => [f.key, f.label])) as Record<
  FeatureKey,
  string
>;

/** Which console module each feature gates. Modules absent here are always on. */
export const MODULE_FEATURE: Partial<Record<ModuleKey, FeatureKey>> = {
  admissions: "admissions",
  tests: "tests",
  syllabus: "syllabus",
  timetable: "timetable",
  expenses: "expenses",
  messages: "messages",
  reports: "reports",
};

export function isFeatureOn(map: FeatureMap | null | undefined, key: FeatureKey): boolean {
  return map?.[key] !== false;
}

/** Merge institute choices with global kill switches. */
export function resolveFeatures(
  institute: Record<string, unknown> | null | undefined,
  globalOff: string[],
): FeatureMap {
  const out: FeatureMap = {};
  for (const f of FEATURES) {
    const own = institute?.[f.key];
    out[f.key] = globalOff.includes(f.key) ? false : own !== false;
  }
  return out;
}
