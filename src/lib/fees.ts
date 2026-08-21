// Single source of truth for "where is this bill in its life-cycle".
// Nothing in the database ever flips a fee to `overdue`, so overdue is always
// derived from the due date + what is still owed. Every screen must use these.

import { outstandingOf } from "@/lib/api";

export type FeeLike = {
  amount: number | string;
  amount_paid?: number | string | null;
  status?: string | null;
  due_date?: string | null;
};

/** Days from today to the due date. Negative = the date has passed. */
export function daysToDue(due?: string | null, today = new Date()): number | null {
  if (!due) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = due.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dd = new Date(y, m - 1, d).getTime();
  return Math.round((dd - t) / 86400000);
}

/** Still owes money and the due date has passed. */
export function isOverdue(f: FeeLike, today = new Date()): boolean {
  if (!f.due_date) return false;
  if (outstandingOf(f) <= 0) return false;
  const d = daysToDue(f.due_date, today);
  return d !== null && d < 0;
}

export type FollowUpState = "none" | "due_7" | "due_2" | "overdue";

/** Gentle reminder ladder: 7 days out → 2 days out → past due. */
export function feeFollowUpState(f: FeeLike, today = new Date()): FollowUpState {
  if (f.status === "cancelled" || f.status === "waived") return "none";
  if (outstandingOf(f) <= 0) return "none";
  const d = daysToDue(f.due_date, today);
  if (d === null) return "none";
  if (d < 0) return "overdue";
  if (d <= 2) return "due_2";
  if (d <= 7) return "due_7";
  return "none";
}

export const FOLLOW_UP_LABEL: Record<FollowUpState, string> = {
  none: "—",
  due_7: "Due in a week",
  due_2: "Due in 2 days",
  overdue: "Overdue",
};

/** What the row badge should say — derived status, never the raw column. */
export function displayFeeStatus(f: FeeLike, today = new Date()): string {
  if (f.status === "cancelled" || f.status === "waived" || f.status === "paid")
    return f.status as string;
  return isOverdue(f, today) ? "overdue" : (f.status ?? "pending");
}
