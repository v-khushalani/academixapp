import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

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
};

type Props = {
  initial?: Partial<AdmissionFormValues>;
  onSubmit: (values: AdmissionFormValues, photoPath: string | null) => void | Promise<void>;
  saving?: boolean;
};

const empty: AdmissionFormValues = {
  full_name: "", phone: "", email: "", dob: "", class: "", school: "",
  father_name: "", father_phone: "", mother_name: "", mother_phone: "",
  address: "", program: "", stream: "",
};

const CLASSES = ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"];

export function AdmissionForm({ initial, onSubmit, saving }: Props) {
  const [v, setV] = useState<AdmissionFormValues>({ ...empty, ...(initial ?? {}) });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof AdmissionFormValues>(k: K, val: AdmissionFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const showStream = v.class === "11" || v.class === "12";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!v.full_name.trim()) return toast.error("Full name is required");
    if (!v.phone.trim()) return toast.error("Phone is required");
    if (!v.father_phone.trim() && !v.mother_phone.trim()) return toast.error("At least one parent phone is required");
    if (!v.program) return toast.error("Please choose a program");
    if (showStream && !v.stream) return toast.error("Please choose PCM or PCB");

    let photoPath: string | null = null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop() || "jpg";
      const key = `applicants/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("student-photos").upload(key, photoFile, { upsert: false, contentType: photoFile.type });
      setUploading(false);
      if (error) return toast.error("Photo upload failed: " + error.message);
      photoPath = key;
    }
    await onSubmit(v, photoPath);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <Section title="Student details" />
      <F label="Full name *"><Input value={v.full_name} onChange={(e) => set("full_name", e.target.value)} required /></F>
      <F label="Phone (WhatsApp) *"><Input value={v.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="10-digit" /></F>
      <F label="Email"><Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></F>
      <F label="Date of birth"><Input type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} /></F>
      <F label="Class applying for *">
        <Select value={v.class} onValueChange={(x) => set("class", x)}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
        </Select>
      </F>
      <F label="Current school"><Input value={v.school} onChange={(e) => set("school", e.target.value)} /></F>

      <F label="Enrolling for *" cls="sm:col-span-2">
        <Select value={v.program} onValueChange={(x) => set("program", x as AdmissionFormValues["program"])}>
          <SelectTrigger><SelectValue placeholder="Choose program" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="schooling">Schooling (upto 10th)</SelectItem>
            <SelectItem value="foundation">Foundation (upto 10th)</SelectItem>
            <SelectItem value="both">Both — Schooling + Foundation</SelectItem>
          </SelectContent>
        </Select>
      </F>
      {showStream && (
        <F label="Stream *" cls="sm:col-span-2">
          <Select value={v.stream} onValueChange={(x) => set("stream", x as AdmissionFormValues["stream"])}>
            <SelectTrigger><SelectValue placeholder="Choose stream" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pcm">PCM (Physics, Chemistry, Maths)</SelectItem>
              <SelectItem value="pcb">PCB (Physics, Chemistry, Biology)</SelectItem>
            </SelectContent>
          </Select>
        </F>
      )}

      <Section title="Parent details" />
      <F label="Father's name"><Input value={v.father_name} onChange={(e) => set("father_name", e.target.value)} /></F>
      <F label="Father's phone"><Input value={v.father_phone} onChange={(e) => set("father_phone", e.target.value)} /></F>
      <F label="Mother's name"><Input value={v.mother_name} onChange={(e) => set("mother_name", e.target.value)} /></F>
      <F label="Mother's phone"><Input value={v.mother_phone} onChange={(e) => set("mother_phone", e.target.value)} /></F>
      <F label="Address" cls="sm:col-span-2"><Input value={v.address} onChange={(e) => set("address", e.target.value)} /></F>

      <Section title="Student photo" />
      <F label="Upload photo" cls="sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" />
          <span>{photoFile ? photoFile.name : "Choose a passport-size photo (JPG/PNG, up to 5 MB)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5 MB"); return; }
            setPhotoFile(f);
          }} />
        </label>
      </F>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving || uploading} className="w-full">
          {uploading ? "Uploading photo…" : saving ? "Submitting…" : "Submit application"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Your application will be reviewed by the admissions office.</p>
      </div>
    </form>
  );
}

function F({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return <div className={`space-y-1.5 ${cls ?? ""}`}><Label>{label}</Label>{children}</div>;
}
function Section({ title }: { title: string }) {
  return <h3 className="sm:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>;
}