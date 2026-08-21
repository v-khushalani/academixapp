import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";
import { inr } from "@/lib/payments";

export type ReviseTarget = {
  id: string;
  student_name: string;
  description?: string | null;
  amount: number;
  amount_paid: number;
  due_date?: string | null;
};

export function ReviseInstallmentDialog({
  target,
  onOpenChange,
}: {
  target: ReviseTarget | null;
  onOpenChange: (v: boolean) => void;
}) {
  const refresh = useRefreshLinked();
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [carry, setCarry] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setAmount(target ? String(Math.round(target.amount)) : "");
    setDue(target?.due_date ?? "");
    setCarry(true);
    setReason("");
  }, [target?.id, target?.amount, target?.due_date]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("revise_installment", {
        _fee_id: target!.id,
        _new_amount: Number(amount || 0),
        _new_due_date: due || undefined,
        _carry_forward: carry,
        _reason: reason || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Installment revised");
      refresh();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!target) return null;

  const next = Number(amount || 0);
  const diff = target.amount - next;
  const tooLow = next < target.amount_paid;

  return (
    <Dialog open onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revise installment</DialogTitle>
          <DialogDescription>
            {target.student_name} · {target.description ?? "Fees"} · already paid{" "}
            {inr(target.amount_paid)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rev-amt">New amount for this installment</Label>
            <Input
              id="rev-amt"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
            {tooLow ? (
              <p className="text-xs text-destructive">
                Cannot be less than {inr(target.amount_paid)} already collected.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rev-due">Due date</Label>
            <Input id="rev-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
            <Checkbox checked={carry} onCheckedChange={(v) => setCarry(Boolean(v))} />
            <span>
              Move the difference to the next installment
              {diff !== 0 ? (
                <span className="block text-xs text-muted-foreground">
                  {diff > 0 ? `${inr(diff)} will be added there` : `${inr(-diff)} will be reduced there`}
                </span>
              ) : null}
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="rev-reason">Reason</Label>
            <Textarea
              id="rev-reason"
              rows={2}
              placeholder="Parent asked for a smaller instalment this month"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Every revision is recorded in the fee adjustment history.
          </p>
        </div>
        <DialogFooter>
          <Button
            className="w-full gap-1.5"
            disabled={save.isPending || tooLow || !amount}
            onClick={() => save.mutate()}
          >
            <Check className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
