import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { studentsApi, type Student } from "@/lib/api";

export function Field({
  k,
  v,
  full,
}: {
  k: string;
  v: string | null | undefined;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="text-sm">{v || "—"}</p>
    </div>
  );
}

/** Read-only view of a submitted admission form (application or archived enquiry). */
export function ApplicantPreview({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoPath = student?.photo_path ?? null;

  useEffect(() => {
    let active = true;
    setPhotoUrl(null);
    if (photoPath) {
      studentsApi.signedPhotoUrl(photoPath).then((u) => {
        if (active) setPhotoUrl(u);
      });
    }
    return () => {
      active = false;
    };
  }, [photoPath]);

  if (!student) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application · {student.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={student.full_name}
                className="h-36 w-full rounded-md border border-border object-cover"
              />
            ) : (
              <div className="grid h-36 w-full place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                {photoPath ? "Loading…" : "No photo"}
              </div>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">{student.admission_no}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Field k="Phone" v={student.phone} />
            <Field k="Email" v={student.email} />
            <Field k="Date of birth" v={student.dob} />
            <Field k="Class" v={student.class} />
            <Field k="Program" v={student.program} />
            <Field k="Stream" v={student.stream?.toUpperCase() ?? null} />
            <Field k="School" v={student.school} />
            <Field k="Father" v={student.father_name} />
            <Field k="Father phone" v={student.father_phone} />
            <Field k="Mother" v={student.mother_name} />
            <Field k="Mother phone" v={student.mother_phone} />
            <Field k="Address" v={student.address} full />
            <Field k="Follow-up notes" v={student.notes} full />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
