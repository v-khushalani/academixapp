// The daily "what still needs to go out" queue.
// Nothing is stored as a pending row: pending work is DERIVED from real data
// (absent marks, unpaid installments) and then subtracted by what has already
// been sent or ignored — tracked in notification_logs.queue_key.

import { supabase } from "@/integrations/supabase/client";
import { attendanceApi, feesApi, outstandingOf, studentsApi } from "@/lib/api";
import { feeFollowUpState, type FollowUpState } from "@/lib/fees";
import { getInstitute, getTemplates } from "@/lib/academy-settings";
import { renderTemplate } from "@/lib/whatsapp";
import { formatDate } from "@/lib/dates";
import type { MessageKind } from "@/lib/api/messages";

export type PendingKind = "attendance_absent" | "fee_due_soon" | "fee_overdue";

export type PendingItem = {
  /** Stable identity — used to remember "sent" / "ignored". */
  key: string;
  kind: PendingKind;
  messageKind: MessageKind;
  label: string;
  urgency: "high" | "medium";
  studentId: string | null;
  studentName: string;
  recipientName: string;
  phone: string | null;
  message: string;
  detail: string;
  date: string;
  feeId?: string;
  attendanceId?: string;
};

export const PENDING_LABEL: Record<PendingKind, string> = {
  attendance_absent: "Absent alert",
  fee_due_soon: "Fee reminder",
  fee_overdue: "Overdue fee",
};

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Keys already sent or explicitly ignored — never suggest these again. */
async function handledKeys(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("notification_logs")
    .select("queue_key")
    .not("queue_key", "is", null)
    .gte("created_at", `${isoDaysAgo(90)}T00:00:00`)
    .limit(2000);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.queue_key as string));
}

export type PendingScope = "today" | "week";

export const pendingApi = {
  /** Everything waiting to be messaged, newest first. */
  async list(scope: PendingScope = "today"): Promise<PendingItem[]> {
    const days = scope === "today" ? 1 : 7;
    const dates = Array.from({ length: days }, (_, i) => isoDaysAgo(i));
    const academy = getInstitute();
    const tpl = getTemplates();

    const [handled, students, fees, absentLists] = await Promise.all([
      handledKeys(),
      studentsApi.list(),
      feesApi.list(),
      Promise.all(dates.map((d) => attendanceApi.absentees(d))),
    ]);

    const phoneOf = new Map(
      students.map((s) => [s.id, s.parent_phone || s.father_phone || s.phone || null] as const),
    );
    const parentOf = new Map(
      students.map((s) => [s.id, s.parent_name || s.father_name || "Parent"] as const),
    );

    const items: PendingItem[] = [];

    for (const list of absentLists) {
      for (const a of list) {
        if (a.notified_at || !a.student) continue;
        const key = `absent:${a.id}`;
        if (handled.has(key)) continue;
        const parent = a.student.parent_name || parentOf.get(a.student.id) || "Parent";
        items.push({
          key,
          kind: "attendance_absent",
          messageKind: "attendance_absent",
          label: PENDING_LABEL.attendance_absent,
          urgency: "high",
          studentId: a.student.id,
          studentName: a.student.full_name,
          recipientName: parent,
          phone: a.student.parent_phone || a.student.phone || phoneOf.get(a.student.id) || null,
          detail: `Absent on ${formatDate(a.date)}${a.batch?.name ? ` · ${a.batch.name}` : ""}`,
          date: a.date,
          attendanceId: a.id,
          message: renderTemplate(tpl.attendance_absent, {
            parent_name: parent,
            student_name: a.student.full_name,
            batch_name: a.batch?.name ?? "class",
            date: formatDate(a.date),
            academy_name: academy.name,
          }),
        });
      }
    }

    const today = new Date();
    for (const f of fees) {
      const state: FollowUpState = feeFollowUpState(f, today);
      if (state === "none" || state === "due_7") continue;
      const kind: PendingKind = state === "overdue" ? "fee_overdue" : "fee_due_soon";
      const key = `${kind}:${f.id}:${f.due_date ?? ""}`;
      if (handled.has(key)) continue;
      const student = f.student as { id: string; full_name: string } | null;
      if (!student) continue;
      const parent = parentOf.get(student.id) ?? "Parent";
      const due = outstandingOf(f);
      items.push({
        key,
        kind,
        messageKind: "fee_reminder",
        label: PENDING_LABEL[kind],
        urgency: state === "overdue" ? "high" : "medium",
        studentId: student.id,
        studentName: student.full_name,
        recipientName: parent,
        phone: phoneOf.get(student.id) ?? null,
        detail: `₹${due.toLocaleString("en-IN")} ${state === "overdue" ? "overdue since" : "due on"} ${formatDate(f.due_date)}`,
        date: f.due_date ?? "",
        feeId: f.id,
        message: renderTemplate(state === "overdue" ? tpl.fee_overdue : tpl.fee_due_soon, {
          parent_name: parent,
          student_name: student.full_name,
          amount_due: due,
          due_date: formatDate(f.due_date),
          academy_name: academy.name,
        }),
      });
    }

    const rank = { high: 0, medium: 1 } as const;
    return items.sort((a, b) => rank[a.urgency] - rank[b.urgency] || b.date.localeCompare(a.date));
  },

  /** Drop items from the queue without messaging anyone. */
  async ignore(items: PendingItem[]) {
    if (!items.length) return;
    const { data: institute } = await supabase.rpc("current_institute_id");
    const now = new Date().toISOString();
    const { error } = await supabase.from("notification_logs").insert(
      items.map((i) => ({
        kind: i.messageKind,
        channel: "whatsapp" as const,
        status: "ignored" as const,
        title: i.label,
        message: i.message,
        recipient_name: i.recipientName,
        recipient_phone: i.phone,
        student_id: i.studentId,
        fee_id: i.feeId ?? null,
        queue_key: i.key,
        dismissed_at: now,
        institute_id: institute as string,
      })),
    );
    if (error) throw error;
    const attendanceIds = items.filter((i) => i.attendanceId).map((i) => i.attendanceId!);
    if (attendanceIds.length) await attendanceApi.markNotified(attendanceIds);
  },

  /** Record that an item was handed to WhatsApp. */
  async markSent(items: PendingItem[]) {
    if (!items.length) return;
    const { data: institute } = await supabase.rpc("current_institute_id");
    const now = new Date().toISOString();
    const { error } = await supabase.from("notification_logs").insert(
      items.map((i) => ({
        kind: i.messageKind,
        channel: "whatsapp" as const,
        status: "sent" as const,
        title: i.label,
        message: i.message,
        recipient_name: i.recipientName,
        recipient_phone: i.phone,
        student_id: i.studentId,
        fee_id: i.feeId ?? null,
        queue_key: i.key,
        sent_at: now,
        institute_id: institute as string,
      })),
    );
    if (error) throw error;
    const attendanceIds = items.filter((i) => i.attendanceId).map((i) => i.attendanceId!);
    if (attendanceIds.length) await attendanceApi.markNotified(attendanceIds);
  },
};
