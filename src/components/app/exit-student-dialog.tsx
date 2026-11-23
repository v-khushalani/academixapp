import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function ExitStudentDialog({
  student,
  onOpenChange,
}: {
  student: { id: string; full_name: string } | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"waive" | "collect">("waive");
  const [collect, setCollect] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setMode("waive");
    setCollect("");
    setReason("");
  }, [student?.id]);

  const { data } = useQuery({
    queryKey: ["exit-ledger", student?.id],
    enabled: !!student,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("amount, amount_paid, status")
        .eq("student_id", student!.id);
      if (error) throw error;
      let billed = 0,
        paid = 0,
        due = 0;
      for (const f of data ?? []) {
        if (f.status === "cancelled") continue;
        const a = Number(f.amount ?? 0),
          p = Number(f.amount_paid ?? 0);
        paid += p;
        if (f.status === "waived") continue;
        billed += a;
        if (f.status !== "paid") due += Math.max(0, a - p);
      }
      return { billed, paid, due };
    },
  });
  const due = data?.due ?? 0;
  const amt = mode === "collect" ? Math.max(0, Number(collect) || 0) : 0;
  const bad = amt > due;

  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("exit_student" as never, {
        _student_id: student!.id,
        _collect: amt,
        _method: method,
        _reason: reason.trim() || null,
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as { collected: number; waived: number; receipt_no: string | null };
    },
    onSuccess: (r) => {
      toast.success(
        `${student!.full_name} moved to Dropped` +
          (r.collected ? ` · ${inr(r.collected)} received (${r.receipt_no})` : "") +
          (r.waived ? ` · ${inr(r.waived)} waived` : ""),
      );
      qc.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!student} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Drop {student?.full_name}</DialogTitle>
          <DialogDescription>
            Removes the student from lists, attendance, tests and machines. Past payments stay.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Total fee", data?.billed ?? 0],
            ["Paid", data?.paid ?? 0],
            ["Balance", due],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="font-semibold">{inr(v as number)}</div>
            </div>
          ))}
        </div>
        {due > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "waive" ? "default" : "outline"}
                onClick={() => setMode("waive")}
              >
                Waive full balance
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "collect" ? "default" : "outline"}
                onClick={() => setMode("collect")}
              >
                Collect payment now
              </Button>
            </div>
            {mode === "collect" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Amount received</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={collect}
                    onChange={(e) => setCollect(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mode</Label>
                  <Input value={method} onChange={(e) => setMethod(e.target.value)} />
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {bad
                ? "Amount is more than the balance."
                : `${amt ? `${inr(amt)} receipt, ` : ""}${inr(due - amt)} will be waived.`}
            </p>
          </div>
        )}
        <div>
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Shifted city" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={bad || m.isPending || !data}
            onClick={() => m.mutate()}
          >
            Drop student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
