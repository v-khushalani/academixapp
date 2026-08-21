import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseRow = Expense & { faculty?: { id: string; full_name: string } | null };

/** Fixed spend buckets so year-end reporting is comparable across institutes. */
export const EXPENSE_CATEGORIES = [
  "salary",
  "rent",
  "electricity",
  "water",
  "internet",
  "maintenance",
  "housekeeping",
  "marketing",
  "stationery",
  "transport",
  "rates_taxes",
  "miscellaneous",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_LABELS: Record<string, string> = {
  salary: "Salary",
  rent: "Rent",
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  maintenance: "Maintenance",
  housekeeping: "Housekeeping",
  marketing: "Marketing",
  stationery: "Stationery",
  transport: "Transport",
  rates_taxes: "Rates & taxes",
  miscellaneous: "Miscellaneous",
};

export const expenseLabel = (c?: string | null) =>
  (c && (EXPENSE_LABELS[c] ?? c.replace(/_/g, " "))) || "Uncategorised";

export const PAYMENT_METHODS = ["Cash", "UPI", "Bank transfer", "Cheque", "Card"];

/** Academic year runs April → March in India. */
export function academicYearRange(anchor = new Date()) {
  const y = anchor.getMonth() >= 3 ? anchor.getFullYear() : anchor.getFullYear() - 1;
  return { from: `${y}-04-01`, to: `${y + 1}-03-31`, label: `${y}–${String(y + 1).slice(2)}` };
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(new Date(y!, (m ?? 1) - 1, 1)), to: iso(new Date(y!, m ?? 1, 0)) };
}

async function instituteId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_institute_id");
  if (error || !data) throw error ?? new Error("No institute found for this account.");
  return data as string;
}

export const expensesApi = {
  async list(range?: { from?: string; to?: string; category?: string }): Promise<ExpenseRow[]> {
    let q = supabase
      .from("expenses")
      .select("*, faculty:faculty(id, full_name)")
      .order("date", { ascending: false })
      .limit(1000);
    if (range?.from) q = q.gte("date", range.from);
    if (range?.to) q = q.lte("date", range.to);
    if (range?.category) q = q.eq("category", range.category);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ExpenseRow[];
  },
  async create(input: {
    category: string;
    amount: number;
    date: string;
    description?: string | null;
    payment_method?: string | null;
    faculty_id?: string | null;
  }) {
    const institute_id = await instituteId();
    const { error } = await supabase.from("expenses").insert({ ...input, institute_id });
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};

/** Category → total, biggest first. */
export function byCategory(rows: ExpenseRow[]) {
  const map = new Map<string, number>();
  for (const r of rows)
    map.set(r.category ?? "miscellaneous", (map.get(r.category ?? "miscellaneous") ?? 0) + Number(r.amount || 0));
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
