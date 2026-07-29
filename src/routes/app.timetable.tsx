import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  Share2,
  AlertTriangle,
  Send,
  Users,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { DailySchedule } from "@/components/app/daily-schedule";
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
import { TimetableSlotDialog } from "@/components/app/timetable-slot-dialog";
import {
  batchesApi,
  facultyApi,
  roomsApi,
  studentsApi,
  timetableApi,
  type Batch,
  type Faculty,
  type Room,
  type TimetableSlot,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { getInstitute, saveInstitute, DEFAULT_SHIFTS, type Shifts } from "@/lib/academy-settings";
import { formatTime12, toMinutes, toHHMM } from "@/lib/time";
import {
  buildBands,
  capacityWarnings,
  conflictReason,
  findConflicts,
  reconcile,
  roomLabel,
  type SlotRow,
} from "@/lib/timetable/conflicts";
import { openWhatsApp, teacherDayMessage } from "@/lib/whatsapp";

export const Route = createFileRoute("/app/timetable")({
  head: () => ({
    meta: [
      { title: "Class Timetable — Academix" },
      {
        name: "description",
        content:
          "Plan parallel batches across classrooms and teachers with automatic clash detection.",
      },
      { property: "og:title", content: "Class Timetable — Academix" },
      {
        property: "og:description",
        content: "Room-wise and teacher-wise weekly schedule with reconciliation checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimetablePage,
});

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DragPayload = {
  batchId?: string;
  facultyId?: string;
  subject?: string;
  roomId?: string;
  durationMin?: number;
  /** dropped straight from the batch list — open the editor to finish the details */
  quick?: boolean;
};

type ShiftKey = "morning" | "evening";
const SHIFT_LABEL: Record<ShiftKey, string> = { morning: "Morning", evening: "Evening" };
type ViewKey = "room" | "faculty";
const UNASSIGNED = "__none__";

function TimetablePage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const { roles } = useAuth();
  const canWrite = can("batch:write", roles);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => timetableApi.list() as Promise<SlotRow[]>,
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
  });
  const { data: faculty = [] } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.list(),
  });
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: () => roomsApi.list() });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });

  const batchStrength = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => {
      if (s.batch_id) m.set(s.batch_id, (m.get(s.batch_id) ?? 0) + 1);
    });
    return m;
  }, [students]);

  // ----- shift + day + view -----
  const [shifts, setShifts] = useState<Shifts>(() => getInstitute().shifts ?? DEFAULT_SHIFTS);
  const [shiftKey, setShiftKey] = useState<ShiftKey>(() =>
    new Date().getHours() < 12 ? "morning" : "evening",
  );
  const [day, setDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 1 : d;
  });
  const [view, setView] = useState<ViewKey>("room");

  const shift = shifts[shiftKey];
  const bands = useMemo(
    () => buildBands(shift.start, shift.end, shift.period),
    [shift.start, shift.end, shift.period],
  );
  const windowStart = toMinutes(shift.start);
  const windowEnd = toMinutes(shift.end);

  function patchShift(patch: Partial<Shifts[ShiftKey]>) {
    setShifts((prev) => ({ ...prev, [shiftKey]: { ...prev[shiftKey], ...patch } }));
  }
  async function persistShifts() {
    try {
      await saveInstitute({ ...getInstitute(), shifts });
      toast.success("Shift timings saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ----- dialog -----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [presets, setPresets] = useState<{
    day: number;
    start?: string;
    end?: string;
    roomId?: string | null;
    facultyId?: string | null;
  }>({ day: 1 });

  const removeMut = useMutation({
    mutationFn: (id: string) => timetableApi.remove(id),
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["timetable"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof timetableApi.create>[0]) => timetableApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // ----- derived -----
  const daySlots = useMemo(() => slots.filter((s) => s.day_of_week === day), [slots, day]);

  const columns = useMemo(() => {
    if (view === "room") {
      const cols = rooms.map((r) => ({ id: r.id, label: r.name, sub: `${r.capacity} seats` }));
      if (daySlots.some((s) => !s.room_id))
        cols.push({ id: UNASSIGNED, label: "No room", sub: "assign a classroom" });
      return cols.length
        ? cols
        : [{ id: UNASSIGNED, label: "No room", sub: "add classrooms in Settings" }];
    }
    const cols = faculty.map((f) => ({ id: f.id, label: f.full_name, sub: f.subject ?? "" }));
    if (daySlots.some((s) => !s.faculty_id))
      cols.push({ id: UNASSIGNED, label: "No teacher", sub: "assign a teacher" });
    return cols.length ? cols : [{ id: UNASSIGNED, label: "No teacher", sub: "add faculty first" }];
  }, [view, rooms, faculty, daySlots]);

  function colIdOf(s: SlotRow) {
    return (view === "room" ? s.room_id : s.faculty_id) ?? UNASSIGNED;
  }

  /** slot lookup: `${colId}|${bandStart}` for the selected day */
  const cellMap = useMemo(() => {
    const m = new Map<string, SlotRow[]>();
    daySlots.forEach((s) => {
      const key = `${colIdOf(s)}|${s.start_time.slice(0, 5)}`;
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySlots, view]);

  /** bands a longer class (90 min in a 60 min grid) continues into */
  const covered = useMemo(() => {
    const c = new Set<string>();
    daySlots.forEach((s) => {
      const sM = toMinutes(s.start_time);
      const eM = toMinutes(s.end_time);
      bands.forEach((b) => {
        const bM = toMinutes(b.start);
        if (bM > sM && bM < eM) c.add(`${colIdOf(s)}|${b.start}`);
      });
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySlots, bands, view]);

  const { clashes, badIds } = useMemo(() => reconcile(slots), [slots]);
  const capIssues = useMemo(() => capacityWarnings(slots, batchStrength), [slots, batchStrength]);
  const capIds = useMemo(() => new Set(capIssues.map((c) => c.slot.id)), [capIssues]);

  const outsideCount = useMemo(
    () =>
      daySlots.filter((s) => {
        const m = toMinutes(s.start_time);
        return m < windowStart || m >= windowEnd;
      }).length,
    [daySlots, windowStart, windowEnd],
  );

  const coverage = useMemo(() => {
    const inShift = daySlots.filter((s) => {
      const m = toMinutes(s.start_time);
      return m >= windowStart && m < windowEnd;
    });
    const usedRooms = new Set(inShift.map((s) => s.room_id).filter(Boolean) as string[]);
    const load = new Map<string, number>();
    inShift.forEach((s) => {
      if (s.faculty_id) load.set(s.faculty_id, (load.get(s.faculty_id) ?? 0) + 1);
    });
    return {
      filled: inShift.length,
      capacityCells: bands.length * Math.max(1, rooms.length),
      idleRooms: rooms.filter((r) => !usedRooms.has(r.id)),
      load,
    };
  }, [daySlots, windowStart, windowEnd, bands.length, rooms]);

  // ----- drag & drop -----
  async function onDropCell(colId: string, band: { start: string; end: string }, ev: DragEvent) {
    ev.preventDefault();
    if (!canWrite) return;
    const raw = ev.dataTransfer.getData("application/json");
    if (!raw) return;
    const p: DragPayload = JSON.parse(raw);
    const duration = Math.max(15, p.durationMin ?? toMinutes(band.end) - toMinutes(band.start));
    const startM = toMinutes(band.start);
    const colRoom = view === "room" && colId !== UNASSIGNED ? colId : (p.roomId ?? null);
    const colFaculty = view === "faculty" && colId !== UNASSIGNED ? colId : (p.facultyId ?? null);
    const candidate = {
      day_of_week: day,
      start_time: `${band.start}:00`,
      end_time: `${toHHMM(startM + duration)}:00`,
      batch_id: p.batchId ?? null,
      faculty_id: colFaculty,
      subject: p.subject ?? null,
      room_id: colRoom,
      room: colRoom ? (rooms.find((r) => r.id === colRoom)?.name ?? null) : null,
    };
    const conflicts = findConflicts(candidate, slots);
    if (conflicts.length) {
      const reasons = conflicts
        .map((c) => conflictReason(candidate, c))
        .filter(Boolean)
        .join("; ");
      toast.error(`Clash with an existing class (${reasons || "same day & time"}). Not added.`);
      return;
    }
    const created = await createMut.mutateAsync(candidate);
    toast.success("Class added");
    const needsDetails = p.quick || !candidate.faculty_id || !candidate.room_id;
    if (created && needsDetails) {
      setEditing(created);
      setPresets({ day });
      setDialogOpen(true);
    }
  }

  // ----- sharing -----
  function shareWeekly() {
    const inst = getInstitute();
    const byDay = new Map<number, SlotRow[]>();
    slots.forEach((s) => {
      const arr = byDay.get(s.day_of_week) ?? [];
      arr.push(s);
      byDay.set(s.day_of_week, arr);
    });
    const lines: string[] = [`*${inst.name || "Academy"} — Weekly Timetable*`];
    DAY_ORDER.forEach((dow) => {
      const rows = (byDay.get(dow) ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (!rows.length) return;
      lines.push(`\n*${DAY_LABEL[dow]}*`);
      rows.forEach((r) => {
        const parts = [
          `${formatTime12(r.start_time)}–${formatTime12(r.end_time)}`,
          r.batch?.name,
          r.subject,
          r.faculty?.full_name && `👨‍🏫 ${r.faculty.full_name}`,
          roomLabel(r) && `🚪 ${roomLabel(r)}`,
        ].filter(Boolean);
        lines.push(`• ${parts.join(" · ")}`);
      });
    });
    if (lines.length === 1) {
      toast.info("No slots to share yet.");
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function sendTeacherDay(f: Faculty) {
    const inst = getInstitute();
    const rows = daySlots
      .filter((s) => s.faculty_id === f.id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((s) => ({
        start: formatTime12(s.start_time),
        end: formatTime12(s.end_time),
        batch: s.batch?.name ?? null,
        room: roomLabel(s),
        subject: s.subject,
      }));
    const msg = teacherDayMessage(f.full_name, DAY_FULL[day], rows, inst.name);
    if (!openWhatsApp(f.phone, msg)) {
      toast.error(`No WhatsApp number saved for ${f.full_name}.`);
    }
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Weekly plan across classrooms. Drag a batch onto a cell, then set teacher & subject. Room, teacher and batch clashes are blocked."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={shareWeekly}>
              <Share2 className="h-4 w-4" />
              Share week
            </Button>
            {canWrite && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditing(null);
                  setPresets({ day });
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New class
              </Button>
            )}
          </div>
        }
      />
      <PageBody>
        <div className="mb-4 inline-flex rounded-md border border-border bg-muted/40 p-0.5">
          {(["daily", "weekly"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "daily" ? "Today's schedule" : "Weekly plan"}
            </button>
          ))}
        </div>

        {mode === "daily" ? (
          <DailySchedule
            slots={slots}
            rooms={rooms}
            faculty={faculty}
            batches={batches}
            canWrite={canWrite}
          />
        ) : (
          <>
        {/* controls */}
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {DAY_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  day === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5">
              {(["morning", "evening"] as ShiftKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setShiftKey(k)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    shiftKey === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {SHIFT_LABEL[k]} shift
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-md border border-border p-0.5">
              {(["room", "faculty"] as ViewKey[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {v === "room" ? "Room view" : "Teacher view"}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTime12(shift.start)} – {formatTime12(shift.end)} · {shift.period} min periods
            </span>
            {outsideCount > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {outsideCount} class(es) outside this shift
              </span>
            )}
            <p className="ml-auto text-xs text-muted-foreground">
              {coverage.filled} class(es) on {DAY_FULL[day]}
            </p>
          </div>
          {canWrite && (
            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Shift start</Label>
                <Input
                  type="time"
                  value={shift.start}
                  onChange={(e) => patchShift({ start: e.target.value })}
                  className="h-8 w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Shift end</Label>
                <Input
                  type="time"
                  value={shift.end}
                  onChange={(e) => patchShift({ end: e.target.value })}
                  className="h-8 w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period length</Label>
                <Select
                  value={String(shift.period)}
                  onValueChange={(v) => patchShift({ period: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[45, 60, 90].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m === 60 ? "1 hour" : m === 90 ? "1.5 hours" : `${m} min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" className="h-8" onClick={persistShifts}>
                Save timings
              </Button>
            </div>
          )}
        </div>

        {/* reconciliation */}
        {(clashes.length > 0 || capIssues.length > 0) && (
          <div className="mb-4 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Reconciliation — {clashes.length} clash(es), {capIssues.length} capacity warning(s)
            </p>
            <ul className="space-y-1 text-xs">
              {clashes.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setDay(c.day);
                      setView(c.kind === "teacher" ? "faculty" : "room");
                    }}
                    className="text-left text-destructive underline-offset-2 hover:underline"
                  >
                    {DAY_LABEL[c.day]} {formatTime12(c.time)} — {c.kind} {c.who} double-booked:{" "}
                    {c.slots.map((s) => s.batch?.name ?? "—").join(" & ")}
                  </button>
                </li>
              ))}
              {capIssues.map((w) => (
                <li key={`cap-${w.slot.id}`} className="text-muted-foreground">
                  {DAY_LABEL[w.slot.day_of_week]} {formatTime12(w.slot.start_time)} —{" "}
                  {w.slot.batch?.name ?? "Batch"} has {w.strength} students but {roomLabel(w.slot)}{" "}
                  seats {w.capacity}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          {canWrite && (
            <div className="space-y-4">
              <BatchPalette
                batches={batches}
                rooms={rooms}
                defaultDuration={shift.period}
                strength={batchStrength}
              />
              <TeacherDayPanel
                faculty={faculty}
                load={coverage.load}
                dayLabel={DAY_FULL[day]}
                onSend={sendTeacherDay}
              />
              {coverage.idleRooms.length > 0 && (
                <aside className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Free classrooms
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {coverage.idleRooms.map((r) => r.name).join(", ")} — unused on {DAY_LABEL[day]}{" "}
                    {SHIFT_LABEL[shiftKey].toLowerCase()} shift.
                  </p>
                </aside>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading timetable…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-24 border-b border-border px-2 py-2">Time</th>
                    {columns.map((c) => (
                      <th key={c.id} className="border-b border-l border-border px-2 py-2">
                        <span className="block truncate normal-case text-foreground">
                          {c.label}
                        </span>
                        {c.sub && (
                          <span className="block truncate text-[10px] font-normal normal-case">
                            {c.sub}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bands.map((band) => (
                    <tr key={band.start} className="align-top">
                      <td className="whitespace-nowrap border-b border-border px-2 py-2 text-xs font-medium text-muted-foreground">
                        {formatTime12(band.start)}
                        <br />
                        <span className="text-[10px]">– {formatTime12(band.end)}</span>
                      </td>
                      {columns.map((c) => {
                        const cells = cellMap.get(`${c.id}|${band.start}`) ?? [];
                        const isCovered = covered.has(`${c.id}|${band.start}`);
                        return (
                          <td
                            key={c.id}
                            onDragOver={(e) => {
                              if (canWrite) e.preventDefault();
                            }}
                            onDrop={(e) => onDropCell(c.id, band, e)}
                            className="border-b border-l border-border p-1"
                          >
                            <div className="flex min-h-[64px] flex-col gap-1">
                              {cells.map((s) => (
                                <div
                                  key={s.id}
                                  className={`group rounded-md border p-1.5 ${
                                    badIds.has(s.id)
                                      ? "border-destructive/60 bg-destructive/10"
                                      : capIds.has(s.id)
                                        ? "border-amber-500/60 bg-amber-500/10"
                                        : "border-primary/20 bg-primary/5"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="truncate text-xs font-semibold leading-tight">
                                      {s.batch?.name ?? "—"}
                                    </p>
                                    {badIds.has(s.id) && (
                                      <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatTime12(s.start_time)} – {formatTime12(s.end_time)}
                                  </p>
                                  <p className="truncate text-[10px]">
                                    {view === "room"
                                      ? (s.faculty?.full_name ?? "No teacher")
                                      : (roomLabel(s) ?? "No room")}
                                  </p>
                                  {s.subject && (
                                    <p className="truncate text-[10px] text-muted-foreground">
                                      {s.subject}
                                    </p>
                                  )}
                                  {canWrite && (
                                    <div className="mt-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        className="rounded p-0.5 hover:bg-muted"
                                        onClick={() => {
                                          setEditing(s);
                                          setPresets({ day: s.day_of_week });
                                          setDialogOpen(true);
                                        }}
                                        title="Edit"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        className="rounded p-0.5 text-destructive hover:bg-muted"
                                        onClick={() => removeMut.mutate(s.id)}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {canWrite && cells.length === 0 && !isCovered && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(null);
                                    setPresets({
                                      day,
                                      start: band.start,
                                      end: toHHMM(toMinutes(band.start) + shift.period),
                                      roomId: view === "room" && c.id !== UNASSIGNED ? c.id : null,
                                      facultyId:
                                        view === "faculty" && c.id !== UNASSIGNED ? c.id : null,
                                    });
                                    setDialogOpen(true);
                                  }}
                                  className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                                >
                                  + drop or add
                                </button>
                              )}
                              {cells.length === 0 && isCovered && (
                                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/40 text-[10px] text-muted-foreground/60">
                                  ↑ continued
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </PageBody>
      <TimetableSlotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slot={editing}
        defaultDay={presets.day}
        defaultStart={presets.start}
        defaultEnd={presets.end}
        defaultRoomId={presets.roomId ?? undefined}
        defaultFacultyId={presets.facultyId ?? undefined}
      />
    </>
  );
}

function BatchPalette({
  batches,
  rooms,
  defaultDuration,
  strength,
}: {
  batches: Batch[];
  rooms: Room[];
  defaultDuration: number;
  strength: Map<string, number>;
}) {
  const [duration, setDuration] = useState(defaultDuration);
  const [roomId, setRoomId] = useState<string>(UNASSIGNED);

  return (
    <aside className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Batches
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Drag a batch onto any cell — the column decides the room (or teacher), then pick the rest.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Class length</Label>
        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[45, 60, 90].map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m === 60 ? "1 hour" : m === 90 ? "1.5 hours" : `${m} min`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Default room (teacher view)</Label>
        <Select value={roomId} onValueChange={setRoomId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Decide later</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
        {batches.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No batches yet — create one first.</p>
        )}
        {batches.map((b) => (
          <div
            key={b.id}
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                  batchId: b.id,
                  roomId: roomId === UNASSIGNED ? undefined : roomId,
                  durationMin: duration,
                  quick: true,
                } satisfies DragPayload),
              )
            }
            className="flex cursor-grab items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs active:cursor-grabbing"
          >
            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{b.name}</span>
            <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {strength.get(b.id) ?? 0}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function TeacherDayPanel({
  faculty,
  load,
  dayLabel,
  onSend,
}: {
  faculty: Faculty[];
  load: Map<string, number>;
  dayLabel: string;
  onSend: (f: Faculty) => void;
}) {
  return (
    <aside className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Teacher load · {dayLabel}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Send each teacher their day schedule on WhatsApp.
        </p>
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto pr-0.5">
        {faculty.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No teachers added yet.</p>
        )}
        {faculty.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs"
          >
            <span className="truncate">{f.full_name}</span>
            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {load.get(f.id) ?? 0}
            </span>
            <button
              type="button"
              onClick={() => onSend(f)}
              title={`Send ${f.full_name}'s schedule`}
              className="shrink-0 rounded p-0.5 text-primary hover:bg-muted"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
