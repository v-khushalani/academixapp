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
import { feesApi, studentsApi, type FeeInsert } from "@/lib/api";
import { Field as F } from "@/components/app/field";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function FeeFormDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [f, setF] = useState<FeeInsert>({
    student_id: "",
    amount: 0,
    amount_paid: 0,
    status: "pending",
  });

  useEffect(() => {
    if (open) setF({ student_id: "", amount: 0, amount_paid: 0, status: "pending" });
  }, [open]);

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (input: FeeInsert) => feesApi.create(input),
    onSuccess: () => {
      toast.success("Fee recorded");
      qc.invalidateQueries({ queryKey: ["fees"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!f.student_id) {
      toast.error("Select a student");
      return;
    }
    const paid = Number(f.amount_paid ?? 0);
    const amount = Number(f.amount);
    const status: FeeInsert["status"] = paid <= 0 ? "pending" : paid >= amount ? "paid" : "partial";
    mutation.mutate({
      ...f,
      amount,
      amount_paid: paid,
      status,
      paid_date: paid > 0 ? new Date().toISOString().slice(0, 10) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record fee</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <F label="Student" cls="sm:col-span-2">
            <Select value={f.student_id} onValueChange={(v) => setF({ ...f, student_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} · {s.admission_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Amount (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: Number(e.target.value) })}
              required
            />
          </F>
          <F label="Paid now (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={f.amount_paid ?? 0}
              onChange={(e) => setF({ ...f, amount_paid: Number(e.target.value) })}
            />
          </F>
          <F label="Due date">
            <Input
              type="date"
              value={f.due_date ?? ""}
              onChange={(e) => setF({ ...f, due_date: e.target.value || null })}
            />
          </F>
          <F label="Method">
            <Select value={f.method ?? ""} onValueChange={(v) => setF({ ...f, method: v })}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Description" cls="sm:col-span-2">
            <Input
              value={f.description ?? ""}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              placeholder="e.g. Term 1 fees"
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

