/** Subscription tiers. Advisory only until billing is wired — they describe limits, not enforcement. */
export type PlanKey = "free" | "growth" | "campus" | "chain";

export type Plan = {
  key: PlanKey;
  name: string;
  /** classroom limit */
  rooms: number;
  /** student limit */
  students: number;
  priceMonthly: number | null;
  priceYearly: number | null;
  blurb: string;
};

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free forever",
    rooms: 3,
    students: 75,
    priceMonthly: 0,
    priceYearly: 0,
    blurb: "75 students · 3 classrooms",
  },
  {
    key: "growth",
    name: "Growth",
    rooms: 8,
    students: 300,
    priceMonthly: 999,
    priceYearly: 8990,
    blurb: "300 students · 8 classrooms",
  },
  {
    key: "campus",
    name: "Campus",
    rooms: 25,
    students: 1000,
    priceMonthly: 2499,
    priceYearly: 22490,
    blurb: "1,000 students · 25 classrooms",
  },
  {
    key: "chain",
    name: "Chain",
    rooms: 999,
    students: 999999,
    priceMonthly: null,
    priceYearly: null,
    blurb: "Unlimited · multi-branch",
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
