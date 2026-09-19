import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, CalendarPlus, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/app/field";
import { dayChangesApi, type DayChangeInput, type DayChangeRow } from "@/lib/api/day-changes";
import { formatTime12 } from "@/lib/time";
import { formatDate, todayISO } from "@/lib/dates";
import type { SlotRow } from "@/lib/timetable/conflicts";

type Person = { id: string; full_name: string };
type Named = { id: string; name: string };

const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Day-by-day changes on top of the weekly plan: cancel a class, shift its
 * time/teacher/room for one date, or add an extra class. The weekly plan itself
 * stays as it is, and students get an update the moment a change is saved.
 */
export function DayChanges({
  slots,
  faculty,
  rooms,
  batches,
  canWrite,
}: {
  slots: SlotRow[];
  faculty: Person[];
  rooms: Named[];
  batches: Named[];
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const weekday = useMemo(() => new Date(`${date}T00:00:00`).getDay(), [date]);

  const { data: changes = [] } = useQuery({
    queryKey: ["day-changes", date],
    queryFn: () => dayChangesApi.forDate(date),
  });

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => s.day_of_week === weekday)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots, weekday],
  );

  const bySlot = useMemo(() => {
    const m = new Map<string, DayChangeRow>();
    changes.forEach((c) => c.slot_id && m.set(c.slot_id, c));
    return m;
  }, [changes]);
  const extras = changes.filter((c) => c.kind === "extra");

  const saveMut = useMutation({
    mutationFn: (input: DayChangeInput) => dayChangesApi.save(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day-changes"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Saved — students and parents have been notified");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMut = useMutation({
    mutationFn: (id: string) => dayChangesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day-changes"] });
      toast.success("Back to the regular timetable");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editing, setEditing] = useState<{ slot: SlotRow | null } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || todayISO())}
          className="h-9 w-[10.5rem]"
        />
        <p className="text-xs text-muted-foreground">
          {DAY_FULL[weekday]} · {formatDate(date)}
        </p>
        {canWrite && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5"
            onClick={() => setEditing({ slot: null })}
          >
            <CalendarPlus className="h-4 w-4" />
            Add extra class
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Change only this date. The weekly plan stays the same for every other day.
      </p>

      {daySlots.length === 0 && extras.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No classes planned for {DAY_FULL[weekday]}.
        </div>
      ) : (
        <div className="space-y-2">
          {daySlots.map((s) => {
            const ch = bySlot.get(s.id);
            const cancelled = ch?.kind === "cancelled";
            return (
              <div
                key={s.id}
                className={`rounded-lg border p-3 ${
                  cancelled
                    ? "border-destructive/50 bg-destructive/5"
                    : ch
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card"
                }`}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {s.batch?.name ?? "Batch?"} · {ch?.subject ?? s.subject ?? "Subject?"}
                      {cancelled && (
                        <Badge variant="secondary" className="ml-2 bg-destructive/10 text-destructive">
                          Cancelled
                        </Badge>
                      )}
                      {ch && !cancelled && (
                        <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                          Changed
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime12(ch?.start_time ?? s.start_time)} –{" "}
                      {formatTime12(ch?.end_time ?? s.end_time)} ·{" "}
                      {ch?.faculty?.full_name ?? s.faculty?.full_name ?? "No teacher"}
                      {ch?.room_ref?.name ? ` · ${ch.room_ref.name}` : s.room ? ` · ${s.room}` : ""}
                    </p>
                    {ch?.note && <p className="mt-1 text-xs text-foreground">{ch.note}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {ch ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => undoMut.mutate(ch.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Undo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive"
                          onClick={() =>
                            saveMut.mutate({
                              date,
                              kind: "cancelled",
                              slot_id: s.id,
                              batch_id: s.batch_id,
                              subject: s.subject,
                              start_time: s.start_time,
                              end_time: s.end_time,
                            })
                          }
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setEditing({ slot: s })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {extras.map((c) => (
            <div key={c.id} className="rounded-lg border border-success/50 bg-success/5 p-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {c.batch?.name ?? "Batch?"} · {c.subject ?? "Extra class"}
                    <Badge variant="secondary" className="ml-2 bg-success/10 text-success">
                      Extra class
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime12(c.start_time ?? "00:00")} – {formatTime12(c.end_time ?? "00:00")} ·{" "}
                    {c.faculty?.full_name ?? "No teacher"}
                    {c.room_ref?.name ? ` · ${c.room_ref.name}` : ""}
                  </p>
                  {c.note && <p className="mt-1 text-xs text-foreground">{c.note}</p>}
                </div>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => undoMut.mutate(c.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ChangeDialog
        open={Boolean(editing)}
        onOpenChange={(v) => !v && setEditing(null)}
        date={date}
        slot={editing?.slot ?? null}
        faculty={faculty}
        rooms={rooms}
        batches={batches}
        saving={saveMut.isPending}
        onSave={(input) => {
          saveMut.mutate(input);
          setEditing(null);
        }}
      />
    </div>
  );
}

function ChangeDialog({
  open,
  onOpenChange,
  date,
  slot,
  faculty,
  rooms,
  batches,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  slot: SlotRow | null;
  faculty: Person[];
  rooms: Named[];
  batches: Named[];
  saving: boolean;
  onSave: (input: DayChangeInput) => void;
}) {
  const isExtra = !slot;
  const [f, setF] = useState<DayChangeInput>({ date, kind: "extra" });

  // reset each time the dialog opens
  const key = `${open}-${slot?.id ?? "extra"}-${date}`;
  const [seen, setSeen] = useState("");
  if (open && seen !== key) {
    setSeen(key);
    setF({
      date,
      kind: slot ? "changed" : "extra",
      slot_id: slot?.id ?? null,
      batch_id: slot?.batch_id ?? null,
      faculty_id: slot?.faculty_id ?? null,
      room_id: slot?.room_id ?? null,
      subject: slot?.subject ?? "",
      start_time: (slot?.start_time ?? "09:00").slice(0, 5),
      end_time: (slot?.end_time ?? "10:00").slice(0, 5),
      note: "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isExtra ? `Extra class · ${formatDate(date)}` : `Change this class · ${formatDate(date)}`}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!f.batch_id) {
              toast.error("Choose a batch first");
              return;
            }
            onSave({ ...f, date, kind: isExtra ? "extra" : "changed" });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="Batch">
            <Select
              value={f.batch_id ?? "none"}
              onValueChange={(v) => setF({ ...f, batch_id: v === "none" ? null : v })}
              disabled={!isExtra}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subject">
            <Input
              value={f.subject ?? ""}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
              placeholder="Physics"
            />
          </Field>
          <Field label="Start time">
            <Input
              type="time"
              value={(f.start_time ?? "").slice(0, 5)}
              onChange={(e) => setF({ ...f, start_time: e.target.value })}
              required
            />
          </Field>
          <Field label="End time">
            <Input
              type="time"
              value={(f.end_time ?? "").slice(0, 5)}
              onChange={(e) => setF({ ...f, end_time: e.target.value })}
              required
            />
          </Field>
          <Field label="Teacher">
            <Select
              value={f.faculty_id ?? "none"}
              onValueChange={(v) => setF({ ...f, faculty_id: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {faculty.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Classroom">
            <Select
              value={f.room_id ?? "none"}
              onValueChange={(v) => setF({ ...f, room_id: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Message for students (optional)" cls="sm:col-span-2">
            <Textarea
              rows={2}
              value={f.note ?? ""}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              placeholder="Shifted one hour later today"
            />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save & notify"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
