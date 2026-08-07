/** Subscription tiers. Yearly terms only — advisory until billing is wired. */
export type PlanKey = "free" | "growth" | "campus" | "chain";

export type Term = {
  /** length of the commitment in years */
  years: 1 | 3 | 5;
  /** total price for the whole term, null for custom-quote plans */
  price: number | null;
  /** % saved against paying 1 year at a time */
  save: number;
};

export type Plan = {
  key: PlanKey;
  name: string;
  /** classroom limit */
  rooms: number;
  /** student limit */
  students: number;
  /** office/admin logins included (0 = unlimited) */
  staffLogins: number;
  /** teacher logins included (0 = unlimited) */
  teacherLogins: number;
  /** batches included (0 = unlimited) */
  batches: number;
  /** price for one year, 0 for free, null for custom */
  priceYearly: number | null;
  /** yearly-only terms with multi-year discounts */
  terms: Term[];
  blurb: string;
  tagline: string;
  cta: string;
  /** what this plan adds on top of the previous one (Free lists everything) */
  adds: string[];
};

const FREE_FEATURES = [
  "QR / link admissions with approval flow",
  "Enquiry pipeline & follow-ups",
  "100 students · 3 classrooms · 5 batches",
  "2 office logins · 5 teacher logins · unlimited parent & student portals",
  "Batch fee auto-assign with scholarships",
  "Attendance with instant parent message",
  "Fee collection, receipts, UPI QR, defaulters list",
  "Tests & marks entry by teachers",
  "Chapter-level syllabus tracker",
  "Multi-room timetable with clash detection",
  "Teacher, parent & student portals",
  "WhatsApp messaging (manual send, no API cost)",
  "CSV import & export of everything",
];

const GROWTH_ADDS = [
  "500 students · 10 classrooms · unlimited batches",
  "6 office logins · 25 teacher logins",
  "Automated WhatsApp fee reminders & absentee alerts",
  "RFID card & biometric attendance machines",
  "Defaulter follow-up sequences",
  "Full reports: revenue, collection, attendance %, batch & teacher load",
  "Student progress report cards (PDF)",
  "Timetable share as WhatsApp image",
  "Bulk messaging to a batch or filter",
  "Branded receipts & documents with your logo",
  "Custom fee heads and instalment plans",
  "Email support within 24 hours",
];

const CAMPUS_ADDS = [
  "1,500 students · 30 classrooms",
  "20 office logins · unlimited teacher logins",
  "Granular role-based permissions per staff member",
  "Audit log of who changed what",
  "Teacher performance & syllabus-coverage dashboard",
  "Attendance and fee analytics with trends & forecasting",
  "Custom fields on students and admissions",
  "API / webhook access",
  "Priority support on a WhatsApp line",
  "Assisted onboarding & data migration",
];

const CHAIN_ADDS = [
  "Unlimited students & classrooms",
  "Branch-wise rollup reporting",
  "Cross-branch student transfer",
  "Consolidated finance across branches",
  "Dedicated onboarding manager",
  "Custom branding & your own domain",
];

const freeTerms: Term[] = [
  { years: 1, price: 0, save: 0 },
  { years: 3, price: 0, save: 0 },
  { years: 5, price: 0, save: 0 },
];

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free forever",
    rooms: 3,
    students: 100,
    staffLogins: 2,
    teacherLogins: 5,
    batches: 5,
    priceYearly: 0,
    terms: freeTerms,
    blurb: "100 students · 3 classrooms",
    tagline: "The entire daily operation. Permanently free.",
    cta: "Start free",
    adds: FREE_FEATURES,
  },
  {
    key: "growth",
    name: "Growth",
    rooms: 10,
    students: 500,
    staffLogins: 6,
    teacherLogins: 25,
    batches: 0,
    priceYearly: 4990,
    terms: [
      { years: 1, price: 4990, save: 0 },
      { years: 3, price: 11990, save: 20 },
      { years: 5, price: 17490, save: 30 },
    ],
    blurb: "500 students · 10 classrooms",
    tagline: "Scale, automation and insight for one centre.",
    cta: "Choose Growth",
    adds: GROWTH_ADDS,
  },
  {
    key: "campus",
    name: "Campus",
    rooms: 30,
    students: 1500,
    staffLogins: 20,
    teacherLogins: 0,
    batches: 0,
    priceYearly: 12990,
    terms: [
      { years: 1, price: 12990, save: 0 },
      { years: 3, price: 30990, save: 20 },
      { years: 5, price: 44990, save: 31 },
    ],
    blurb: "1,500 students · 30 classrooms",
    tagline: "Many staff, many batches, full accountability.",
    cta: "Choose Campus",
    adds: CAMPUS_ADDS,
  },
  {
    key: "chain",
    name: "Chain",
    rooms: 999,
    students: 999999,
    staffLogins: 0,
    teacherLogins: 0,
    batches: 0,
    priceYearly: null,
    terms: [
      { years: 1, price: null, save: 0 },
      { years: 3, price: null, save: 0 },
      { years: 5, price: null, save: 0 },
    ],
    blurb: "Unlimited · multi-branch",
    tagline: "Multiple branches on one dashboard.",
    cta: "Talk to us",
    adds: CHAIN_ADDS,
  },
];

export const TERM_YEARS: Array<1 | 3 | 5> = [1, 3, 5];

export const TERM_LABEL: Record<number, string> = {
  1: "1 year",
  3: "3 years",
  5: "5 years",
};

/** Extra benefits that come with longer commitments. */
export const TERM_PERKS: Record<number, string[]> = {
  1: ["Price locked for the year", "Cancel at renewal, export everything"],
  3: [
    "Price locked for all 3 years",
    "Free data migration from your current system",
    "One branded-document setup included",
  ],
  5: [
    "Price locked for all 5 years",
    "Free data migration + branded-document setup",
    "Priority support at Growth price",
    "Every new module launched during your term, free",
  ],
};

export function termFor(plan: Plan, years: number): Term {
  return plan.terms.find((t) => t.years === years) ?? plan.terms[0];
}

/** Feature matrix rows shared by the pricing page. */
export const PLAN_FEATURE_MATRIX: { group: string; rows: { label: string; v: (boolean | string)[] }[] }[] = [
  {
    group: "Daily operation",
    rows: [
      { label: "Admissions, enquiries, students, batches", v: [true, true, true, true] },
      { label: "Attendance & fee collection", v: [true, true, true, true] },
      { label: "Tests, marks, syllabus tracker", v: [true, true, true, true] },
      { label: "Timetable with clash detection", v: [true, true, true, true] },
      { label: "Parent & student portals", v: ["Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
      { label: "WhatsApp messaging (manual send)", v: [true, true, true, true] },
      { label: "Office / admin logins", v: ["2", "6", "20", "Unlimited"] },
      { label: "Teacher logins", v: ["5", "25", "Unlimited", "Unlimited"] },
    ],
  },
  {
    group: "Scale",
    rows: [
      { label: "Students included", v: ["100", "500", "1,500", "Unlimited"] },
      { label: "Classrooms", v: ["3", "10", "30", "Unlimited"] },
      { label: "Batches", v: ["5", "Unlimited", "Unlimited", "Unlimited"] },
      { label: "Branches", v: ["1", "1", "1", "Unlimited"] },
    ],
  },
  {
    group: "Automation",
    rows: [
      { label: "Scheduled WhatsApp fee reminders", v: [false, true, true, true] },
      { label: "Absentee alerts on autopilot", v: [false, true, true, true] },
      { label: "Defaulter follow-up sequences", v: [false, true, true, true] },
      { label: "Bulk messaging by batch or filter", v: [false, true, true, true] },
      { label: "RFID card / biometric attendance machines", v: [false, true, true, true] },
    ],
  },
  {
    group: "Insight & branding",
    rows: [
      { label: "Full reports suite", v: [false, true, true, true] },
      { label: "Report cards (PDF)", v: [false, true, true, true] },
      { label: "Branded receipts & documents", v: [false, true, true, true] },
      { label: "Analytics with trends & forecasting", v: [false, false, true, true] },
      { label: "Teacher performance dashboard", v: [false, false, true, true] },
    ],
  },
  {
    group: "Control",
    rows: [
      { label: "Role-based permissions", v: [false, false, true, true] },
      { label: "Audit log", v: [false, false, true, true] },
      { label: "Custom fields", v: [false, false, true, true] },
      { label: "API / webhooks", v: [false, false, true, true] },
      { label: "Branch rollup & transfers", v: [false, false, false, true] },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Help centre & community", v: [true, true, true, true] },
      { label: "Email support in 24h", v: [false, true, true, true] },
      { label: "Priority WhatsApp line", v: [false, false, true, true] },
      { label: "Assisted onboarding & migration", v: [false, false, true, true] },
      { label: "Dedicated manager", v: [false, false, false, true] },
    ],
  },
];

/** Older institutes may still carry legacy keys. */
const LEGACY: Record<string, PlanKey> = {
  starter: "free",
  unlimited: "chain",
  pro: "campus",
  multi: "chain",
};

export function planFor(key: string | null | undefined): Plan {
  const k = key ? (LEGACY[key] ?? key) : null;
  return PLANS.find((p) => p.key === k) ?? PLANS[0];
}

export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
