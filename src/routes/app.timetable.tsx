import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil, Share2, AlertTriangle } from "lucide-react";
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
import { TimetableSlotDialog } from "@/components/app/timetable-slot-dialog";
import {
  batchesApi,
  facultyApi,
  timetableApi,
  type Batch,
  type Faculty,
  type TimetableSlot,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { getInstitute } from "@/lib/academy-settings";

export const Route = createFileRoute("/app/timetable")({
  component: TimetablePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

type SlotRow = TimetableSlot & {
  batch?: { id: string; name: string } | null;
  faculty?: { id: string; full_name: string } | null;
};

type DragPayload = {
  batchId?: string;
  facultyId?: string;
  subject?: string;
  room?: string;
  durationMin?: number;
  /** dropped straight from the batch list — open the editor to pick subject + teacher */
  quick?: boolean;
};

function toMin(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aS: string, aE: string, bS: string, bE: string) {
  return toMin(aS) < toMin(bE) && toMin(bS) < toMin(aE);
}
function findConflicts(
  candidate: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string | null;
    faculty_id?: string | null;
    batch_id?: string | null;
    id?: string;
  },
  all: SlotRow[],
) {
  return all.filter((s) => {
    if (s.id === candidate.id) return false;
    if (s.day_of_week !== candidate.day_of_week) return false;
    if (!overlaps(s.start_time, s.end_time, candidate.start_time, candidate.end_time)) return false;
    const sameRoom =
      candidate.room &&
      s.room &&
      s.room.trim().toLowerCase() === candidate.room.trim().toLowerCase();
    const sameFaculty =
      candidate.faculty_id && s.faculty_id && s.faculty_id === candidate.faculty_id;
    const sameBatch = candidate.batch_id && s.batch_id && s.batch_id === candidate.batch_id;
    return Boolean(sameRoom || sameFaculty || sameBatch);
  });
}

function conflictReason(
  a: { room?: string | null; faculty_id?: string | null; batch_id?: string | null },
  b: SlotRow,
): string {
  const reasons: string[] = [];
  if (a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase())
    reasons.push(`room ${b.room}`);
  if (a.faculty_id && b.faculty_id === a.faculty_id)
    reasons.push(`teacher ${b.faculty?.full_name ?? ""}`.trim());
  if (a.batch_id && b.batch_id === a.batch_id) reasons.push(`batch ${b.batch?.name ?? ""}`.trim());
  return reasons.join(", ");
}

function TimetablePage() {
  const qc = useQueryClient();
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

  // Time band settings (editable)
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(20);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const bands = useMemo(
    () => buildBands(startHour, endHour, slotMinutes),
    [startHour, endHour, slotMinutes],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [defaultDay, setDefaultDay] = useState(1);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timetable"] });
      toast.success("Slot added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grid = useMemo(() => {
    const g = new Map<string, SlotRow[]>();
    slots.forEach((s) => {
      const key = `${s.day_of_week}|${s.start_time.slice(0, 5)}`;
      const arr = g.get(key) ?? [];
      arr.push(s);
      g.set(key, arr);
    });
    return g;
  }, [slots]);

  // Bands within a slot's duration (after its start band) that are "covered" and should hide the drop UI.
  const covered = useMemo(() => {
    const c = new Set<string>();
    slots.forEach((s) => {
      const sM = toMin(s.start_time),
        eM = toMin(s.end_time);
      for (let m = sM + slotMinutes; m < eM; m += slotMinutes) {
        c.add(`${s.day_of_week}|${fmt(m)}`);
      }
    });
    return c;
  }, [slots, slotMinutes]);

  // Precompute conflict set: any slot that overlaps another on same day for same room/teacher/batch
  const conflictIds = useMemo(() => {
    const bad = new Set<string>();
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i],
          b = slots[j];
        if (a.day_of_week !== b.day_of_week) continue;
        if (!overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) continue;
        const sameRoom =
          a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase();
        const sameFaculty = a.faculty_id && b.faculty_id && a.faculty_id === b.faculty_id;
        const sameBatch = a.batch_id && b.batch_id && a.batch_id === b.batch_id;
        if (sameRoom || sameFaculty || sameBatch) {
          bad.add(a.id);
          bad.add(b.id);
        }
      }
    }
    return bad;
  }, [slots]);

  async function onDropCell(dayIdx: number, band: { start: string; end: string }, ev: DragEvent) {
    ev.preventDefault();
    if (!canWrite) return;
    const raw = ev.dataTransfer.getData("application/json");
    if (!raw) return;
    const p: DragPayload = JSON.parse(raw);
    const duration = Math.max(15, p.durationMin ?? toMin(band.end) - toMin(band.start));
    const startM = toMin(band.start + ":00");
    const endStr = fmt(startM + duration);
    const candidate = {
      day_of_week: dayIdx,
      start_time: band.start + ":00",
      end_time: endStr + ":00",
      batch_id: p.batchId ?? null,
      faculty_id: p.facultyId ?? null,
      subject: p.subject ?? null,
      room: p.room ?? null,
    };
    const conflicts = findConflicts(candidate, slots);
    if (conflicts.length) {
      const reasons = conflicts
        .map((c) => conflictReason(candidate, c))
        .filter(Boolean)
        .join("; ");
      toast.error(`Conflict with existing slot (${reasons || "same day/time"}). Not added.`);
      return;
    }
    if (p.quick) {
      const created = await createMut.mutateAsync(candidate);
      setEditing(created as TimetableSlot);
      setDefaultDay(dayIdx);
      setDialogOpen(true);
      return;
    }
    createMut.mutate(candidate);
  }

  function shareToWhatsApp() {
    const inst = getInstitute();
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay = new Map<number, SlotRow[]>();
    slots.forEach((s) => {
      const arr = byDay.get(s.day_of_week) ?? [];
      arr.push(s);
      byDay.set(s.day_of_week, arr);
    });
    const lines: string[] = [`*${inst.name || "Academy"} — Weekly Timetable*`];
    DAY_INDEX.forEach((dow) => {
      const rows = (byDay.get(dow) ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (!rows.length) return;
      lines.push(`\n*${dayLabels[dow]}*`);
      rows.forEach((r) => {
        const time = `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`;
        const parts = [
          time,
          r.batch?.name,
          r.subject,
          r.faculty?.full_name && `👨‍🏫 ${r.faculty.full_name}`,
          r.room && `🚪 ${r.room}`,
        ].filter(Boolean);
        lines.push(`• ${parts.join(" · ")}`);
      });
    });
    if (lines.length === 1) {
      toast.info("No slots to share yet.");
      return;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Build a class (batch + teacher + subject + room), drag it onto a cell. Overlaps for same room/teacher/batch are blocked."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={shareToWhatsApp}>
              <Share2 className="h-4 w-4" />
              Share to WhatsApp
            </Button>
            {canWrite && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditing(null);
                  setDefaultDay(1);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New slot
              </Button>
            )}
          </div>
        }
      />
      <PageBody>
        {conflictIds.size > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {conflictIds.size} slot(s) have conflicts (same room, teacher, or batch overlapping).
              They're highlighted in red — edit or remove them.
            </p>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div className="space-y-1">
            <Label className="text-xs">Day start</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value) || 0)}
              className="h-8 w-20"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Day end</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value) || 24)}
              className="h-8 w-20"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Grid step (min)</Label>
            <Input
              type="number"
              min={15}
              max={60}
              step={15}
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value) || 30)}
              className="h-8 w-24"
            />
          </div>
          <p className="ml-auto text-xs text-muted-foreground">
            {slots.length} scheduled · classes can be 30/45/60/90 min
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {canWrite && (
            <div className="space-y-4">
              <BatchPalette batches={batches} />
              <ClassBuilder batches={batches} faculty={faculty} />
            </div>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-24 border-b border-border px-2 py-2">Time</th>
                    {DAYS.map((d) => (
                      <th key={d} className="border-b border-l border-border px-2 py-2">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bands.map((band) => (
                    <tr key={band.start} className="align-top">
                      <td className="border-b border-border px-2 py-2 text-xs font-medium text-muted-foreground">
                        {band.start}
                        <br />
                        <span className="text-[10px]">– {band.end}</span>
                      </td>
                      {DAY_INDEX.map((dow) => {
                        const cells = grid.get(`${dow}|${band.start}`) ?? [];
                        const isCovered = covered.has(`${dow}|${band.start}`);
                        return (
                          <td
                            key={dow}
                            onDragOver={(e) => {
                              if (canWrite) e.preventDefault();
                            }}
                            onDrop={(e) => onDropCell(dow, band, e)}
                            className="min-h-[64px] border-b border-l border-border p-1"
                          >
                            <div className="flex min-h-[56px] flex-col gap-1">
                              {cells.map((s) => (
                                <div
                                  key={s.id}
                                  className={`group rounded-md border p-1.5 ${conflictIds.has(s.id) ? "border-destructive/60 bg-destructive/10" : "border-primary/20 bg-primary/5"}`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="text-xs font-semibold leading-tight">
                                      {s.subject ?? s.batch?.name ?? "—"}
                                    </p>
                                    {conflictIds.has(s.id) && (
                                      <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {s.batch?.name ?? "—"}
                                  </p>
                                  <p className="truncate text-[10px]">
                                    {s.faculty?.full_name ?? "—"} · Room {s.room ?? "—"}
                                  </p>
                                  {canWrite && (
                                    <div className="mt-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        className="rounded p-0.5 hover:bg-muted"
                                        onClick={() => {
                                          setEditing(s);
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
                                    setDefaultDay(dow);
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
      </PageBody>
      <TimetableSlotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slot={editing}
        defaultDay={defaultDay}
      />
    </>
  );
}

function ClassBuilder({ batches, faculty }: { batches: Batch[]; faculty: Faculty[] }) {
  const [batchId, setBatchId] = useState<string>("");
  const [facultyId, setFacultyId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [duration, setDuration] = useState<number>(60);

  const selectedBatch = batches.find((b) => b.id === batchId);
  const selectedFaculty = faculty.find((f) => f.id === facultyId);
  const ready = Boolean(batchId && facultyId && subject.trim());

  const payload: DragPayload = {
    batchId: batchId || undefined,
    facultyId: facultyId || undefined,
    subject: subject.trim() || selectedFaculty?.subject || undefined,
    room: room.trim() || undefined,
    durationMin: duration,
  };

  function onDragStart(e: DragEvent) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function reset() {
    setBatchId("");
    setFacultyId("");
    setSubject("");
    setRoom("");
  }

  return (
    <aside className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Class builder
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Fill all four, drag the card onto any cell.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Batch</Label>
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger className="h-8 text-xs">
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
        <Label className="text-xs">Teacher</Label>
        <Select
          value={facultyId}
          onValueChange={(v) => {
            setFacultyId(v);
            const f = faculty.find((x) => x.id === v);
            if (f?.subject && !subject) setSubject(f.subject);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select teacher" />
          </SelectTrigger>
          <SelectContent>
            {faculty.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.full_name}
                {f.subject ? ` · ${f.subject}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-8 text-xs"
          placeholder="Physics"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Room</Label>
        <Input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="h-8 text-xs"
          placeholder="101"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Duration</Label>
        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[30, 45, 60, 75, 90, 120].map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        draggable={ready}
        onDragStart={onDragStart}
        className={`rounded-md border p-2 text-xs ${ready ? "cursor-grab border-primary bg-primary/5 active:cursor-grabbing" : "border-dashed border-border text-muted-foreground"}`}
      >
        <div className="mb-1 flex items-center gap-1 font-semibold">
          <GripVertical className="h-3 w-3" />
          {ready ? "Drag this class card" : "Card ready when all four filled"}
        </div>
        {ready && (
          <div className="space-y-0.5 text-[11px]">
            <div>📚 {selectedBatch?.name}</div>
            <div>👨‍🏫 {selectedFaculty?.full_name}</div>
            <div>📖 {subject}</div>
            <div>🚪 Room {room || "—"}</div>
            <div>⏱ {duration} min</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={reset}
        >
          Reset
        </Button>
      </div>
    </aside>
  );
}

function buildBands(startHour: number, endHour: number, slotMinutes: number) {
  const out: { start: string; end: string }[] = [];
  const startM = Math.max(0, Math.min(23, startHour)) * 60;
  const endM = Math.max(startM + slotMinutes, Math.min(24, endHour) * 60);
  for (let m = startM; m + slotMinutes <= endM; m += slotMinutes) {
    out.push({ start: fmt(m), end: fmt(m + slotMinutes) });
  }
  return out;
}
function fmt(m: number) {
  const h = Math.floor(m / 60),
    mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
