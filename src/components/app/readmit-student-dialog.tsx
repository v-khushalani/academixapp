import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
type Mode = "restore" | "keep" | "custom";
const in30 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

export function ReadmitStudentDialog({
  student,
  onOpenChange,
}: {
  student: { id: string; full_name: string } | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("restore");
  const [due, setDue] = useState(in30());
  const [custom, setCustom] = useState("");

  useEffect(() => {
    setMode("restore");
    setDue(in30());
    setCustom("");
  }, [student?.id]);

  const { data: waived = 0, isLoading } = useQuery({
    queryKey: ["readmit-waived", student?.id],
    enabled: !!student,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_waived_on_exit" as never, { _student_id: student!.id } as never);
      if (error) throw new Error(error.message);
      return Number(data ?? 0);
    },
  });

  const customNum = Number(custom || 0);
  const invalid = mode === "custom" && (!(customNum > 0) || customNum > waived);

  const save = useMutation({
    mutationFn: async () => {
      const args: Record<string, unknown> = { _student_id: student!.id, _restore_fees: false };
      if (waived > 0 && mode !== "keep") {
        args["_new_due_date"] = due;
        if (mode === "restore") args["_restore_fees"] = true;
        else args["_custom_amount"] = customNum;
      }
      const { data, error } = await supabase.rpc("readmit_student" as never, args as never);
      if (error) throw new Error(error.message);
      return Number((data as { restored?: number } | null)?.restored ?? 0);
    },
    onSuccess: (restored) => {
      toast.success(restored > 0 ? `Re-admitted · ${inr(restored)} dues reopened` : "Student re-admitted");
      qc.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const opt = (m: Mode, title: string, sub: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`w-full rounded-md border p-3 text-left transition-colors ${mode === m ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );

  return (
    <Dialog open={!!student} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Re-admit {student?.full_name}</DialogTitle>
          <DialogDescription>
            {isLoading ? "Checking fees…" : waived > 0 ? `Waived at exit: ${inr(waived)}` : "No waived fees."}
          </DialogDescription>
        </DialogHeader>
        {waived > 0 && (
          <div className="space-y-2">
            {opt("restore", "Restore waived balance", `Reopen ${inr(waived)} as pending`)}
            {opt("keep", "Keep waived", "Re-admit with zero dues")}
            {opt("custom", "Custom balance", "Reopen a revised amount")}
            {mode === "custom" && (
              <div className="space-y-1">
                <Label>Amount to reopen</Label>
                <Input type="number" inputMode="numeric" min={1} max={waived} value={custom} onChange={(e) => setCustom(e.target.value)} />
              </div>
            )}
            {mode !== "keep" && (
              <div className="space-y-1">
                <Label>New due date</Label>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isLoading || invalid || save.isPending} onClick={() => save.mutate()}>Re-admit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
