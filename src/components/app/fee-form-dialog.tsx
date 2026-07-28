import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { feesApi, studentsApi } from "@/lib/api";
import { Field as F } from "@/components/app/field";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/**
 * Collect money. The amount itself is owned by the batch fee, so it is read-only
 * here — staff only enter what was actually received.
 */
export function FeeFormDialog({ open, onOpenChange }: Props) {
  const refresh = useRefreshLinked();
  const [studentId, setStudentId] = useState("");
  const [feeId, setFeeId] = useState("");
  const [received, setReceived] = useState(0);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [other, setOther] = useState(false);
  const [otherAmount, setOtherAmount] = useState(0);

  useEffect(() => {
    if (open) {
      setStudentId("");
      setFeeId("");
      setReceived(0);
      setMethod("cash");
      setNote("");
      setOther(false);
      setOtherAmount(0);
    }
  }, [open]);

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
    enabled: open,
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["fees", "student", studentId],
    queryFn: () => feesApi.forStudent(studentId),
    enabled: open && Boolean(studentId),
  });

  useEffect(() => {
    const first = fees.find((f) => Number(f.amount_paid) < Number(f.amount)) ?? fees[0];
    setFeeId(first?.id ?? "");
  }, [fees]);

  const selected = useMemo(() => fees.find((f) => f.id === feeId) ?? null, [fees, feeId]);
  const due = selected ? Number(selected.amount) - Number(selected.amount_paid ?? 0) : 0;

  useEffect(() => {
    if (selected) setReceived(Math.max(0, due));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (other) {
        await feesApi.create({
          student_id: studentId,
          amount: otherAmount,
          amount_paid: received,
          method,
          description: note || "Other charge",
          status: received <= 0 ? "pending" : received >= otherAmount ? "paid" : "partial",
          paid_date: received > 0 ? new Date().toISOString().slice(0, 10) : null,
        });
        return;
      }
      await feesApi.collect(feeId, received, method, note);
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      refresh();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!studentId) {
      toast.error("Select a student");
      return;
    }
    if (other && otherAmount <= 0) {
      toast.error("Enter the charge amount");
      return;
    }
    if (!other && !feeId) {
      toast.error("This student has no fee to collect — assign a batch first");
      return;
    }
    if (received <= 0) {
      toast.error("Enter the amount received");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <F label="Student" cls="sm:col-span-2">
            <Select value={studentId} onValueChange={setStudentId}>
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

          {!other && studentId && (
            <>
              <F label="Fee" cls="sm:col-span-2">
                <Select value={feeId} onValueChange={setFeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={fees.length ? "Select fee" : "No fee yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fees.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.description ?? "Fee"} · {inr(Number(f.amount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              {selected && (
                <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-3 text-center">
                  <Info label="Batch fee" value={inr(Number(selected.amount))} />
                  <Info label="Already paid" value={inr(Number(selected.amount_paid ?? 0))} />
                  <Info label="Outstanding" value={inr(due)} />
                </div>
              )}
            </>
          )}

          {other && (
            <F label="Charge amount (₹)">
              <Input
                type="number"
                min={0}
                step="1"
                value={otherAmount}
                onChange={(e) => setOtherAmount(Number(e.target.value))}
              />
            </F>
          )}

          <F label="Amount received (₹)">
            <Input
              type="number"
              min={0}
              step="1"
              value={received}
              onChange={(e) => setReceived(Number(e.target.value))}
              required
            />
          </F>
          <F label="Method">
            <Select value={method} onValueChange={setMethod}>
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
          <F label="Note (optional)" cls="sm:col-span-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2nd instalment"
            />
          </F>
          <label className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} />
            One-off charge (books, exam fee) instead of batch fee
          </label>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
