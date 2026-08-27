import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
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
import { batchesApi, studentsApi, type Student, type StudentInsert } from "@/lib/api";
import { Field } from "@/components/app/field";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsApp } from "@/lib/whatsapp";
import { getInstitute } from "@/lib/academy-settings";
import { CLASSES } from "@/lib/constants";

/** Normalise a grade string ("Class 10", "10th", "10") to its bare grade ("10"). */
function normClass(v?: string | null): string {
  const s = (v ?? "").trim().toLowerCase();
  const num = s.match(/\d+/);
  if (num) return num[0];
  const word = s.match(/nursery|lkg|ukg/);
  return word ? word[0] : s;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student?: Student | null;
};

export function StudentFormDialog({ open, onOpenChange, student }: Props) {
  const refresh = useRefreshLinked();
  const isEdit = Boolean(student);
  const { roles } = useAuth();
  const canEditDetails = can("student:edit", roles);
  const [showDetails, setShowDetails] = useState(false);
  /** create mode has two ways in: send a self-fill link, or type it all yourself */
  const [tab, setTab] = useState<"link" | "form">("link");

  useEffect(() => {
    if (open) {
      setShowDetails(!isEdit);
      setTab(isEdit ? "form" : "link");
    }
  }, [open, isEdit]);
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

  /** Batches are tied to a class — only that class's batches (plus open ones) show. */
  const batchOptions = useMemo(() => {
    if (!batches) return [];
    return batchesForClass(batches, form.class);
  }, [batches, form.class]);



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
      refresh();
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
          <DialogTitle>{isEdit ? "Edit student" : "New student"}</DialogTitle>
        </DialogHeader>
        {!isEdit && (
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
            {(
              [
                ["link", "Send self-fill link"],
                ["form", "Fill the form myself"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {!isEdit && tab === "link" ? (
          <SelfFillLink onDone={() => onOpenChange(false)} />
        ) : (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          {isEdit && (
            <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {canEditDetails
                  ? "Enrolment details are locked after the student submits the form. Only admins can change them."
                  : "Enrolment details can only be changed by an admin."}
              </p>
              {canEditDetails && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails((v) => !v)}
                >
                  {showDetails ? "Hide details" : "Edit details"}
                </Button>
              )}
            </div>
          )}
          {showDetails && (
            <>
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
            <Select
              value={form.class || "none"}
              onValueChange={(v) => setForm({ ...form, class: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            </>
          )}
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
                {batchOptions.map((b) => (
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
          {showDetails && (
            <Field label="Address" className="sm:col-span-2">
              <Input
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Name + phone is all the front desk needs: the student fills the rest through
 * the link, so nobody re-types an enrolment form.
 */
function SelfFillLink({ onDone }: { onDone: () => void }) {
  const refresh = useRefreshLinked();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const { data, error } = await supabase
        .from("students")
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          admission_no: `ADM-${Date.now().toString().slice(-6)}`,
          onboarding_token: token,
          status: "active",
        })
        .select("id, onboarding_token")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      setLink(`${window.location.origin}/onboard/${row.onboarding_token}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (link) {
    const msg = `Hello ${fullName},\n\nWelcome to ${getInstitute().name || "our institute"}. Please fill your admission details here:\n${link}\n\nThank you.`;
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <p className="break-all font-mono text-xs">{link}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}
          >
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button
            type="button"
            className="flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
            onClick={() => {
              if (!openWhatsApp(phone, msg)) toast.error("Add a phone number to send on WhatsApp");
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Send on WhatsApp
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!fullName.trim()) return toast.error("Name is required");
        mut.mutate();
      }}
    >
      <Field label="Student name">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
      </Field>
      <Field label="WhatsApp number">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit" />
      </Field>
      <p className="text-xs text-muted-foreground">
        The student fills class, parents, address and photo themselves through the link.
      </p>
      <DialogFooter>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "Creating…" : "Create & get link"}
        </Button>
      </DialogFooter>
    </form>
  );
}
