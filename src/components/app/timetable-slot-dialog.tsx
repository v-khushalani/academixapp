import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  batchesApi,
  facultyApi,
  roomsApi,
  timetableApi,
  type TimetableSlot,
  type TimetableSlotInsert,
} from "@/lib/api";
import { Field as F } from "@/components/app/field";
import { formatTime12, toHHMM } from "@/lib/time";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot?: TimetableSlot | null;
  defaultDay?: number;
  defaultStart?: string;
  defaultEnd?: string;
  defaultRoomId?: string;
  defaultFacultyId?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** 15-minute picks across the teaching day, labelled in 12-hour time. */
const TIME_OPTIONS = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => toHHMM(6 * 60 + i * 15));

export function TimetableSlotDialog({
  open,
  onOpenChange,
  slot,
  defaultDay = 1,
  defaultStart,
  defaultEnd,
  defaultRoomId,
  defaultFacultyId,
}: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(slot);
  const [f, setF] = useState<TimetableSlotInsert>({
    day_of_week: defaultDay,
    start_time: "09:00",
    end_time: "10:00",
  });

  useEffect(() => {
    if (slot)
      setF({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
        batch_id: slot.batch_id ?? undefined,
        faculty_id: slot.faculty_id ?? undefined,
        room_id: slot.room_id ?? undefined,
        subject: slot.subject ?? "",
      });
    else if (open)
      setF({
        day_of_week: defaultDay,
        start_time: defaultStart ?? "09:00",
        end_time: defaultEnd ?? "10:00",
        room_id: defaultRoomId ?? undefined,
        faculty_id: defaultFacultyId ?? undefined,
        subject: "",
      });
  }, [slot, open, defaultDay, defaultStart, defaultEnd, defaultRoomId, defaultFacultyId]);

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
    enabled: open,
  });
  const { data: faculty = [] } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.list(),
    enabled: open,
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.list(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (input: TimetableSlotInsert) => {
      const payload: TimetableSlotInsert = {
        ...input,
        room: input.room_id ? (rooms.find((r) => r.id === input.room_id)?.name ?? null) : null,
      };
      return isEdit && slot ? timetableApi.update(slot.id, payload) : timetableApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Slot updated" : "Slot added");
      qc.invalidateQueries({ queryKey: ["timetable"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit slot" : "New slot"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            mutation.mutate(f);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <F label="Day">
            <Select
              value={String(f.day_of_week)}
              onValueChange={(v) => setF({ ...f, day_of_week: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Classroom">
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
                    {r.name} · {r.capacity} seats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Start time">
            <Select
              value={f.start_time.slice(0, 5)}
              onValueChange={(v) => setF({ ...f, start_time: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatTime12(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="End time">
            <Select
              value={f.end_time.slice(0, 5)}
              onValueChange={(v) => setF({ ...f, end_time: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatTime12(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Batch">
            <Select
              value={f.batch_id ?? "none"}
              onValueChange={(v) => setF({ ...f, batch_id: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
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
          </F>
          <F label="Faculty">
            <Select
              value={f.faculty_id ?? "none"}
              onValueChange={(v) => setF({ ...f, faculty_id: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {faculty.map((fc) => (
                  <SelectItem key={fc.id} value={fc.id}>
                    {fc.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Subject" cls="sm:col-span-2">
            <Input
              value={f.subject ?? ""}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
              placeholder="Physics"
            />
          </F>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
