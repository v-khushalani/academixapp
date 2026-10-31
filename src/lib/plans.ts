/**
 * Fallback plan limits. The live source of truth is the database
 * (`plan_catalog` → `institutes`), edited by Team Academix in the platform
 * console. These constants only cover the moment before that data loads.
 */
export type PlanKey = "free" | "growth" | "campus";

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
    rooms: 1,
    students: 30,
    staffLogins: 1,
    teacherLogins: 1,
    batches: 2,
    priceYearly: 0,
    blurb: "30 students · the daily core",
    tagline: "Attendance, fees and receipts. Permanently free.",
    cta: "Start free",
  },
  {
    key: "growth",
    name: "Growth",
    rooms: 0,
    students: 150,
    staffLogins: 5,
    teacherLogins: 5,
    batches: 0,
    priceYearly: 7999,
    blurb: "150 students · one centre",
    tagline: "Everything one centre needs. ₹666/month.",
    cta: "Choose Growth",
  },
  {
    key: "campus",
    name: "Pro Plus",
    rooms: 0,
    students: 0,
    staffLogins: 0,
    teacherLogins: 0,
    batches: 0,
    priceYearly: 14999,
    blurb: "AI study material · multi-branch",
    tagline: "AI study material + multi-branch. ₹1,250/month.",
    cta: "Choose Pro Plus",
  },
];

/** Older institutes may still carry legacy keys. */
const LEGACY: Record<string, PlanKey> = {
  starter: "free",
  unlimited: "campus",
  pro: "growth",
  multi: "campus",
  chain: "campus",
};

export function planFor(key: string | null | undefined): Plan {
  const k = key ? (LEGACY[key] ?? key) : null;
  return PLANS.find((p) => p.key === k) ?? PLANS[0];
}
