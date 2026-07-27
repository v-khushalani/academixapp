import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchesApi, type Batch, type BatchInsert } from "@/lib/api";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; batch?: Batch | null };

export function BatchFormDialog({ open, onOpenChange, batch }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(batch);
  const [f, setF] = useState<BatchInsert>({
    name: "",
    capacity: 30,
    status: "active",
    default_fee: 0,
  });

  useEffect(() => {
    if (batch)
      setF({
        name: batch.name,
        capacity: batch.capacity,
        status: batch.status,
        schedule: batch.schedule ?? "",
        room: batch.room ?? "",
        start_date: batch.start_date ?? undefined,
        end_date: batch.end_date ?? undefined,
        notes: batch.notes ?? "",
        default_fee: batch.default_fee ?? 0,
      });
    else if (open) setF({ name: "", capacity: 30, status: "active", default_fee: 0 });
  }, [batch, open]);

  const mutation = useMutation({
    mutationFn: async (input: BatchInsert) =>
      isEdit && batch ? batchesApi.update(batch.id, input) : batchesApi.create(input),
    onSuccess: () => {
      toast.success(isEdit ? "Batch updated" : "Batch created");
      qc.invalidateQueries({ queryKey: ["batches"] });
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

function F({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  const id = useId();
  return (
    <div className={`space-y-1.5 ${cls ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
