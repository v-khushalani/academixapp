import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { attendanceApi } from "@/lib/api";
import { getInstitute, getTemplates } from "@/lib/academy-settings";
import { openWhatsApp, renderTemplate } from "@/lib/whatsapp";
import { logMessage } from "@/lib/api/messages";

/**
 * Office-side nudge: as soon as a teacher marks someone absent, the admin gets a
 * one-tap list to WhatsApp each parent. Rows remember who has been messaged.
 */
export function AbsentAlerts() {
  const today = new Date().toISOString().slice(0, 10);
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["absent-today", today],
    queryFn: () => attendanceApi.absentees(today),
    refetchInterval: 60_000,
  });

  const notify = useMutation({
    mutationFn: (ids: string[]) => attendanceApi.markNotified(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absent-today", today] }),
  });

  const pending = rows.filter((r) => !r.notified_at);
  const open = !dismissed && pending.length > 0;

  function send(row: (typeof rows)[number]) {
    const inst = getInstitute();
    const msg = renderTemplate(getTemplates().attendance_absent, {
      student_name: row.student?.full_name,
      parent_name: row.student?.parent_name ?? "Parent",
      batch_name: row.batch?.name ?? "—",
      date: row.date,
      academy_name: inst.name,
    });
    const phone = row.student?.parent_phone ?? row.student?.phone ?? null;
    const ok = openWhatsApp(phone, msg);
    logMessage([
      {
        kind: "attendance_absent",
        title: "Attendance alert",
        message: msg,
        status: ok ? "sent" : "failed",
        recipient_name: row.student?.full_name ?? null,
        recipient_phone: phone,
        student_id: row.student_id,
      },
    ]);
    if (!ok) {
      toast.error(`No phone number on file for ${row.student?.full_name ?? "this student"}.`);
      return;
    }
    notify.mutate([row.id]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && setDismissed(true)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            {pending.length} absent today
          </DialogTitle>
          <DialogDescription>
            Tap to message each parent on WhatsApp. Messaged rows disappear from this list.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
          {pending.map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {r.student?.full_name ?? "Student"}
                </span>
                <span className="text-xs text-muted-foreground">{r.batch?.name ?? "—"}</span>
              </span>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => send(r)}>
                <MessageCircle className="h-3.5 w-3.5 text-success" /> Send
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setDismissed(true)}>
            Later
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              notify.mutate(pending.map((r) => r.id));
              setDismissed(true);
            }}
          >
            Mark all handled
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}