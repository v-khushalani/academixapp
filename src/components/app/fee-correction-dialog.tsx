import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { feesApi } from "@/lib/api";
import { inr } from "@/lib/payments";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";

export type CorrectionTarget = {
  id: string;
  student_name: string;
  description?: string | null;
  amount: number;
  amount_paid: number;
  status: string;
};

/**
 * Money already received cannot simply be deleted. Staff either cancel the bill
 * (pending goes to zero, cash stays) or reverse a payment (cash goes back out).
 */
export function FeeCorrectionDialog({
  target,
  onOpenChange,
}: {
  target: CorrectionTarget | null;
  onOpenChange: (v: boolean) => void;
}) {
  const refresh = useRefreshLinked();
  const [mode, setMode] = useState<"cancel" | "refund">("cancel");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (target) {
      setMode("cancel");
      setAmount(String(target.amount_paid));
      setReason("");
    }
  }, [target]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!target) return;
      if (mode === "cancel") await feesApi.cancel(target.id, reason);
      else await feesApi.reversePayment(target.id, Number(amount), reason);
    },
    onSuccess: () => {
      toast.success(mode === "cancel" ? "Bill cancelled" : "Payment reversed");
      refresh();
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const pending = target ? Math.max(0, target.amount - target.amount_paid) : 0;

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct this fee entry</DialogTitle>
          <DialogDescription>
            {target?.student_name} · billed {inr(target?.amount ?? 0)} · received{" "}
            {inr(target?.amount_paid ?? 0)} · pending {inr(pending)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setMode("cancel")}
              className={`rounded-md border p-3 text-left text-sm transition-colors ${
                mode === "cancel" ? "border-primary bg-accent" : "border-border"
              }`}
            >
              <p className="font-medium">Cancel the bill</p>
              <p className="text-xs text-muted-foreground">
                Bill should never have been raised. Pending drops to zero, money already received
                stays in Collected.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("refund")}
              className={`rounded-md border p-3 text-left text-sm transition-colors ${
                mode === "refund" ? "border-primary bg-accent" : "border-border"
              }`}
            >
              <p className="font-medium">Reverse a payment</p>
              <p className="text-xs text-muted-foreground">
                Money was recorded by mistake or refunded to the parent. It leaves Collected and the
                bill goes back to pending.
              </p>
            </button>
          </div>

          {mode === "refund" && (
            <div className="space-y-1.5">
              <Label htmlFor="rev-amount">Amount to reverse</Label>
              <Input
                id="rev-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rev-reason">Reason (kept on record)</Label>
            <Input
              id="rev-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. duplicate entry, cash returned to parent"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || reason.trim().length < 3}>
            {mode === "cancel" ? "Cancel bill" : "Reverse payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
