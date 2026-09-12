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
  const [mode, setMode] = useState<"next" | "new" | "none">("next");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setAmount(target ? String(Math.round(target.amount)) : "");
    setDue(target?.due_date ?? "");
    setMode("next");
    setReason("");
  }, [target?.id, target?.amount, target?.due_date]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("revise_installment", {
        _fee_id: target!.id,
        _new_amount: Number(amount || 0),
        _new_due_date: due || undefined,
        _carry_forward: mode === "next",
        _reason: reason || undefined,
        _mode: mode,
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
          <div className="space-y-1.5">
            <Label>
              What happens to the difference
              {diff !== 0 ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({diff > 0 ? inr(diff) : inr(-diff)})
                </span>
              ) : null}
            </Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              {[
                { v: "next", label: "Move it to the next installment" },
                { v: "new", label: "Create a new installment for it" },
                { v: "none", label: "Reduce the total — nothing carried forward" },
              ].map((o) => (
                <label
                  key={o.v}
                  className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                >
                  <RadioGroupItem value={o.v} />
                  <span>{o.label}</span>
                </label>
              ))}
            </RadioGroup>
            {mode === "new" && diff <= 0 ? (
              <p className="text-xs text-muted-foreground">
                A new installment is only created when this one is reduced.
              </p>
            ) : null}
          </div>
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
