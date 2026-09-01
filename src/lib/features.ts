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
  | "homework"
  | "fees"
  | "expenses"
  | "salaries"
  | "receipts"
  | "reports"
  | "messages"
  | "teacher_portal"
  | "student_portal"
  | "parent_portal"
  | "invites"
  | "devices"
  | "branding"
  | "branches"
  | "bulk_import";

export type FeatureMap = Partial<Record<FeatureKey, boolean>>;

export type FeatureGroup = "Academics" | "Money" | "People" | "Extras";

export const FEATURE_GROUPS: FeatureGroup[] = ["Academics", "Money", "People", "Extras"];

export const FEATURES: { key: FeatureKey; label: string; hint: string; group: FeatureGroup }[] = [
  {
    key: "admissions",
    label: "Admissions CRM",
    hint: "Enquiry + admission QR, funnel, approvals",
    group: "Academics",
  },
  {
    key: "tests",
    label: "Tests & marks",
    hint: "Exams, marks entry, result sheets",
    group: "Academics",
  },
  {
    key: "syllabus",
    label: "Syllabus tracking",
    hint: "Chapter progress per batch",
    group: "Academics",
  },
  {
    key: "timetable",
    label: "Timetable",
    hint: "Rooms × periods grid, day plan",
    group: "Academics",
  },
  {
    key: "homework",
    label: "Homework",
    hint: "Homework posted to the student portal",
    group: "Academics",
  },
  { key: "fees", label: "Fees & collections", hint: "Fee plans, payments, dues", group: "Money" },
  {
    key: "expenses",
    label: "Expenses",
    hint: "Day-to-day spend log",
    group: "Money",
  },
  { key: "salaries", label: "Teacher salaries", hint: "Monthly salary runs", group: "Money" },
  {
    key: "receipts",
    label: "Receipts & print kit",
    hint: "Printable receipts and posters",
    group: "Money",
  },
  {
    key: "reports",
    label: "Reports",
    hint: "Collection, attendance and result reports",
    group: "Money",
  },
  {
    key: "teacher_portal",
    label: "Teacher portal",
    hint: "Teacher logins for attendance, marks, syllabus",
    group: "People",
  },
  {
    key: "student_portal",
    label: "Student portal",
    hint: "Student logins",
    group: "People",
  },
  {
    key: "parent_portal",
    label: "Parent portal",
    hint: "Parent logins with fees and alerts",
    group: "People",
  },
  {
    key: "invites",
    label: "Invite links",
    hint: "WhatsApp invites for teachers and families",
    group: "People",
  },
  {
    key: "messages",
    label: "WhatsApp messaging",
    hint: "Reminders, alerts, message log",
    group: "Extras",
  },
  {
    key: "devices",
    label: "Attendance machines",
    hint: "RFID / biometric punch-in",
    group: "Extras",
  },
  {
    key: "branding",
    label: "Custom branding",
    hint: "Logo and colours on app + receipts",
    group: "Extras",
  },
  {
    key: "branches",
    label: "Multi-branch group",
    hint: "Group dashboard across branches",
    group: "Extras",
  },
  { key: "bulk_import", label: "Bulk import", hint: "Excel/CSV student import", group: "Extras" },
];

/** Shown in the console so the whole surface is visible, but never switchable. */
export const ALWAYS_ON: { label: string; hint: string }[] = [
  { label: "Dashboard", hint: "Daily overview for every role" },
  { label: "Students", hint: "Student records and profiles" },
  { label: "Batches", hint: "Batches and enrolment" },
  { label: "Attendance", hint: "Daily attendance marking" },
  { label: "Settings", hint: "Institute setup and team access" },
];

export const FEATURE_LABEL = Object.fromEntries(FEATURES.map((f) => [f.key, f.label])) as Record<
  FeatureKey,
  string
>;

const FEATURE_KEYS = FEATURES.map((f) => f.key);


/** Which console module each feature gates. Modules absent here are always on. */
export const MODULE_FEATURE: Partial<Record<ModuleKey, FeatureKey>> = {
  admissions: "admissions",
  tests: "tests",
  syllabus: "syllabus",
  timetable: "timetable",
  expenses: "expenses",
  messages: "messages",
  reports: "reports",
  fees: "fees",
};

/** Teacher portal nav → feature. */
export const TEACH_FEATURE: Record<string, FeatureKey> = {
  "/teach/marks": "tests",
  "/teach/syllabus": "syllabus",
};

/** Family portal nav → feature. */
export const PORTAL_FEATURE: Record<string, FeatureKey> = {
  "/portal/fees": "fees",
  "/portal/homework": "homework",
  "/portal/progress": "tests",
  "/portal/timetable": "timetable",
};

export function isFeatureOn(map: FeatureMap | null | undefined, key: FeatureKey): boolean {
  return map?.[key] !== false;
}

/** Merge institute choices with global kill switches. */
export function resolveFeatures(
  institute: Record<string, unknown> | null | undefined,
  globalOff: string[],
): FeatureMap {
  // Legacy institutes carried a single "portal" key for both family logins.
  const legacyPortalOff = institute?.["portal"] === false;
  const out: FeatureMap = {};
  for (const f of FEATURES) {
    let own = institute?.[f.key];
    if (own === undefined && legacyPortalOff && (f.key === "student_portal" || f.key === "parent_portal")) {
      own = false;
    }
    out[f.key] = globalOff.includes(f.key) ? false : own !== false;
  }
  return out;
}
