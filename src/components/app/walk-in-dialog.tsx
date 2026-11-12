import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { batchesApi, enrollmentsApi, feesApi, studentsApi } from "@/lib/api";
import { batchesForClass } from "@/lib/class-match";
import { GRADES } from "@/lib/constants";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";
import { openWhatsApp } from "@/lib/whatsapp";
import { getInstitute } from "@/lib/academy-settings";
import { formatDate } from "@/lib/dates";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const empty = { name: "", phone: "", cls: "", batch: "", amount: "", mode: "Cash" };

/** Front-desk walk-in: 4 fields → student + batch + first payment + receipt. */
export function WalkInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const refresh = useRefreshLinked();
  const [f, setF] = useState(empty);
  const [done, setDone] = useState<{ name: string; phone: string; amount: number; adm: string; batch: string } | null>(null);
  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list(), enabled: open });
  const options = useMemo(() => batchesForClass(batches, f.cls), [batches, f.cls]);

  const mut = useMutation({
    mutationFn: async () => {
      const phone = f.phone.replace(/\D/g, "").slice(-10);
      const adm = `ADM-${Date.now().toString().slice(-6)}`;
      const s = await studentsApi.create({
        full_name: f.name.trim(),
        admission_no: adm,
        class: f.cls || null,
        batch_id: f.batch || null,
        father_phone: phone,
        parent_phone: phone,
        preferred_contact: "father",
      });
      if (f.batch) await enrollmentsApi.set(s.id, [f.batch]);
      const amount = Number(f.amount) || 0;
      if (amount > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const fee = await feesApi.create({
          student_id: s.id,
          amount,
          description: "Admission / registration",
          due_date: today,
        } as never);
        await feesApi.collect(fee.id, amount, f.mode);
      }
      return { name: s.full_name, phone, amount, adm, batch: batches.find((b) => b.id === f.batch)?.name ?? "" };
    },
    onSuccess: (r) => {
      toast.success("Student admitted");
      refresh();
      setDone(r);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function close(v: boolean) {
    if (!v) {
      setF(empty);
      setDone(null);
    }
    onOpenChange(v);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return void toast.error("Student name is required");
    if (f.phone.replace(/\D/g, "").length < 10) return void toast.error("Enter a 10-digit parent phone");
    mut.mutate();
  }

  function sendReceipt() {
    if (!done) return;
    const inst = getInstitute();
    const msg = `Dear Parent,\n\nWelcome to *${inst.name}*! *${done.name}* is admitted${done.batch ? ` to ${done.batch}` : ""}.\nAdmission no: ${done.adm}${done.amount ? `\nReceived: ${inr(done.amount)} on ${formatDate(new Date())}` : ""}\n\nThank you.`;
    if (!openWhatsApp(done.phone, msg)) toast.error("Invalid phone number");
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{done ? "Admission done" : "Quick walk-in admission"}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-3">
            <p className="text-sm">
              <b>{done.name}</b> · {done.adm}
              {done.amount ? ` · ${inr(done.amount)} received` : ""}
            </p>
            <p className="text-xs text-muted-foreground">Add remaining details later from the Students page.</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDone(null)}>Next walk-in</Button>
              <Button className="gap-1.5" onClick={sendReceipt}>
                <MessageCircle className="h-4 w-4" /> Send receipt on WhatsApp
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Student name *</Label>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Parent phone *</Label>
              <Input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={f.cls} onValueChange={(v) => setF({ ...f, cls: v, batch: "" })}>
                  <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Batch</Label>
                <Select value={f.batch} onValueChange={(v) => setF({ ...f, batch: v })}>
                  <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                  <SelectContent>
                    {options.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Paid now (₹)</Label>
                <Input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select value={f.mode} onValueChange={(v) => setF({ ...f, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Cash", "UPI", "Card", "Bank transfer"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Admit student"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
