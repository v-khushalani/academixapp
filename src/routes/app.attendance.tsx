import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Save } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchesApi, attendanceApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import type { Database } from "@/integrations/supabase/types";
import { WA_TEMPLATES, openWhatsApp, renderTemplate } from "@/lib/whatsapp";
import { getTemplates, getInstitute } from "@/lib/academy-settings";

type Status = Database["public"]["Enums"]["attendance_status"];

export const Route = createFileRoute("/app/attendance")({
  component: AttendancePage,
});

const STATUS_COLORS: Record<Status, string> = {
  present: "bg-success text-success-foreground",
  absent: "bg-destructive text-destructive-foreground",
  late: "bg-warning text-warning-foreground",
  excused: "bg-muted text-muted-foreground",
};

function AttendancePage() {
  const qc = useQueryClient();
  const { user, roles } = useAuth();
  const canWrite = can("attendance:write", roles);
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
  });
  const [batchId, setBatchId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!batchId && batches[0]) setBatchId(batches[0].id);
  }, [batches, batchId]);

  const { data: roster = [] } = useQuery({
    queryKey: ["batch-roster", batchId],
    queryFn: () => batchesApi.roster(batchId),
    enabled: Boolean(batchId),
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["attendance", batchId, date],
    queryFn: () => attendanceApi.listForBatchDate(batchId, date),
    enabled: Boolean(batchId && date),
  });

  const [marks, setMarks] = useState<Record<string, Status>>({});

  const initial = useMemo(() => {
    const m: Record<string, Status> = {};
    existing.forEach((a) => {
      m[a.student_id] = a.status;
    });
    return m;
  }, [existing]);

  useEffect(() => {
    setMarks({});
  }, [batchId, date]);
  const merged = { ...initial, ...marks };

  const saveMut = useMutation({
    mutationFn: async () => {
      const rows = roster
        .filter((s) => merged[s.id])
        .map((s) => ({
          student_id: s.id,
          batch_id: batchId,
          date,
          status: merged[s.id],
          marked_by: user?.id,
        }));
      if (rows.length === 0) return;
      await attendanceApi.upsertMany(rows);
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["attendance", batchId, date] });
      setMarks({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function markAll(s: Status) {
    const m: Record<string, Status> = {};
    roster.forEach((r) => {
      m[r.id] = s;
    });
    setMarks(m);
  }

  const present = roster.filter((s) => merged[s.id] === "present").length;
  const absent = roster.filter((s) => merged[s.id] === "absent").length;

  const batchName = batches.find((b) => b.id === batchId)?.name ?? "—";

  function sendAbsentReminder(s: (typeof roster)[number]) {
    const useMother = s.preferred_contact === "mother";
    const phone = useMother
      ? (s.mother_phone ?? s.parent_phone ?? s.father_phone ?? s.phone ?? null)
      : (s.father_phone ?? s.parent_phone ?? s.mother_phone ?? s.phone ?? null);
    const parentName = useMother
      ? (s.mother_name ?? s.parent_name ?? s.father_name ?? "Parent")
      : (s.father_name ?? s.parent_name ?? s.mother_name ?? "Parent");
    const msg = renderTemplate(getTemplates().attendance_absent, {
      student_name: s.full_name,
      parent_name: parentName,
      batch_name: batchName,
      date,
      academy_name: getInstitute().name,
    });
    if (!openWhatsApp(phone, msg)) toast.error("No parent/student phone on file.");
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Mark today’s attendance in seconds."
        actions={
          canWrite && roster.length > 0 ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              className="h-9 w-[180px]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {canWrite && roster.length > 0 && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => markAll("present")}>
                All present
              </Button>
              <Button size="sm" variant="outline" onClick={() => markAll("absent")}>
                All absent
              </Button>
            </div>
          )}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Roster" value={String(roster.length)} />
          <Stat label="Present" value={String(present)} />
          <Stat label="Absent" value={String(absent)} />
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students in this batch.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Admission #</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.admission_no}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(["present", "absent", "late", "excused"] as Status[]).map((st) => {
                          const active = merged[s.id] === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={!canWrite}
                              onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                              className={`h-7 rounded-md border px-2.5 text-xs capitalize transition-colors ${active ? STATUS_COLORS[st] + " border-transparent" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                            >
                              {st[0].toUpperCase()}
                            </button>
                          );
                        })}
                        {merged[s.id] === "absent" && (
                          <button
                            type="button"
                            onClick={() => sendAbsentReminder(s)}
                            title="Send WhatsApp to parent"
                            className="ml-2 inline-flex h-7 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 text-xs text-success hover:bg-success/20"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Send msg
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageBody>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
