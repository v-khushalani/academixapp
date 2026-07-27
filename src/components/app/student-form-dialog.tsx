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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchesApi, studentsApi, type Student, type StudentInsert } from "@/lib/api";
import { Field } from "@/components/app/field";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student?: Student | null;
};

export function StudentFormDialog({ open, onOpenChange, student }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(student);
  const [form, setForm] = useState<StudentInsert>({
    admission_no: "",
    full_name: "",
    phone: "",
    email: "",
    parent_name: "",
    class: "",
    school: "",
    address: "",
    status: "active",
    parent_phone: "",
    scholarship_percent: 0,
    discount: 0,
    father_name: "",
    father_phone: "",
    mother_name: "",
    mother_phone: "",
    preferred_contact: "father",
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
        father_name: student.father_name ?? "",
        father_phone: student.father_phone ?? "",
        mother_name: student.mother_name ?? "",
        mother_phone: student.mother_phone ?? "",
        preferred_contact: student.preferred_contact === "mother" ? "mother" : "father",
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
        full_name: "",
        phone: "",
        email: "",
        parent_name: "",
        parent_phone: "",
        class: "",
        school: "",
        address: "",
        status: "active",
        scholarship_percent: 0,
        discount: 0,
        father_name: "",
        father_phone: "",
        mother_name: "",
        mother_phone: "",
        preferred_contact: "father",
      });
    }
  }, [student, open]);

  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (input: StudentInsert) => {
      const pc = input.preferred_contact === "mother" ? "mother" : "father";
      const payload: StudentInsert = {
        ...input,
        preferred_contact: pc,
        parent_name:
          pc === "mother"
            ? (input.mother_name ?? input.parent_name ?? "")
            : (input.father_name ?? input.parent_name ?? ""),
        parent_phone:
          pc === "mother"
            ? (input.mother_phone ?? input.parent_phone ?? "")
            : (input.father_phone ?? input.parent_phone ?? ""),
      };
      if (isEdit && student) return studentsApi.update(student.id, payload);
      return studentsApi.create(payload);
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
    if (!form.father_name?.trim() || !form.father_phone?.trim()) {
      toast.error("Father's name & phone are required");
      return;
    }
    if (!form.mother_name?.trim() || !form.mother_phone?.trim()) {
      toast.error("Mother's name & phone are required");
      return;
    }
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit student" : "Add student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Admission #">
            <Input
              value={form.admission_no}
              onChange={(e) => setForm({ ...form, admission_no: e.target.value })}
              required
            />
          </Field>
          <Field label="Full name">
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Class">
            <Input
              value={form.class ?? ""}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
            />
          </Field>
          <Field label="School">
            <Input
              value={form.school ?? ""}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
            />
          </Field>
          <Field label="Father's name *">
            <Input
              value={form.father_name ?? ""}
              onChange={(e) => setForm({ ...form, father_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Father's phone *">
            <Input
              value={form.father_phone ?? ""}
              onChange={(e) => setForm({ ...form, father_phone: e.target.value })}
              placeholder="10-digit"
              required
            />
          </Field>
          <Field label="Mother's name *">
            <Input
              value={form.mother_name ?? ""}
              onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Mother's phone *">
            <Input
              value={form.mother_phone ?? ""}
              onChange={(e) => setForm({ ...form, mother_phone: e.target.value })}
              placeholder="10-digit"
              required
            />
          </Field>
          <Field label="Default WhatsApp contact" className="sm:col-span-2">
            <Select
              value={form.preferred_contact ?? "father"}
              onValueChange={(v) => setForm({ ...form, preferred_contact: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="father">Father</SelectItem>
                <SelectItem value="mother">Mother</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Batch">
            <Select
              value={form.batch_id ?? "none"}
              onValueChange={(v) => setForm({ ...form, batch_id: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {batches?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Scholarship (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.scholarship_percent ?? 0}
              onChange={(e) => setForm({ ...form, scholarship_percent: Number(e.target.value) })}
            />
          </Field>
          <Field label="Discount (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.discount ?? 0}
              onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Status" className="sm:col-span-2">
            <Select
              value={form.status ?? "active"}
              onValueChange={(v) => setForm({ ...form, status: v as StudentInsert["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
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

