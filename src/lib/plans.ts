/** Subscription tiers — currently they only gate how many classrooms an institute can run. */
export type PlanKey = "starter" | "growth" | "campus" | "unlimited";

export type Plan = {
  key: PlanKey;
  name: string;
  rooms: number;
  blurb: string;
};

export const PLANS: Plan[] = [
  { key: "starter", name: "Starter", rooms: 3, blurb: "Up to 3 classrooms" },
  { key: "growth", name: "Growth", rooms: 8, blurb: "Up to 8 classrooms" },
  { key: "campus", name: "Campus", rooms: 20, blurb: "Up to 20 classrooms" },
  { key: "unlimited", name: "Unlimited", rooms: 999, blurb: "No classroom limit" },
];

export function planFor(key: string | null | undefined): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}