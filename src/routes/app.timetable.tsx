import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Plus, GripVertical, Share2, AlertTriangle, Send, Users } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { DailySchedule } from "@/components/app/daily-schedule";
import { ClassTimetable } from "@/components/app/timetable/class-timetable";
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
  subjectsApi,
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
import { ScheduleGrid, type GridItem } from "@/components/app/timetable/schedule-grid";

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

const MODE_LABEL: Record<"daily" | "weekly" | "class", string> = {
  daily: "Today (teachers)",
  weekly: "Weekly plan (rooms)",
  class: "Class timetable (students)",
};

function TimetablePage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"daily" | "weekly" | "class">("daily");
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
  const { data: subjectRows = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectsApi.list(),
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
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      timetableApi.update(id, patch),
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

  const { clashes, badIds } = useMemo(() => reconcile(slots), [slots]);
  const capIssues = useMemo(() => capacityWarnings(slots, batchStrength), [slots, batchStrength]);
  const capIds = useMemo(() => new Set(capIssues.map((c) => c.slot.id)), [capIssues]);

  const gridItems: GridItem[] = useMemo(
    () =>
      daySlots.map((s) => ({
        id: s.id,
        colId: colIdOf(s),
        start: s.start_time,
        end: s.end_time,
        title: s.batch?.name ?? "Unassigned batch",
        subject: s.subject,
        person: view === "room" ? (s.faculty?.full_name ?? "No teacher") : (roomLabel(s) ?? "No room"),
        tone: badIds.has(s.id) ? "clash" : capIds.has(s.id) ? "warn" : "default",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [daySlots, view, badIds, capIds],
  );

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
        <div className="mb-4 inline-flex flex-wrap rounded-md border border-border bg-muted/40 p-0.5">
          {(["daily", "weekly", "class"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {MODE_LABEL[m]}
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
        ) : mode === "class" ? (
          <ClassTimetable slots={slots} batches={batches} />
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
            <ScheduleGrid
              columns={columns}
              bands={bands}
              items={gridItems}
              canWrite={canWrite}
              emptyHint="Add class"
              onDropCell={(colId, band, ev) => onDropCell(colId, band, ev)}
              onItemClick={(it) => {
                const s = daySlots.find((x) => x.id === it.id);
                if (!s) return;
                setEditing(s);
                setPresets({ day: s.day_of_week });
                setDialogOpen(true);
              }}
              onItemDelete={(it) => removeMut.mutate(it.id)}
              onEmptyClick={(colId, band) => {
                setEditing(null);
                setPresets({
                  day,
                  start: band.start,
                  end: toHHMM(toMinutes(band.start) + shift.period),
                  roomId: view === "room" && colId !== UNASSIGNED ? colId : null,
                  facultyId: view === "faculty" && colId !== UNASSIGNED ? colId : null,
                });
                setDialogOpen(true);
              }}
              footer={
                <p className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  Drag a batch from the left onto any empty cell, or click a cell to add a class.
                  Click a class to edit it. Room, teacher and batch clashes are blocked automatically.
                </p>
              }
            />
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
