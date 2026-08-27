import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Field as F } from "@/components/app/field";
import { AadhaarScan, type AadhaarResult } from "@/components/app/aadhaar-scan";

export type AdmissionFormValues = {
  full_name: string;
  phone: string;
  email: string;
  dob: string;
  class: string;
  school: string;
  father_name: string;
  father_phone: string;
  mother_name: string;
  mother_phone: string;
  address: string;
  program: "" | "schooling" | "foundation" | "both";
  stream: "" | "pcm" | "pcb";
  preferred_contact: "father" | "mother";
};

type Props = {
  initial?: Partial<AdmissionFormValues>;
  onSubmit: (
    values: AdmissionFormValues,
    photoPath: string | null,
    aadhaar: { hash: string; last4: string; editedFields: string[] } | null,
  ) => void | Promise<void>;
  saving?: boolean;
};

const empty: AdmissionFormValues = {
  full_name: "",
  phone: "",
  email: "",
  dob: "",
  class: "",
  school: "",
  father_name: "",
  father_phone: "",
  mother_name: "",
  mother_phone: "",
  address: "",
  program: "",
  stream: "",
  preferred_contact: "father",
};

const CLASSES = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const STEPS = [
  { title: "Identity", hint: "Scan the student's Aadhaar QR — it fills the details for you" },
  { title: "Study details", hint: "What are you joining for?" },
  { title: "Parents", hint: "Who should we contact?" },
  { title: "Photo & submit", hint: "Last step" },
];


/**
 * Enquiry form shown on the public QR link. Asked one small frame at a time so a
 * parent on a phone never sees a wall of fields.
 */
export function AdmissionForm({ initial, onSubmit, saving }: Props) {
  const [v, setV] = useState<AdmissionFormValues>({ ...empty, ...(initial ?? {}) });
  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [aadhaar, setAadhaar] = useState<AadhaarResult | null>(null);
  const [autoFilled, setAutoFilled] = useState<Partial<AdmissionFormValues>>({});
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof AdmissionFormValues>(k: K, val: AdmissionFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const showStream = v.class === "11" || v.class === "12";
  const showProgram = !showStream && v.class !== "";

  function validate(i: number): boolean {
    if (i === 0) {
      if (!v.full_name.trim()) return !toast.error("Student's full name is required");
      if (v.phone.replace(/\D/g, "").length < 10)
        return !toast.error("Please enter a valid 10-digit phone number");
      if (!v.class) return !toast.error("Please choose the class");
      if (showProgram && !v.program) return !toast.error("Please choose a program");
      if (showStream && !v.stream) return !toast.error("Please choose PCM or PCB");
      return true;
    }
    if (i === 1) {
      if (!v.father_name.trim()) return !toast.error("Father's name is required");
      if (v.father_phone.replace(/\D/g, "").length < 10)
        return !toast.error("Father's phone must be 10 digits");
      if (!v.mother_name.trim()) return !toast.error("Mother's name is required");
      if (v.mother_phone.replace(/\D/g, "").length < 10)
        return !toast.error("Mother's phone must be 10 digits");
      return true;
    }
    return true;
  }

  function next() {
    if (!validate(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function finish() {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validate(i)) {
        setStep(i);
        return;
      }
    }
    let photoPath: string | null = null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop() || "jpg";
      const key = `applicants/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("student-photos")
        .upload(key, photoFile, { upsert: false, contentType: photoFile.type });
      setUploading(false);
      if (error) {
        toast.error("Photo upload failed: " + error.message);
        return;
      }
      photoPath = key;
    }
    const editedFields = Object.keys(autoFilled).filter(
      (k) =>
        (autoFilled[k as keyof AdmissionFormValues] ?? "") !==
        (v[k as keyof AdmissionFormValues] ?? ""),
    );
    await onSubmit(
      v,
      photoPath,
      aadhaar ? { hash: aadhaar.hash, last4: aadhaar.profile.last4, editedFields } : null,
    );
  }

  const busy = Boolean(saving) || uploading;

  return (
    <div className="space-y-5">
      {/* progress */}
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">{STEPS[step].title}</span>
          <span className="text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{STEPS[step].hint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {step === 0 && (
          <Frame>
            <div className="sm:col-span-2">
              <AadhaarScan
                value={aadhaar}
                onVerified={(r) => {
                  const filled: Partial<AdmissionFormValues> = {
                    full_name: r.profile.name,
                    dob: r.profile.dob,
                    address: r.profile.address,
                  };
                  setAadhaar(r);
                  setAutoFilled(filled);
                  setV((p) => ({ ...p, ...filled }));
                }}
              />
            </div>
            <F label="Student's full name *" cls="sm:col-span-2">
              <Input
                value={v.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="As it should appear on records"
                autoFocus
              />
            </F>
            <F label="Phone (WhatsApp) *" cls="sm:col-span-2">
              <Input
                inputMode="numeric"
                value={v.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="10-digit number"
              />
            </F>
            <F label="Class applying for *" cls="sm:col-span-2">
              <Select value={v.class} onValueChange={(x) => set("class", x)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            {showProgram && (
              <F label="Enrolling for *" cls="sm:col-span-2">
                <Select
                  value={v.program}
                  onValueChange={(x) => set("program", x as AdmissionFormValues["program"])}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schooling">Schooling</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="both">Both — Schooling + Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            )}
            {showStream && (
              <F label="Stream *" cls="sm:col-span-2">
                <Select
                  value={v.stream}
                  onValueChange={(x) => set("stream", x as AdmissionFormValues["stream"])}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose stream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcm">PCM (Physics, Chemistry, Maths)</SelectItem>
                    <SelectItem value="pcb">PCB (Physics, Chemistry, Biology)</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            )}
          </Frame>
        )}

        {step === 1 && (
          <Frame>
            <F label="Father's name *">
              <Input value={v.father_name} onChange={(e) => set("father_name", e.target.value)} />
            </F>
            <F label="Father's phone *">
              <Input
                inputMode="numeric"
                value={v.father_phone}
                onChange={(e) => set("father_phone", e.target.value)}
                placeholder="10-digit"
              />
            </F>
            <F label="Mother's name *">
              <Input value={v.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
            </F>
            <F label="Mother's phone *">
              <Input
                inputMode="numeric"
                value={v.mother_phone}
                onChange={(e) => set("mother_phone", e.target.value)}
                placeholder="10-digit"
              />
            </F>
            <F label="Who monitors studies? (gets our WhatsApp updates) *" cls="sm:col-span-2">
              <Select
                value={v.preferred_contact}
                onValueChange={(x) => set("preferred_contact", x as "father" | "mother")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                </SelectContent>
              </Select>
            </F>
          </Frame>
        )}

        {step === 2 && (
          <Frame>
            <F label="Date of birth">
              <Input type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} />
            </F>
            <F label="Current school">
              <Input value={v.school} onChange={(e) => set("school", e.target.value)} />
            </F>
            <F label="Email">
              <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
            </F>
            <F label="Address">
              <Input value={v.address} onChange={(e) => set("address", e.target.value)} />
            </F>
          </Frame>
        )}

        {step === 3 && (
          <Frame>
            <F label="Student photo (optional)" cls="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {photoFile ? photoFile.name : "Choose a passport-size photo (up to 5 MB)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > 5 * 1024 * 1024) {
                      toast.error("Photo must be under 5 MB");
                      return;
                    }
                    setPhotoFile(f);
                  }}
                />
              </label>
            </F>
            <div className="sm:col-span-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{v.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">
                Class {v.class || "—"} · {v.phone || "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Parent: {v.preferred_contact === "father" ? v.father_name : v.mother_name} ·{" "}
                {v.preferred_contact === "father" ? v.father_phone : v.mother_phone}
              </p>
            </div>
          </Frame>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => setStep((s) => s - 1)}
            disabled={busy}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" className="flex-1 gap-1.5" onClick={next}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" className="flex-1 gap-1.5" onClick={finish} disabled={busy}>
            <Check className="h-4 w-4" />
            {uploading ? "Uploading photo…" : saving ? "Submitting…" : "Submit"}
          </Button>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Our team will call you back with batch, timing and fee details.
      </p>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">{children}</div>;
}