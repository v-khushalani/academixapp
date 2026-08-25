/**
 * Fallback plan limits. The live source of truth is the database
 * (`plan_catalog` → `institutes`), edited by Team Academix in the platform
 * console. These constants only cover the moment before that data loads.
 */
export type PlanKey = "free" | "growth" | "campus" | "chain";

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
  /** price for one year, 0 for free, null for custom quote */
  priceYearly: number | null;
  blurb: string;
  tagline: string;
  cta: string;
};

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free forever",
    rooms: 3,
    students: 50,
    staffLogins: 2,
    teacherLogins: 5,
    batches: 5,
    priceYearly: 0,
    blurb: "50 students · the daily core",
    tagline: "Attendance, fees and receipts. Permanently free.",
    cta: "Start free",
  },
  {
    key: "growth",
    name: "Pro",
    rooms: 0,
    students: 0,
    staffLogins: 0,
    teacherLogins: 0,
    batches: 0,
    priceYearly: 5990,
    blurb: "Unlimited students · one centre",
    tagline: "Everything for one centre. Unlimited students.",
    cta: "Choose Pro",
  },
  {
    key: "campus",
    name: "Campus (legacy)",
    rooms: 30,
    students: 1500,
    staffLogins: 20,
    teacherLogins: 0,
    batches: 0,
    priceYearly: 14990,
    blurb: "1,500 students · 30 classrooms",
    tagline: "Older plan — kept for existing institutes.",
    cta: "Talk to us",
  },
  {
    key: "chain",
    name: "Chain",
    rooms: 0,
    students: 0,
    staffLogins: 0,
    teacherLogins: 0,
    batches: 0,
    priceYearly: null,
    blurb: "Unlimited · multi-branch",
    tagline: "Many branches on one dashboard.",
    cta: "Talk to us",
  },
];

/** Older institutes may still carry legacy keys. */
const LEGACY: Record<string, PlanKey> = {
  starter: "free",
  unlimited: "chain",
  pro: "growth",
  multi: "chain",
};


export function planFor(key: string | null | undefined): Plan {
  const k = key ? (LEGACY[key] ?? key) : null;
  return PLANS.find((p) => p.key === k) ?? PLANS[0];
}
