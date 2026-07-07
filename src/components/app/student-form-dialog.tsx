import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { batchesApi, studentsApi, type Student, type StudentInsert } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student?: Student | null;
};

export function StudentFormDialog({ open, onOpenChange, student }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(student);
  const [form, setForm] = useState<StudentInsert>({
    admission_no: "", full_name: "", phone: "", email: "", parent_name: "",
    class: "", school: "", address: "", status: "active",
    parent_phone: "", scholarship_percent: 0, discount: 0,
  });

  useEffect(() => {
    if (student) {
      setForm({
        admission_no: student.admission_no,
        full_name: student.full_name,
        phone: student.phone ?? "",
        email: student.email ?? "",
        parent_name: student.parent_name ?? "",
        parent_phone: student.parent_phone ?? "",
        class: student.class ?? "",
        school: student.school ?? "",
        address: student.address ?? "",
        status: student.status,
        batch_id: student.batch_id ?? undefined,
        scholarship_percent: student.scholarship_percent ?? 0,
        discount: student.discount ?? 0,
      });
    } else if (open) {
      setForm({
        admission_no: `ADM-${Date.now().toString().slice(-6)}`,
        full_name: "", phone: "", email: "", parent_name: "",
        parent_phone: "", class: "", school: "", address: "", status: "active",
        scholarship_percent: 0, discount: 0,
      });
    }
  }, [student, open]);

  const { data: batches } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list(), enabled: open });

  const mutation = useMutation({
    mutationFn: async (input: StudentInsert) => {
      if (isEdit && student) return studentsApi.update(student.id, input);
      return studentsApi.create(input);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Student updated" : "Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit student" : "Add student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Admission #"><Input value={form.admission_no} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} required /></Field>
          <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
          <Field label="Class"><Input value={form.class ?? ""} onChange={(e) => setForm({ ...form, class: e.target.value })} /></Field>
          <Field label="School"><Input value={form.school ?? ""} onChange={(e) => setForm({ ...form, school: e.target.value })} /></Field>
          <Field label="Parent name"><Input value={form.parent_name ?? ""} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></Field>
          <Field label="Parent phone (WhatsApp)"><Input value={form.parent_phone ?? ""} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="10-digit" /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Batch">
            <Select value={form.batch_id ?? "none"} onValueChange={(v) => setForm({ ...form, batch_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {batches?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Scholarship (%)"><Input type="number" min={0} max={100} step="0.01" value={form.scholarship_percent ?? 0} onChange={(e) => setForm({ ...form, scholarship_percent: Number(e.target.value) })} /></Field>
          <Field label="Discount (₹)"><Input type="number" min={0} step="0.01" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} /></Field>
          <Field label="Status" className="sm:col-span-2">
            <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v as StudentInsert["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address" className="sm:col-span-2"><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}