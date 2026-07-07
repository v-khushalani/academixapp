import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimetableSlotDialog } from "@/components/app/timetable-slot-dialog";
import { batchesApi, facultyApi, timetableApi, type Batch, type Faculty, type TimetableSlot } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/timetable")({
  component: TimetablePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

type SlotRow = TimetableSlot & {
  batch?: { id: string; name: string } | null;
  faculty?: { id: string; full_name: string } | null;
};

type DragPayload = { batchId?: string; facultyId?: string; subject?: string };

function TimetablePage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("batch:write", roles);
  const { data: slots = [], isLoading } = useQuery({ queryKey: ["timetable"], queryFn: () => timetableApi.list() as Promise<SlotRow[]> });
  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list() });
  const { data: faculty = [] } = useQuery({ queryKey: ["faculty"], queryFn: () => facultyApi.list() });

  // Time band settings (editable)
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(20);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const bands = useMemo(() => buildBands(startHour, endHour, slotMinutes), [startHour, endHour, slotMinutes]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [defaultDay, setDefaultDay] = useState(1);

  const removeMut = useMutation({
    mutationFn: (id: string) => timetableApi.remove(id),
    onSuccess: () => { toast.success("Slot removed"); qc.invalidateQueries({ queryKey: ["timetable"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof timetableApi.create>[0]) => timetableApi.create(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timetable"] }); toast.success("Slot added"); },
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

  function onDropCell(dayIdx: number, band: { start: string; end: string }, ev: DragEvent) {
    ev.preventDefault();
    if (!canWrite) return;
    const raw = ev.dataTransfer.getData("application/json");
    if (!raw) return;
    const p: DragPayload = JSON.parse(raw);
    createMut.mutate({
      day_of_week: dayIdx,
      start_time: band.start + ":00",
      end_time: band.end + ":00",
      batch_id: p.batchId ?? null,
      faculty_id: p.facultyId ?? null,
      subject: p.subject ?? null,
    });
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Drag a batch, faculty, or subject onto any cell. Or click a cell for the full form."
        actions={canWrite ? <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setDefaultDay(1); setDialogOpen(true); }}><Plus className="h-4 w-4" />New slot</Button> : null}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div className="space-y-1"><Label className="text-xs">Day start</Label><Input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(Number(e.target.value) || 0)} className="h-8 w-20" /></div>
          <div className="space-y-1"><Label className="text-xs">Day end</Label><Input type="number" min={1} max={24} value={endHour} onChange={(e) => setEndHour(Number(e.target.value) || 24)} className="h-8 w-20" /></div>
          <div className="space-y-1"><Label className="text-xs">Slot (min)</Label><Input type="number" min={15} max={180} step={15} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value) || 60)} className="h-8 w-24" /></div>
          <p className="ml-auto text-xs text-muted-foreground">{slots.length} scheduled · drag & drop enabled</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          {canWrite && <Palette batches={batches} faculty={faculty} />}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-24 border-b border-border px-2 py-2">Time</th>
                    {DAYS.map((d) => <th key={d} className="border-b border-l border-border px-2 py-2">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bands.map((band) => (
                    <tr key={band.start} className="align-top">
                      <td className="border-b border-border px-2 py-2 text-xs font-medium text-muted-foreground">{band.start}<br /><span className="text-[10px]">– {band.end}</span></td>
                      {DAY_INDEX.map((dow) => {
                        const cells = grid.get(`${dow}|${band.start}`) ?? [];
                        return (
                          <td key={dow}
                              onDragOver={(e) => { if (canWrite) e.preventDefault(); }}
                              onDrop={(e) => onDropCell(dow, band, e)}
                              className="min-h-[64px] border-b border-l border-border p-1">
                            <div className="flex min-h-[56px] flex-col gap-1">
                              {cells.map((s) => (
                                <div key={s.id} className="group rounded-md border border-primary/20 bg-primary/5 p-1.5">
                                  <p className="text-xs font-semibold leading-tight">{s.subject ?? s.batch?.name ?? "—"}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">{s.batch?.name ?? ""}</p>
                                  <p className="truncate text-[10px]">{s.faculty?.full_name ?? "—"} · Room {s.room ?? "—"}</p>
                                  {canWrite && (
                                    <div className="mt-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button className="rounded p-0.5 hover:bg-muted" onClick={() => { setEditing(s); setDialogOpen(true); }} title="Edit"><Pencil className="h-3 w-3" /></button>
                                      <button className="rounded p-0.5 text-destructive hover:bg-muted" onClick={() => removeMut.mutate(s.id)} title="Delete"><Trash2 className="h-3 w-3" /></button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {canWrite && cells.length === 0 && (
                                <button type="button" onClick={() => { setEditing(null); setDefaultDay(dow); setDialogOpen(true); }}
                                  className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:border-primary hover:text-primary">
                                  + drop or add
                                </button>
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
      <TimetableSlotDialog open={dialogOpen} onOpenChange={setDialogOpen} slot={editing} defaultDay={defaultDay} />
    </>
  );
}

function Palette({ batches, faculty }: { batches: Batch[]; faculty: Faculty[] }) {
  const [subject, setSubject] = useState("");
  function onDragStart(payload: DragPayload) {
    return (e: DragEvent) => e.dataTransfer.setData("application/json", JSON.stringify(payload));
  }
  return (
    <aside className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batches</p>
        <div className="space-y-1">
          {batches.length === 0 && <p className="text-xs text-muted-foreground">No batches yet.</p>}
          {batches.map((b) => (
            <div key={b.id} draggable onDragStart={onDragStart({ batchId: b.id, subject: b.name })}
              className="flex cursor-grab items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:border-primary active:cursor-grabbing">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Faculty</p>
        <div className="space-y-1">
          {faculty.length === 0 && <p className="text-xs text-muted-foreground">No faculty yet.</p>}
          {faculty.map((f) => (
            <div key={f.id} draggable onDragStart={onDragStart({ facultyId: f.id, subject: f.subject ?? undefined })}
              className="flex cursor-grab items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:border-primary active:cursor-grabbing">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{f.full_name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick subject</p>
        <Input placeholder="e.g. Physics" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
        <div draggable={Boolean(subject.trim())}
          onDragStart={onDragStart({ subject: subject.trim() })}
          className={`mt-1.5 flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs ${subject.trim() ? "cursor-grab border-primary text-primary" : "border-border text-muted-foreground"}`}>
          <GripVertical className="h-3 w-3" />
          <span>{subject.trim() ? `Drag "${subject.trim()}"` : "Type subject to drag"}</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Drag any card onto a cell. Room & other details can be edited from the slot.</p>
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
  const h = Math.floor(m / 60), mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}