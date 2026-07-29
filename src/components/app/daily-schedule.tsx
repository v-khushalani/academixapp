import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, Share2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { dayPlanApi, type Batch, type Faculty, type Room } from "@/lib/api";
import type { SlotRow } from "@/lib/timetable/conflicts";
import { roomLabel } from "@/lib/timetable/conflicts";
import { formatTime12, toMinutes } from "@/lib/time";
import { getInstitute } from "@/lib/academy-settings";

const NONE = "__none__";
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Row = {
  slot: SlotRow;
  planId?: string;
  batchId: string | null;
  facultyId: string | null;
  roomId: string | null;
  subject: string;
  cancelled: boolean;
  changed: boolean;
};

export function DailySchedule({
  slots,
  rooms,
  faculty,
  batches,
  canWrite,
}: {
  slots: SlotRow[];
  rooms: Room[];
  faculty: Faculty[];
  batches: Batch[];
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const weekday = useMemo(() => new Date(`${date}T00:00:00`).getDay(), [date]);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["day-plan", date],
    queryFn: () => dayPlanApi.listForDate(date),
  });

  const save = useMutation({
    mutationFn: (input: Parameters<typeof dayPlanApi.save>[0]) => dayPlanApi.save(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["day-plan", date] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: (id: string) => dayPlanApi.remove(id),
    onSuccess: () => {
      toast.success("Reset to the weekly plan");
      qc.invalidateQueries({ queryKey: ["day-plan", date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: Row[] = useMemo(() => {
    const bySlot = new Map(plans.filter((p) => p.slot_id).map((p) => [p.slot_id as string, p]));
    return slots
      .filter((s) => s.day_of_week === weekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((slot) => {
        const p = bySlot.get(slot.id);
        return {
          slot,
          planId: p?.id,
          batchId: p?.batch_id ?? slot.batch_id ?? null,
          facultyId: p?.faculty_id ?? slot.faculty_id ?? null,
          roomId: p?.room_id ?? slot.room_id ?? null,
          subject: p?.subject ?? slot.subject ?? "",
          cancelled: p?.status === "cancelled",
          changed: Boolean(p),
        };
      });
  }, [slots, plans, weekday]);

  /** Same-day double bookings after today's overrides are applied. */
  const clashes = useMemo(() => {
    const out: string[] = [];
    const live = rows.filter((r) => !r.cancelled);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        const overlap =
          toMinutes(a.slot.start_time) < toMinutes(b.slot.end_time) &&
          toMinutes(b.slot.start_time) < toMinutes(a.slot.end_time);
        if (!overlap) continue;
        if (a.facultyId && a.facultyId === b.facultyId)
          out.push(
            `${formatTime12(a.slot.start_time)} — ${nameOfFaculty(a.facultyId)} is booked twice`,
          );
        if (a.roomId && a.roomId === b.roomId)
          out.push(`${formatTime12(a.slot.start_time)} — ${nameOfRoom(a.roomId)} is booked twice`);
        if (a.batchId && a.batchId === b.batchId)
          out.push(
            `${formatTime12(a.slot.start_time)} — ${nameOfBatch(a.batchId)} has two classes`,
          );
      }
    }
    return Array.from(new Set(out));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rooms, faculty, batches]);

  function nameOfFaculty(id: string | null) {
    return faculty.find((f) => f.id === id)?.full_name ?? "Teacher";
  }
  function nameOfRoom(id: string | null) {
    return rooms.find((r) => r.id === id)?.name ?? "Room";
  }
  function nameOfBatch(id: string | null) {
    return batches.find((b) => b.id === id)?.name ?? "Batch";
  }

  function patch(row: Row, changes: Partial<Row>) {
    const next = { ...row, ...changes };
    save.mutate({
      slot_id: row.slot.id,
      date,
      batch_id: next.batchId,
      faculty_id: next.facultyId,
      room_id: next.roomId,
      subject: next.subject || null,
      status: next.cancelled ? "cancelled" : "planned",
    });
  }

  function shareDay() {
    const inst = getInstitute();
    const lines = [`*${inst.name || "Academy"} — ${DAY_FULL[weekday]}, ${date}*`];
    rows.forEach((r) => {
      const parts = [
        `${formatTime12(r.slot.start_time)}–${formatTime12(r.slot.end_time)}`,
        nameOfRoom(r.roomId) && `🚪 ${nameOfRoom(r.roomId)}`,
        r.batchId && nameOfBatch(r.batchId),
        r.subject,
        r.facultyId && `👨‍🏫 ${nameOfFaculty(r.facultyId)}`,
        r.cancelled && "❌ CANCELLED",
      ].filter(Boolean);
      lines.push(`• ${parts.join(" · ")}`);
    });
    if (rows.length === 0) {
      toast.info("Nothing scheduled for this day.");
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="h-9 w-44"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {DAY_FULL[weekday]} · {rows.length} class(es) from the weekly plan. Changing anything here
          only affects this date.
        </p>
        <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={shareDay}>
          <Share2 className="h-4 w-4" />
          Share day
        </Button>
      </div>

      {clashes.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {clashes.length} clash(es) today
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-destructive">
            {clashes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading day plan…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No classes in the weekly plan for {DAY_FULL[weekday]}. Add them in the Weekly tab first.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.slot.id}
              className={`rounded-lg border bg-card p-3 ${
                r.cancelled ? "border-dashed opacity-60" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {formatTime12(r.slot.start_time)} – {formatTime12(r.slot.end_time)}
                </span>
                <Badge variant="secondary">{nameOfRoom(r.roomId) || roomLabel(r.slot) || "—"}</Badge>
                {r.changed && !r.cancelled && (
                  <Badge variant="outline" className="text-[10px]">
                    changed today
                  </Badge>
                )}
                {r.cancelled && <Badge className="bg-destructive text-white">Cancelled</Badge>}
                {canWrite && (
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={r.cancelled ? "secondary" : "outline"}
                      className="h-8"
                      onClick={() => patch(r, { cancelled: !r.cancelled })}
                    >
                      {r.cancelled ? "Restore" : "Cancel"}
                    </Button>
                    {r.planId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reset to weekly plan"
                        onClick={() => reset.mutate(r.planId as string)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <Picker
                  label="Batch"
                  value={r.batchId}
                  disabled={!canWrite}
                  options={batches.map((b) => ({ id: b.id, label: b.name }))}
                  onChange={(v) => patch(r, { batchId: v })}
                />
                <Picker
                  label="Teacher"
                  value={r.facultyId}
                  disabled={!canWrite}
                  options={faculty.map((f) => ({ id: f.id, label: f.full_name }))}
                  onChange={(v) => patch(r, { facultyId: v })}
                />
                <Picker
                  label="Room"
                  value={r.roomId}
                  disabled={!canWrite}
                  options={rooms.map((x) => ({ id: x.id, label: x.name }))}
                  onChange={(v) => patch(r, { roomId: v })}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Subject (today)</Label>
                  <Input
                    defaultValue={r.subject}
                    disabled={!canWrite}
                    placeholder="e.g. Kinematics"
                    className="h-9"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== r.subject) patch(r, { subject: v });
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Picker({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value ?? NONE}
        disabled={disabled}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}