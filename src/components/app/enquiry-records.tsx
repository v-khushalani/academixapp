import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, RotateCcw, Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { studentsApi, type Student } from "@/lib/api";
import { openWhatsApp } from "@/lib/whatsapp";
import { getInstitute } from "@/lib/academy-settings";
import { ApplicantPreview } from "@/components/app/applicant-preview";

/**
 * Enquiry records — every application that was NOT approved stays here forever
 * so reception can follow up later instead of losing the paper form.
 */
export function EnquiryRecords({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Student | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["students", "rejected"],
    queryFn: () => studentsApi.list({ approval: "rejected" }),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((s) =>
      [s.full_name, s.phone, s.father_phone, s.mother_phone, s.class, s.school]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [data, q]);

  const reopen = useMutation({
    mutationFn: (id: string) => studentsApi.setApproval(id, "pending"),
    onSuccess: () => {
      toast.success("Moved back to pending applications");
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {data.length} enquiry record{data.length === 1 ? "" : "s"} kept for future follow-up
        </p>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, phone, class…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">No enquiry records yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Applications you reject land here so you can call them back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((s) => (
            <EnquiryCard
              key={s.id}
              student={s}
              canWrite={canWrite}
              onView={() => setPreview(s)}
              onReopen={() => reopen.mutate(s.id)}
            />
          ))}
        </div>
      )}

      <ApplicantPreview student={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function EnquiryCard({
  student,
  canWrite,
  onView,
  onReopen,
}: {
  student: Student;
  canWrite: boolean;
  onView: () => void;
  onReopen: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(student.notes ?? "");
  const dirty = notes !== (student.notes ?? "");

  const saveNotes = useMutation({
    mutationFn: () => studentsApi.setNotes(student.id, notes),
    onSuccess: () => {
      toast.success("Follow-up note saved");
      qc.invalidateQueries({ queryKey: ["students", "rejected"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contactPhone =
    student.preferred_contact === "mother"
      ? (student.mother_phone ?? student.phone)
      : (student.father_phone ?? student.phone);

  function followUp() {
    const institute = getInstitute().name || "our institute";
    const msg = `Namaste${student.father_name || student.mother_name ? " " + (student.preferred_contact === "mother" ? student.mother_name : student.father_name) : ""},\n\nThis is ${institute}. We had received an admission enquiry for ${student.full_name}${student.class ? ` (Class ${student.class})` : ""}. Admissions for the new batch are open — would you like to visit us or schedule a demo class?\n\nThank you.`;
    if (!openWhatsApp(contactPhone, msg)) toast.error("No valid phone number on this enquiry");
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onView} className="text-left">
            <p className="truncate font-medium hover:underline">{student.full_name}</p>
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {student.phone || contactPhone || "—"}
            {student.class ? ` · Class ${student.class}` : ""}
            {student.school ? ` · ${student.school}` : ""}
          </p>
        </div>
        <Badge variant="secondary">Not enrolled</Badge>
      </div>

      <Textarea
        className="mt-3 min-h-[64px] text-sm"
        placeholder="Follow-up note — e.g. called on 12 Jun, asked to call back after results"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={!canWrite}
      />

      <div className="mt-3 flex flex-wrap justify-end gap-1.5">
        {canWrite && dirty && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={saveNotes.isPending}
            onClick={() => saveNotes.mutate()}
          >
            <Save className="h-3.5 w-3.5" />
            Save note
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1" onClick={followUp}>
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp follow-up
        </Button>
        {canWrite && (
          <Button size="sm" className="gap-1" onClick={onReopen}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reconsider
          </Button>
        )}
      </div>
    </div>
  );
}
