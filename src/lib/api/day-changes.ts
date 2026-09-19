import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DayChangeRow = Database["public"]["Tables"]["timetable_changes"]["Row"] & {
  batch?: { id: string; name: string } | null;
  faculty?: { id: string; full_name: string } | null;
  room_ref?: { id: string; name: string } | null;
  slot?: {
    id: string;
    subject: string | null;
    start_time: string;
    end_time: string;
    batch_id: string | null;
  } | null;
};

export type DayChangeInput = {
  date: string;
  kind: "cancelled" | "changed" | "extra";
  slot_id?: string | null;
  batch_id?: string | null;
  faculty_id?: string | null;
  room_id?: string | null;
  subject?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  note?: string | null;
};

const SELECT =
  "*, batch:batches(id,name), faculty:faculty(id,full_name), room_ref:rooms(id,name), slot:timetable_slots(id,subject,start_time,end_time,batch_id)";

export const dayChangesApi = {
  /** Every change between two dates (inclusive). */
  async between(from: string, to: string): Promise<DayChangeRow[]> {
    const { data, error } = await supabase
      .from("timetable_changes")
      .select(SELECT)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("start_time");
    if (error) throw error;
    return (data ?? []) as DayChangeRow[];
  },

  async forDate(date: string) {
    return this.between(date, date);
  },

  /** One change per class per date — saving again replaces the earlier one. */
  async save(input: DayChangeInput) {
    if (input.slot_id) {
      await supabase
        .from("timetable_changes")
        .delete()
        .eq("slot_id", input.slot_id)
        .eq("date", input.date);
    }
    const { data, error } = await supabase
      .from("timetable_changes")
      .insert(input)
      .select(SELECT)
      .single();
    if (error) throw error;
    return data as DayChangeRow;
  },

  async remove(id: string) {
    const { error } = await supabase.from("timetable_changes").delete().eq("id", id);
    if (error) throw error;
  },
};

export const CHANGE_LABEL: Record<string, string> = {
  cancelled: "Cancelled",
  changed: "Changed",
  extra: "Extra class",
};
