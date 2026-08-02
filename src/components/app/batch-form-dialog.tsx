import { cloneElement, isValidElement, useEffect, useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { batchesApi, type Batch, type BatchInsert } from "@/lib/api";
import { CLASSES } from "@/lib/constants";
import { Field as F } from "@/components/app/field";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; batch?: Batch | null };

export function BatchFormDialog({ open, onOpenChange, batch }: Props) {
  const refresh = useRefreshLinked();
  const isEdit = Boolean(batch);
  const [f, setF] = useState<BatchInsert>({
    name: "",
    capacity: 30,
    status: "active",
    default_fee: 0,
    class_level: null,
  });

  useEffect(() => {
    if (batch)
      setF({
        name: batch.name,
        capacity: batch.capacity,
        status: batch.status,
        class_level: batch.class_level ?? null,
        schedule: batch.schedule ?? "",
        room: batch.room ?? "",
        start_date: batch.start_date ?? undefined,
        end_date: batch.end_date ?? undefined,
        notes: batch.notes ?? "",
        default_fee: batch.default_fee ?? 0,
      });
    else if (open)
      setF({ name: "", capacity: 30, status: "active", default_fee: 0, class_level: null });
  }, [batch, open]);

  const mutation = useMutation({
    mutationFn: async (input: BatchInsert) =>
      isEdit && batch ? batchesApi.update(batch.id, input) : batchesApi.create(input),
    onSuccess: () => {
      toast.success(isEdit ? "Batch updated" : "Batch created");
      refresh();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit batch" : "New batch"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            mutation.mutate(f);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <F label="Name" cls="sm:col-span-2">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </F>
          <F label="Class">
            <Select
              value={f.class_level ?? "any"}
              onValueChange={(v) => setF({ ...f, class_level: v === "any" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any class</SelectItem>
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Only students of this class will see this batch as an option.
            </p>
          </F>
          <F label="Schedule">
            <Input
              placeholder="Mon/Wed/Fri 6-8 PM"
              value={f.schedule ?? ""}
              onChange={(e) => setF({ ...f, schedule: e.target.value })}
            />
          </F>
          <F label="Room">
            <Input value={f.room ?? ""} onChange={(e) => setF({ ...f, room: e.target.value })} />
          </F>
          <F label="Capacity">
            <Input
              type="number"
              min={1}
              value={f.capacity}
              onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}
            />
          </F>
          <F label="Batch fee (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={f.default_fee ?? 0}
              onChange={(e) => setF({ ...f, default_fee: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-applied to every student in this batch. Scholarship/discount per student adjusts
              it.
            </p>
          </F>
          <F label="Status">
            <Select
              value={f.status ?? "active"}
              onValueChange={(v) => setF({ ...f, status: v as BatchInsert["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Start date">
            <Input
              type="date"
              value={f.start_date ?? ""}
              onChange={(e) => setF({ ...f, start_date: e.target.value || undefined })}
            />
          </F>
          <F label="End date">
            <Input
              type="date"
              value={f.end_date ?? ""}
              onChange={(e) => setF({ ...f, end_date: e.target.value || undefined })}
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
