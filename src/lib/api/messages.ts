import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type MessageLog = Tables["notification_logs"]["Row"];
export type MessageRow = MessageLog & { student?: { id: string; full_name: string } | null };

/** The only message kinds Academix sends. Keep this list short on purpose. */
export const MESSAGE_KINDS = {
  fee_reminder: "Fee reminder",
  fee_receipt: "Fee receipt",
  attendance_absent: "Attendance alert",
  result: "Result",
  manual: "Manual message",
} as const;
export type MessageKind = keyof typeof MESSAGE_KINDS;

async function instituteId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_institute_id");
  if (error || !data) throw error ?? new Error("No institute found for this account.");
  return data as string;
}

export const messagesApi = {
  async list(filters?: {
    from?: string;
    to?: string;
    kind?: string;
    status?: string;
    batchId?: string;
  }): Promise<MessageRow[]> {
    let q = supabase
      .from("notification_logs")
      .select("*, student:students(id, full_name, batch_id)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filters?.from) q = q.gte("created_at", `${filters.from}T00:00:00`);
    if (filters?.to) q = q.lte("created_at", `${filters.to}T23:59:59`);
    if (filters?.kind) q = q.eq("kind", filters.kind);
    if (filters?.status) q = q.eq("status", filters.status as MessageLog["status"]);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []) as (MessageRow & { student?: { batch_id?: string | null } | null })[];
    if (filters?.batchId) rows = rows.filter((r) => r.student?.batch_id === filters.batchId);
    return rows as MessageRow[];
  },
  /** Records what was handed to WhatsApp. Status is `sent` — delivery is out of our hands. */
  async log(
    rows: {
      kind: MessageKind;
      title: string;
      message: string;
      status?: MessageLog["status"];
      recipient_name?: string | null;
      recipient_phone?: string | null;
      student_id?: string | null;
      fee_id?: string | null;
      test_id?: string | null;
      queue_key?: string | null;
    }[],
  ) {
    if (!rows.length) return;
    const institute_id = await instituteId();
    const now = new Date().toISOString();
    const { error } = await supabase.from("notification_logs").insert(
      rows.map((r) => ({
        ...r,
        channel: "whatsapp" as const,
        status: r.status ?? ("sent" as const),
        sent_at: r.status === "failed" ? null : now,
        institute_id,
      })),
    );
    if (error) throw error;
  },
};

/** Fire-and-forget logging: messaging history must never block the actual send. */
export function logMessage(rows: Parameters<typeof messagesApi.log>[0]) {
  void messagesApi.log(rows).catch((e) => console.error("[message-log]", e));
}
