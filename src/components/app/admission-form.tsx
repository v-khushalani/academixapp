import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
  intent: "admission" | "enquiry";
  token_amount: number;
};

type Props = {
  initial?: Partial<AdmissionFormValues>;
  onSubmit: (values: AdmissionFormValues, photoPath: string | null) => void | Promise<void>;
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
  intent: "admission",
  token_amount: 0,
};

const CLASSES = [
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

export function AdmissionForm({ initial, onSubmit, saving }: Props) {
  const [v, setV] = useState<AdmissionFormValues>({ ...empty, ...(initial ?? {}) });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof AdmissionFormValues>(k: K, val: AdmissionFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const showStream = v.class === "11" || v.class === "12";
  const showProgram = !showStream && v.class !== "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!v.full_name.trim()) return toast.error("Full name is required");
    if (!v.phone.trim()) return toast.error("Phone is required");
    if (!v.father_name.trim()) return toast.error("Father's name is required");
    if (!v.father_phone.trim()) return toast.error("Father's phone is required");
    if (!v.mother_name.trim()) return toast.error("Mother's name is required");
    if (!v.mother_phone.trim()) return toast.error("Mother's phone is required");
    if (showProgram && !v.program) return toast.error("Please choose a program");
    if (showStream && !v.stream) return toast.error("Please choose PCM or PCB");

    let photoPath: string | null = null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop() || "jpg";
      const key = `applicants/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("student-photos")
        .upload(key, photoFile, { upsert: false, contentType: photoFile.type });
      setUploading(false);
      if (error) return toast.error("Photo upload failed: " + error.message);
      photoPath = key;
    }
    await onSubmit(v, photoPath);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <Section title="Why are you here?" />
      <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
        {(
          [
            {
              key: "admission",
              title: "Taking admission now",
              desc: "Joining a batch — pay a token/advance amount today.",
            },
            {
              key: "enquiry",
              title: "Just enquiring",
              desc: "Only want details for now. We'll follow up with you.",
            },
          ] as const
        ).map((o) => (
          <button
            type="button"
            key={o.key}
            onClick={() => set("intent", o.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              v.intent === o.key
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <p className="text-sm font-semibold">{o.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{o.desc}</p>
          </button>
        ))}
      </div>
      {v.intent === "admission" && (
        <F label="Token / advance amount paid today (₹)" cls="sm:col-span-2">
          <Input
            type="number"
            min={0}
            step="1"
            value={v.token_amount || ""}
            onChange={(e) => set("token_amount", Number(e.target.value) || 0)}
            placeholder="0"
          />
        </F>
      )}

      <Section title="Student details" />
      <F label="Full name *">
        <Input value={v.full_name} onChange={(e) => set("full_name", e.target.value)} required />
      </F>
      <F label="Phone (WhatsApp) *">
        <Input
          value={v.phone}
          onChange={(e) => set("phone", e.target.value)}
          required
          placeholder="10-digit"
        />
      </F>
      <F label="Email">
        <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
      </F>
      <F label="Date of birth">
        <Input type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} />
      </F>
      <F label="Class applying for *">
        <Select value={v.class} onValueChange={(x) => set("class", x)}>
          <SelectTrigger>
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
      <F label="Current school">
        <Input value={v.school} onChange={(e) => set("school", e.target.value)} />
      </F>

      {showProgram && (
        <F label="Enrolling for *" cls="sm:col-span-2">
          <Select
            value={v.program}
            onValueChange={(x) => set("program", x as AdmissionFormValues["program"])}
          >
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="Choose stream" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcm">PCM (Physics, Chemistry, Maths)</SelectItem>
              <SelectItem value="pcb">PCB (Physics, Chemistry, Biology)</SelectItem>
            </SelectContent>
          </Select>
        </F>
      )}

      <Section title="Parent details" />
      <F label="Father's name *">
        <Input
          value={v.father_name}
          onChange={(e) => set("father_name", e.target.value)}
          required
        />
      </F>
      <F label="Father's phone *">
        <Input
          value={v.father_phone}
          onChange={(e) => set("father_phone", e.target.value)}
          required
          placeholder="10-digit"
        />
      </F>
      <F label="Mother's name *">
        <Input
          value={v.mother_name}
          onChange={(e) => set("mother_name", e.target.value)}
          required
        />
      </F>
      <F label="Mother's phone *">
        <Input
          value={v.mother_phone}
          onChange={(e) => set("mother_phone", e.target.value)}
          required
          placeholder="10-digit"
        />
      </F>
      <F label="Who monitors studies? (default WhatsApp contact) *" cls="sm:col-span-2">
        <Select
          value={v.preferred_contact}
          onValueChange={(x) => set("preferred_contact", x as "father" | "mother")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="father">Father</SelectItem>
            <SelectItem value="mother">Mother</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <F label="Address" cls="sm:col-span-2">
        <Input value={v.address} onChange={(e) => set("address", e.target.value)} />
      </F>

      <Section title="Student photo" />
      <F label="Upload photo" cls="sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" />
          <span>
            {photoFile ? photoFile.name : "Choose a passport-size photo (JPG/PNG, up to 5 MB)"}
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

      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving || uploading} className="w-full">
          {uploading
            ? "Uploading photo…"
            : saving
              ? "Submitting…"
              : v.intent === "enquiry"
                ? "Submit enquiry"
                : "Submit admission form"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {v.intent === "enquiry"
            ? "Our team will call you back with details."
            : "The admissions office will confirm your batch and fees."}
        </p>
      </div>
    </form>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h3 className="sm:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h3>
  );
}
