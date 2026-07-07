import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { batchesApi, facultyApi, timetableApi, type TimetableSlot, type TimetableSlotInsert } from "@/lib/api";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; slot?: TimetableSlot | null; defaultDay?: number };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimetableSlotDialog({ open, onOpenChange, slot, defaultDay = 1 }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(slot);
  const [f, setF] = useState<TimetableSlotInsert>({ day_of_week: defaultDay, start_time: "09:00", end_time: "10:00" });

  useEffect(() => {
    if (slot) setF({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time, end_time: slot.end_time,
      batch_id: slot.batch_id ?? undefined,
      faculty_id: slot.faculty_id ?? undefined,
      subject: slot.subject ?? "",
      room: slot.room ?? "",
    });
    else if (open) setF({ day_of_week: defaultDay, start_time: "09:00", end_time: "10:00", subject: "", room: "" });
  }, [slot, open, defaultDay]);

  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list(), enabled: open });
  const { data: faculty = [] } = useQuery({ queryKey: ["faculty"], queryFn: () => facultyApi.list(), enabled: open });

  const mutation = useMutation({
    mutationFn: (input: TimetableSlotInsert) => isEdit && slot ? timetableApi.update(slot.id, input) : timetableApi.create(input),
    onSuccess: () => { toast.success(isEdit ? "Slot updated" : "Slot added"); qc.invalidateQueries({ queryKey: ["timetable"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit slot" : "New slot"}</DialogTitle></DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); mutation.mutate(f); }} className="grid gap-3 sm:grid-cols-2">
          <F label="Day">
            <Select value={String(f.day_of_week)} onValueChange={(v) => setF({ ...f, day_of_week: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Room"><Input value={f.room ?? ""} onChange={(e) => setF({ ...f, room: e.target.value })} placeholder="Room 101" /></F>
          <F label="Start time"><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></F>
          <F label="End time"><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></F>
          <F label="Batch">
            <Select value={f.batch_id ?? "none"} onValueChange={(v) => setF({ ...f, batch_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Faculty">
            <Select value={f.faculty_id ?? "none"} onValueChange={(v) => setF({ ...f, faculty_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {faculty.map((fc) => <SelectItem key={fc.id} value={fc.id}>{fc.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Subject" cls="sm:col-span-2"><Input value={f.subject ?? ""} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Physics" /></F>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return <div className={`space-y-1.5 ${cls ?? ""}`}><Label>{label}</Label>{children}</div>;
}