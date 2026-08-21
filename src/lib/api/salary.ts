import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type SalaryRow = Expense & { faculty?: { id: string; full_name: string } | null };

export const SALARY_CATEGORY = "salary";

/** First and last day (inclusive) of a "YYYY-MM" month. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, 1);
  const end = new Date(y!, m ?? 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(start), to: iso(end) };
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);

async function instituteId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_institute_id");
  if (error || !data) throw error ?? new Error("No institute found for this account.");
  return data as string;
}

export const salaryApi = {
  /** Salary payments recorded inside one month. */
  async forMonth(month: string): Promise<SalaryRow[]> {
    const { from, to } = monthRange(month);
    const { data, error } = await supabase
      .from("expenses")
      .select("*, faculty:faculty(id, full_name)")
      .eq("category", SALARY_CATEGORY)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as SalaryRow[];
  },
  async pay(input: {
    faculty_id: string;
    amount: number;
    date: string;
    payment_method?: string | null;
    description?: string | null;
  }) {
    const institute_id = await instituteId();
    const { error } = await supabase.from("expenses").insert({
      ...input,
      category: SALARY_CATEGORY,
      institute_id,
    });
    if (error) throw error;
  },
  /** Every salary payment for one teacher, newest first. */
  async forFaculty(facultyId: string): Promise<SalaryRow[]> {
    const { data, error } = await supabase
      .from("expenses")
      .select("*, faculty:faculty(id, full_name)")
      .eq("category", SALARY_CATEGORY)
      .eq("faculty_id", facultyId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as SalaryRow[];
  },
  async remove(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};
