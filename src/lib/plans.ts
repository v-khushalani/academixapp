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
    name: "Growth",
    rooms: 0,
    students: 0,
    staffLogins: 0,
    teacherLogins: 0,
    batches: 0,
    priceYearly: 5990,
    blurb: "Unlimited students · one centre",
    tagline: "Everything for one centre. Unlimited students.",
    cta: "Choose Growth",
  },
  {
    key: "campus",
    name: "Campus",
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
  unlimited: "campus",
  pro: "growth",
  multi: "campus",
  chain: "campus",
};



export function planFor(key: string | null | undefined): Plan {
  const k = key ? (LEGACY[key] ?? key) : null;
  return PLANS.find((p) => p.key === k) ?? PLANS[0];
}
