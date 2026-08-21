import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { facultyApi, type Faculty, type FacultyInsert } from "@/lib/api";
import { Field as F } from "@/components/app/field";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; faculty?: Faculty | null };

export function FacultyFormDialog({ open, onOpenChange, faculty }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(faculty);
  const [f, setF] = useState<FacultyInsert>({ full_name: "", status: "active" });

  useEffect(() => {
    if (faculty)
      setF({
        full_name: faculty.full_name,
        email: faculty.email ?? "",
        phone: faculty.phone ?? "",
        qualification: faculty.qualification ?? "",
        subject: faculty.subject ?? "",
        joining_date: faculty.joining_date ?? undefined,
        base_salary: faculty.base_salary ?? null,
        status: faculty.status,
        notes: faculty.notes ?? "",
      });
    else if (open)
      setF({
        full_name: "",
        email: "",
        phone: "",
        qualification: "",
        subject: "",
        status: "active",
      });
  }, [faculty, open]);

  const mutation = useMutation({
    mutationFn: (input: FacultyInsert) =>
      isEdit && faculty ? facultyApi.update(faculty.id, input) : facultyApi.create(input),
    onSuccess: () => {
      toast.success(isEdit ? "Faculty updated" : "Faculty added");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit faculty" : "Add faculty"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            mutation.mutate(f);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <F label="Full name" cls="sm:col-span-2">
            <Input
              value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })}
              required
            />
          </F>
          <F label="Subject">
            <Input
              value={f.subject ?? ""}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
              placeholder="Physics, Maths…"
            />
          </F>
          <F label="Qualification">
            <Input
              value={f.qualification ?? ""}
              onChange={(e) => setF({ ...f, qualification: e.target.value })}
              placeholder="M.Sc, B.Ed"
            />
          </F>
          <F label="Phone">
            <Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </F>
          <F label="Email">
            <Input
              type="email"
              value={f.email ?? ""}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </F>
          <F label="Monthly salary (₹)">
            <Input
              inputMode="numeric"
              value={f.base_salary == null ? "" : String(f.base_salary)}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                setF({ ...f, base_salary: v ? Number(v) : null });
              }}
              placeholder="e.g. 25000"
            />
          </F>
          <F label="Joining date">
            <Input
              type="date"
              value={f.joining_date ?? ""}
              onChange={(e) => setF({ ...f, joining_date: e.target.value || undefined })}
            />
          </F>
          <F label="Status">
            <Select value={f.status ?? "active"} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Notes" cls="sm:col-span-2">
            <Input value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
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
