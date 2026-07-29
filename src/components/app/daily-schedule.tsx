import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  RotateCcw,
  Share2,
  Users,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { dayPlanApi, type Batch, type Faculty, type Room } from "@/lib/api";
import type { SlotRow } from "@/lib/timetable/conflicts";
import { roomLabel } from "@/lib/timetable/conflicts";
import { formatTime12, toMinutes } from "@/lib/time";
import { getInstitute } from "@/lib/academy-settings";
import { ScheduleGrid, type GridColumn, type GridItem } from "./timetable/schedule-grid";

const NONE = "__none__";
const NO_ROOM = "__noroom__";
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prettyDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
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
  const [openRow, setOpenRow] = useState<string | null>(null);
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

  /** ids of rows that are part of a clash, so the board can flag them in red */
  const clashIds = useMemo(() => {
    const bad = new Set<string>();
    const live = rows.filter((r) => !r.cancelled);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        const overlap =
          toMinutes(a.slot.start_time) < toMinutes(b.slot.end_time) &&
          toMinutes(b.slot.start_time) < toMinutes(a.slot.end_time);
        if (!overlap) continue;
        if (
          (a.facultyId && a.facultyId === b.facultyId) ||
          (a.roomId && a.roomId === b.roomId) ||
          (a.batchId && a.batchId === b.batchId)
        ) {
          bad.add(a.slot.id);
          bad.add(b.slot.id);
        }
      }
    }
    return bad;
  }, [rows]);

  /** classroom columns — every room, plus a catch-all for unassigned classes */
  const columns: GridColumn[] = useMemo(() => {
    const cols: GridColumn[] = rooms.map((r) => ({
      id: r.id,
      label: r.name,
      sub: `${r.capacity} seats`,
    }));
    if (rows.some((r) => !r.roomId)) cols.push({ id: NO_ROOM, label: "Unassigned", sub: "pick a room" });
    return cols.length ? cols : [{ id: NO_ROOM, label: "Unassigned", sub: "add classrooms in Settings" }];
  }, [rooms, rows]);

  /** time rail built from the day's own classes — no empty hours, no scrolling */
  const bands = useMemo(() => {
    if (!rows.length) return [];
    const marks = new Set<string>();
    rows.forEach((r) => {
      marks.add(r.slot.start_time.slice(0, 5));
      marks.add(r.slot.end_time.slice(0, 5));
    });
    const sorted = Array.from(marks).sort();
    return sorted.slice(0, -1).map((s, i) => ({ start: s, end: sorted[i + 1] }));
  }, [rows]);

  const items: GridItem[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.slot.id,
        colId: r.roomId ?? NO_ROOM,
        start: r.slot.start_time,
        end: r.slot.end_time,
        title: nameOfBatch(r.batchId),
        subject: r.subject || null,
        person: r.facultyId ? nameOfFaculty(r.facultyId) : "No teacher",
        tone: r.cancelled
          ? ("cancelled" as const)
          : clashIds.has(r.slot.id)
            ? ("clash" as const)
            : r.changed
              ? ("changed" as const)
              : ("default" as const),
        badge: r.cancelled ? "cancelled" : r.changed ? "changed today" : null,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, clashIds, faculty, batches],
  );

  const active = rows.find((r) => r.slot.id === openRow) ?? null;
  const liveRows = rows.filter((r) => !r.cancelled);
  const busyRooms = new Set(liveRows.map((r) => r.roomId).filter(Boolean) as string[]);
  const teachersOnDuty = new Set(liveRows.map((r) => r.facultyId).filter(Boolean) as string[]);

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
      {/* date bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2.5">
        <div className="inline-flex items-center rounded-lg border border-border">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-r-none"
            aria-label="Previous day"
            onClick={() => setDate(shiftDate(date, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9.5rem] px-2 text-center text-sm font-semibold">
            {prettyDate(date)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-l-none"
            aria-label="Next day"
            onClick={() => setDate(shiftDate(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant={date === todayISO() ? "secondary" : "outline"}
          className="h-8"
          onClick={() => setDate(todayISO())}
        >
          Today
        </Button>
        <label className="relative inline-flex">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="h-8 w-[9.5rem] text-xs"
          />
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <Stat icon={<CalendarDays className="h-3.5 w-3.5" />} value={liveRows.length} label="classes" />
          <Stat icon={<Users className="h-3.5 w-3.5" />} value={teachersOnDuty.size} label="teachers" />
          <Stat
            icon={<DoorOpen className="h-3.5 w-3.5" />}
            value={Math.max(0, rooms.length - busyRooms.size)}
            label="rooms free"
          />
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={shareDay}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
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
        <>
          <ScheduleGrid
            columns={columns}
            bands={bands}
            items={items}
            canWrite={canWrite}
            onItemClick={(it) => setOpenRow(it.id)}
            footer={
              <p className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                Tap any class to change today&apos;s teacher, room or subject. Edits here apply to{" "}
                {prettyDate(date)} only — the weekly plan stays untouched.
              </p>
            }
          />

          {/* mobile-friendly list of the same day */}
          <ul className="space-y-1.5 md:hidden">
            {rows.map((r) => (
              <li key={r.slot.id}>
                <button
                  type="button"
                  onClick={() => setOpenRow(r.slot.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left ${
                    r.cancelled ? "border-dashed border-border opacity-60" : "border-border bg-card"
                  }`}
                >
                  <span className="w-20 shrink-0 text-[11px] font-semibold text-muted-foreground">
                    {formatTime12(r.slot.start_time)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {nameOfBatch(r.batchId)}
                      {r.subject ? ` · ${r.subject}` : ""}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {nameOfRoom(r.roomId) || roomLabel(r.slot) || "No room"} ·{" "}
                      {r.facultyId ? nameOfFaculty(r.facultyId) : "No teacher"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={Boolean(active)} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {formatTime12(active.slot.start_time)} – {formatTime12(active.slot.end_time)}
                </SheetTitle>
                <SheetDescription>
                  Changes apply to {prettyDate(date)} only.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-3">
                <Picker
                  label="Batch"
                  value={active.batchId}
                  disabled={!canWrite}
                  options={batches.map((b) => ({ id: b.id, label: b.name }))}
                  onChange={(v) => patch(active, { batchId: v })}
                />
                <Picker
                  label="Teacher"
                  value={active.facultyId}
                  disabled={!canWrite}
                  options={faculty.map((f) => ({ id: f.id, label: f.full_name }))}
                  onChange={(v) => patch(active, { facultyId: v })}
                />
                <Picker
                  label="Room"
                  value={active.roomId}
                  disabled={!canWrite}
                  options={rooms.map((x) => ({ id: x.id, label: x.name }))}
                  onChange={(v) => patch(active, { roomId: v })}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Subject (today)</Label>
                  <Input
                    key={active.slot.id}
                    defaultValue={active.subject}
                    disabled={!canWrite}
                    placeholder="e.g. Kinematics"
                    className="h-9"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== active.subject) patch(active, { subject: v });
                    }}
                  />
                </div>
                {canWrite && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant={active.cancelled ? "secondary" : "outline"}
                      onClick={() => patch(active, { cancelled: !active.cancelled })}
                    >
                      {active.cancelled ? "Restore class" : "Cancel class"}
                    </Button>
                    {active.planId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => {
                          reset.mutate(active.planId as string);
                          setOpenRow(null);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset to weekly
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
      {icon}
      <strong className="text-foreground">{value}</strong> {label}
    </span>
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