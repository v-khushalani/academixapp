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
    students: 100,
    staffLogins: 2,
    teacherLogins: 5,
    batches: 5,
    priceYearly: 0,
    blurb: "100 students · 3 classrooms",
    tagline: "The entire daily operation. Permanently free.",
    cta: "Start free",
  },
  {
    key: "growth",
    name: "Growth",
    rooms: 10,
    students: 500,
    staffLogins: 6,
    teacherLogins: 25,
    batches: 0,
    priceYearly: 5990,
    blurb: "500 students · 10 classrooms",
    tagline: "Scale, automation and insight for one centre.",
    cta: "Choose Growth",
  },
  {
    key: "campus",
    name: "Campus",
    rooms: 30,
    students: 1500,
    staffLogins: 20,
    teacherLogins: 0,
    batches: 0,
    priceYearly: 14990,
    blurb: "1,500 students · 30 classrooms",
    tagline: "Many staff, many batches, full accountability.",
    cta: "Choose Campus",
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
    blurb: "Unlimited · multi-branch",
    tagline: "Multiple branches on one dashboard.",
    cta: "Talk to us",
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
