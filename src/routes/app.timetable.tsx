import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, CopyPlus, GripVertical, Image, Plus, Users } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ClassTimetable } from "@/components/app/timetable/class-timetable";
import { PeriodGrid, type GridCell } from "@/components/app/timetable/period-grid";
import { TeacherDaySheet } from "@/components/app/timetable/teacher-day-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/app/field";
import { TimetableSlotDialog } from "@/components/app/timetable-slot-dialog";
import {
  batchesApi,
  facultyApi,
  roomsApi,
  studentsApi,
  subjectsApi,
  timetableApi,
  type TimetableSlot,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { getInstitute, DEFAULT_SHIFTS, type Shifts } from "@/lib/academy-settings";
import { toMinutes, toHHMM } from "@/lib/time";
import { formatTime12 } from "@/lib/time";
import {
  buildBands,
  conflictReason,
  findConflicts,
  reconcile,
  roomLabel,
  type Band,
  type SlotRow,
} from "@/lib/timetable/conflicts";
import { shareTableAsImage } from "@/lib/timetable/share-image";

export const Route = createFileRoute("/app/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — Academix" },
      {
        name: "description",
        content:
          "Plan the week once: drag a batch into a period, then drop the teacher and subject on it. Share today's sheet as an image.",
      },
      { property: "og:title", content: "Timetable — Academix" },
      {
        property: "og:description",
        content: "One weekly plan; teacher day sheets and student class timetables come from it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimetablePage,
});

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6];
const UNASSIGNED = "__none__";

type Mode = "plan" | "today" | "class";
const MODE_LABEL: Record<Mode, string> = {
  plan: "Plan the week",
  today: "Today — teachers",
  class: "Class timetable",
};

type DragPayload = { batchId?: string; facultyId?: string; subject?: string };

function TimetablePage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("batch:write", roles);
  const [mode, setMode] = useState<Mode>("plan");

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => timetableApi.list() as Promise<SlotRow[]>,
  });
  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list() });
  const { data: faculty = [] } = useQuery({ queryKey: ["faculty"], queryFn: () => facultyApi.list() });
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: () => roomsApi.list() });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });
  const { data: subjectRows = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectsApi.list(),
  });

  const strength = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => s.batch_id && m.set(s.batch_id, (m.get(s.batch_id) ?? 0) + 1));
    return m;
  }, [students]);

  const subjectNames = useMemo(() => {
    const set = new Set<string>();
    subjectRows.forEach((s) => s.name && set.add(s.name));
    slots.forEach((s) => s.subject && set.add(s.subject));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [subjectRows, slots]);

  // shift windows come from Settings — the grid is fixed, only the content changes
  const shifts: Shifts = useMemo(() => getInstitute().shifts ?? DEFAULT_SHIFTS, []);
  const [shiftKey, setShiftKey] = useState<"morning" | "evening">(() =>
    new Date().getHours() < 12 ? "morning" : "evening",
  );
  const shift = shifts[shiftKey];
  const bands = useMemo(
    () => buildBands(shift.start, shift.end, shift.period),
    [shift.start, shift.end, shift.period],
  );

  const [day, setDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 1 : d;
  });
  const today = new Date().getDay() === 0 ? 1 : new Date().getDay();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [presets, setPresets] = useState<{
    day: number;
    start?: string;
    end?: string;
    roomId?: string;
  }>({ day: 1 });

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof timetableApi.create>[0]) => timetableApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TimetableSlot> }) =>
      timetableApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => timetableApi.remove(id),
    onSuccess: () => {
      toast.success("Class removed");
      qc.invalidateQueries({ queryKey: ["timetable"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { clashes, badIds } = useMemo(() => reconcile(slots), [slots]);

  const columns = useMemo(() => {
    const cols = rooms.map((r) => ({ id: r.id, label: r.name, sub: `${r.capacity} seats` }));
    return cols.length ? cols : [{ id: UNASSIGNED, label: "Classroom 1", sub: "add rooms in Settings" }];
  }, [rooms]);

  const daySlots = useMemo(() => slots.filter((s) => s.day_of_week === day), [slots, day]);

  function slotAt(colId: string, band: Band, list: SlotRow[]) {
    return list.find(
      (s) =>
        (s.room_id ?? UNASSIGNED) === colId && s.start_time.slice(0, 5) === band.start.slice(0, 5),
    );
  }

  function cellOf(list: SlotRow[]) {
    return (colId: string, band: Band): GridCell | null => {
      const s = slotAt(colId, band, list);
      if (!s) return null;
      return {
        id: s.id,
        title: s.batch?.name ?? "Batch?",
        subject: s.subject,
        person: s.faculty?.full_name ?? "No teacher",
        clash: badIds.has(s.id),
        warn: !s.faculty_id || !s.subject,
      };
    };
  }

  async function dropOnCell(colId: string, band: Band, ev: DragEvent) {
    ev.preventDefault();
    if (!canWrite) return;
    const raw = ev.dataTransfer.getData("application/json");
    if (!raw) return;
    const p: DragPayload = JSON.parse(raw) as DragPayload;
    if (!p.batchId) {
      toast.info("Drop a batch on an empty period first, then the teacher and subject.");
      return;
    }
    const candidate = {
      day_of_week: day,
      start_time: `${band.start}:00`,
      end_time: `${toHHMM(toMinutes(band.end))}:00`,
      batch_id: p.batchId,
      faculty_id: null,
      subject: null,
      room_id: colId === UNASSIGNED ? null : colId,
      room: colId === UNASSIGNED ? null : (rooms.find((r) => r.id === colId)?.name ?? null),
    };
    const conflicts = findConflicts(candidate, slots);
    if (conflicts.length) {
      const why = conflicts.map((c) => conflictReason(candidate, c)).filter(Boolean).join("; ");
      toast.error(`Already booked (${why || "same day & time"}).`);
      return;
    }
    await createMut.mutateAsync(candidate);
    toast.success("Batch placed — now drop a teacher and a subject on it");
  }

  function dropOnCard(cellId: string, ev: DragEvent) {
    ev.preventDefault();
    if (!canWrite) return;
    const raw = ev.dataTransfer.getData("application/json");
    if (!raw) return;
    const p: DragPayload = JSON.parse(raw) as DragPayload;
    const slot = slots.find((s) => s.id === cellId);
    if (!slot) return;
    if (p.subject) {
      updateMut.mutate({ id: slot.id, patch: { subject: p.subject } });
      toast.success(`${p.subject} assigned`);
      return;
    }
    if (p.facultyId) {
      if (findConflicts({ ...slot, faculty_id: p.facultyId }, slots).length) {
        toast.error("That teacher already has a class at this time.");
        return;
      }
      updateMut.mutate({ id: slot.id, patch: { faculty_id: p.facultyId } });
      toast.success("Teacher assigned");
      return;
    }
    if (p.batchId) {
      if (findConflicts({ ...slot, batch_id: p.batchId }, slots).length) {
        toast.error("That batch already has a class at this time.");
        return;
      }
      updateMut.mutate({ id: slot.id, patch: { batch_id: p.batchId } });
      toast.success("Batch changed");
    }
  }

  const planRef = useRef<HTMLDivElement>(null);

  /** batches already sitting on today's board — they leave the rail until asked back */
  const placedBatchIds = useMemo(
    () => new Set(daySlots.map((s) => s.batch_id).filter(Boolean) as string[]),
    [daySlots],
  );

  const [editRoom, setEditRoom] = useState<{ id: string; name: string; capacity: number } | null>(
    null,
  );
  const roomMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name: string; capacity: number } }) =>
      roomsApi.update(id, patch),
    onSuccess: () => {
      toast.success("Classroom updated");
      setEditRoom(null);
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextDay = day === 6 ? 1 : day + 1;
  const copyMut = useMutation({
    mutationFn: async () => {
      const existing = slots.filter((s) => s.day_of_week === nextDay);
      let made = 0;
      for (const s of daySlots) {
        const candidate = {
          day_of_week: nextDay,
          start_time: s.start_time,
          end_time: s.end_time,
          batch_id: s.batch_id,
          faculty_id: s.faculty_id,
          subject: s.subject,
          room_id: s.room_id,
          room: s.room,
        };
        if (findConflicts(candidate, existing).length) continue;
        await timetableApi.create(candidate);
        existing.push({ ...(s as SlotRow), ...candidate, id: `tmp-${made}` });
        made += 1;
      }
      return made;
    },
    onSuccess: (made) => {
      qc.invalidateQueries({ queryKey: ["timetable"] });
      toast.success(
        made ? `${made} class(es) copied to ${DAY_FULL[nextDay]}` : `${DAY_FULL[nextDay]} already has these classes`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function sharePlanImage() {
    const res = await shareTableAsImage(
      planRef.current,
      `timetable-${DAY_LABEL[day].toLowerCase()}`,
      `${getInstitute().name || "Academy"} — ${DAY_FULL[day]} timetable`,
    );
    if (res === "failed") toast.error("Could not create the image. Try again.");
    else if (res === "copied")
      toast.success("Image copied — paste it in the WhatsApp chat with Ctrl+V");
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Build the week once. Teachers get their day sheet, students get their class timetable — both from the same plan."
        actions={
          mode === "plan" ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={sharePlanImage}>
              <Image className="h-4 w-4" />
              Share as image
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className="mb-4 inline-flex flex-wrap rounded-md border border-border bg-muted/40 p-0.5">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
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

        {mode === "today" && (
          <TeacherDaySheet
            slots={slots.filter((s) => s.day_of_week === today)}
            faculty={faculty}
            dayLabel={DAY_FULL[today]}
          />
        )}

        {mode === "class" && <ClassTimetable slots={slots} batches={batches} />}

        {mode === "plan" && (
          <>
            {/* day + shift */}
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
              <div className="flex flex-wrap gap-1">
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
              <div className="inline-flex rounded-md border border-border p-0.5">
                {(["morning", "evening"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setShiftKey(k)}
                    className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      shiftKey === k
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <p className="ml-auto text-[11px] text-muted-foreground">
                Timings come from Settings → Classrooms &amp; timings
              </p>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={copyMut.isPending || daySlots.length === 0}
                  onClick={() => copyMut.mutate()}
                >
                  <CopyPlus className="h-4 w-4" />
                  Copy to {DAY_LABEL[nextDay]}
                </Button>
              )}
            </div>

            {clashes.length > 0 && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {clashes.length} clash(es) to fix
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {clashes.slice(0, 4).map((c) => (
                    <li key={c.key}>
                      {DAY_LABEL[c.day]} — {c.kind} {c.who} is in two classes at once
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 lg:flex-row">
              {canWrite && (
                <PlanRail
                  batches={batches.map((b) => ({ id: b.id, name: b.name }))}
                  faculty={faculty.map((f) => ({ id: f.id, name: f.full_name }))}
                  subjects={subjectNames}
                  strength={strength}
                  placed={placedBatchIds}
                />
              )}
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Loading timetable…
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <PeriodGrid
                        innerRef={planRef}
                        columns={columns}
                        bands={bands}
                        cell={cellOf(daySlots)}
                        canWrite={canWrite}
                        onCellDrop={dropOnCell}
                        onCardDrop={dropOnCard}
                        onDelete={(id) => removeMut.mutate(id)}
                        onEditCol={(colId) => {
                          const r = rooms.find((x) => x.id === colId);
                          if (!r) {
                            toast.info("Add classrooms in Settings → Classrooms & timings");
                            return;
                          }
                          setEditRoom({ id: r.id, name: r.name, capacity: r.capacity });
                        }}
                        onCellClick={(colId, band) => {
                          setEditing(null);
                          setPresets({
                            day,
                            start: band.start,
                            end: band.end,
                            roomId: colId === UNASSIGNED ? undefined : colId,
                          });
                          setDialogOpen(true);
                        }}
                        caption={
                          <p className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
                            {DAY_FULL[day]} · drag a <b>batch</b> into an empty period, then drop a{" "}
                            <b>teacher</b> and a <b>subject</b> on it. Clashes are blocked.
                          </p>
                        }
                      />
                    </div>
                    <div className="space-y-2 md:hidden">
                      {bands.map((b, i) => {
                        const rows = columns
                          .map((c) => ({ col: c, s: slotAt(c.id, b, daySlots) }))
                          .filter((r) => r.s);
                        return (
                          <div key={b.start} className="rounded-lg border border-border bg-card p-3">
                            <p className="text-xs font-semibold">
                              {formatTime12(b.start)} – {formatTime12(b.end)}
                            </p>
                            {rows.length === 0 ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">Free</p>
                            ) : (
                              rows.map(({ col, s }) => (
                                <button
                                  key={col.id}
                                  type="button"
                                  onClick={() => {
                                    if (!canWrite || !s) return;
                                    setEditing(s);
                                    setPresets({ day });
                                    setDialogOpen(true);
                                  }}
                                  className="mt-1.5 block w-full rounded-md bg-primary/10 px-2 py-1.5 text-left"
                                >
                                  <p className="text-xs font-medium">
                                    {s!.batch?.name ?? "Batch?"} · {s!.subject ?? "Subject?"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {s!.faculty?.full_name ?? "No teacher"} ·{" "}
                                    {roomLabel(s!) ?? col.label}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
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
        defaultRoomId={presets.roomId}
      />
      <Dialog open={Boolean(editRoom)} onOpenChange={(v) => !v && setEditRoom(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Classroom</DialogTitle>
          </DialogHeader>
          {editRoom && (
            <div className="space-y-3">
              <Field label="Room name">
                <Input
                  value={editRoom.name}
                  onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })}
                />
              </Field>
              <Field label="Seats">
                <Input
                  type="number"
                  min={1}
                  value={editRoom.capacity}
                  onChange={(e) =>
                    setEditRoom({ ...editRoom, capacity: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditRoom(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={roomMut.isPending || !editRoom.name.trim()}
                  onClick={() =>
                    roomMut.mutate({
                      id: editRoom.id,
                      patch: { name: editRoom.name.trim(), capacity: editRoom.capacity },
                    })
                  }
                >
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Step rail: batches first, then teachers, then subjects — dragged onto the board. */
function PlanRail({
  batches,
  faculty,
  subjects,
  strength,
  placed,
}: {
  batches: { id: string; name: string }[];
  faculty: { id: string; name: string }[];
  subjects: string[];
  strength: Map<string, number>;
  placed: Set<string>;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  /** a batch can run twice a day — ask for it back and it becomes draggable again */
  const [again, setAgain] = useState<Set<string>>(new Set());
  const drag = (payload: DragPayload) => (e: DragEvent<HTMLDivElement>) =>
    e.dataTransfer.setData("application/json", JSON.stringify(payload));

  const tabs = ["1 · Batches", "2 · Teachers", "3 · Subjects"];

  return (
    <aside className="w-full shrink-0 overflow-hidden rounded-lg border border-border bg-card lg:w-56">
      <div className="grid grid-cols-3 border-b border-border">
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setStep(i as 0 | 1 | 2)}
            className={`px-1 py-2 text-[11px] font-medium transition-colors ${
              step === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="max-h-[46vh] space-y-1.5 overflow-y-auto p-2.5">
        {step === 0 &&
          (batches.length ? (
            batches.map((b) => {
              const done = placed.has(b.id) && !again.has(b.id);
              if (done)
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    <span className="truncate line-through">{b.name}</span>
                    <button
                      type="button"
                      title="Add another session for this batch"
                      onClick={() => setAgain((s) => new Set(s).add(b.id))}
                      className="ml-auto flex shrink-0 items-center gap-0.5 rounded px-1 text-[10px] font-medium text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-3 w-3" />
                      session
                    </button>
                  </div>
                );
              return (
                <div
                  key={b.id}
                  draggable
                  onDragStart={drag({ batchId: b.id })}
                  className="flex cursor-grab items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs active:cursor-grabbing"
                >
                  <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{b.name}</span>
                  <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {strength.get(b.id) ?? 0}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-[11px] text-muted-foreground">Create a batch first.</p>
          ))}
        {step === 1 &&
          (faculty.length ? (
            faculty.map((f) => (
              <div
                key={f.id}
                draggable
                onDragStart={drag({ facultyId: f.id })}
                className="flex cursor-grab items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs active:cursor-grabbing"
              >
                <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">Invite teachers from the Faculty page.</p>
          ))}
        {step === 2 &&
          (subjects.length ? (
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <div
                  key={s}
                  draggable
                  onDragStart={drag({ subject: s })}
                  className="cursor-grab rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium active:cursor-grabbing"
                >
                  {s}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">Add subjects in Settings → Courses.</p>
          ))}
      </div>
      <p className="border-t border-border px-2.5 py-2 text-[10px] text-muted-foreground">
        Drag onto the board. Step 1 fills the period, steps 2 and 3 drop onto that class.
      </p>
    </aside>
  );
}
