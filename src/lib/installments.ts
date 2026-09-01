// Fee installment plans. An institute has a default plan; a batch may override it.
// Each part carries a share of the batch fee and a due-date rule.

export type InstallmentBasis = "admission" | "batch_start";

export type Installment = {
  label: string;
  share: number; // percentage of the net batch fee
  basis: InstallmentBasis;
  days: number; // days after the basis date
};

export const DEFAULT_PLAN: Installment[] = [
  { label: "1st installment", share: 50, basis: "admission", days: 7 },
  { label: "2nd installment", share: 50, basis: "batch_start", days: 90 },
];

export function normalisePlan(raw: unknown): Installment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((r, i) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const basis: InstallmentBasis = o.basis === "batch_start" ? "batch_start" : "admission";
      return {
        label: String(o.label ?? `Installment ${i + 1}`),
        share: Math.max(0, Number(o.share) || 0),
        basis,
        days: Math.max(0, Math.round(Number(o.days) || 0)),
      };
    })
    .filter(Boolean);
}

export function planTotal(plan: Installment[]): number {
  return plan.reduce((s, p) => s + (Number(p.share) || 0), 0);
}
