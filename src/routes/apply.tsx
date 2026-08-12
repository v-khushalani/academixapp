import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { submitAdmission } from "@/lib/onboarding.functions";
import { AdmissionForm, type AdmissionFormValues } from "@/components/app/admission-form";
import { getInstitute } from "@/lib/academy-settings";
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
import { CLASSES, PROGRAMS } from "@/lib/constants";

export const Route = createFileRoute("/apply")({
  validateSearch: (search: Record<string, unknown>) => ({
    i: typeof search.i === "string" ? search.i : undefined,
    mode: search.mode === "enquiry" ? ("enquiry" as const) : ("admission" as const),
  }),
  head: () => ({
    meta: [
      { title: "Apply for admission — Academix" },
      {
        name: "description",
        content:
          "Apply online to your coaching institute: student details, parent contacts and photo in one short form.",
      },
      { property: "og:title", content: "Apply for admission — Academix" },
      {
        property: "og:description",
        content: "Online admission and enquiry form powered by Academix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const { i: instituteSlug, mode } = Route.useSearch();
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const instituteName = getInstitute().name || "Academix";
  const initials = (instituteName.match(/\b\w/g) || ["A"]).slice(0, 2).join("").toUpperCase();

  async function onSubmit(v: AdmissionFormValues, photoPath: string | null) {
    setSaving(true);
    try {
      await submitAdmission({
        data: {
          _full_name: v.full_name,
          _phone: v.phone,
          _email: v.email,
          _class: v.class,
          _dob: v.dob,
          _school: v.school,
          _father_name: v.father_name,
          _father_phone: v.father_phone,
          _mother_name: v.mother_name,
          _mother_phone: v.mother_phone,
          _address: v.address,
          _program: v.program,
          _stream: v.stream,
          _photo_path: photoPath ?? "",
          _preferred_contact: v.preferred_contact,
          _intent: "admission",
          _token_amount: 0,
          _institute_slug: instituteSlug ?? "",
        }
      });
      setName(v.full_name);
      setDone(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEnquiry(v: {
    full_name: string;
    parent_name: string;
    phone: string;
    class: string;
    program: string;
  }) {
    setSaving(true);
    try {
      await submitAdmission({
        data: {
          _full_name: v.full_name,
          _phone: v.phone,
          _email: "",
          _class: v.class,
          _dob: null,
          _school: "",
          _father_name: v.parent_name,
          _father_phone: v.phone,
          _mother_name: v.parent_name,
          _mother_phone: v.phone,
          _address: "",
          _program: v.program,
          _stream: "",
          _photo_path: "",
          _preferred_contact: "father",
          _intent: "enquiry",
          _token_amount: 0,
          _institute_slug: instituteSlug ?? "",
        }
      });
      setName(v.full_name);
      setDone(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">{instituteName}</p>
            <p className="text-xs text-muted-foreground">
              {mode === "enquiry" ? "Quick enquiry" : "Admission form"}
            </p>
          </div>
        </div>
        {done ? (
          <div className="py-6 text-center">
            <div className="grid place-items-center py-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h1 className="text-lg font-semibold">Thank you, {name}!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "enquiry"
                ? "Your enquiry has been received. Our team will call you shortly with batch, timing and fee details."
                : "Your application has been received. The office will verify the details and confirm your batch."}
            </p>
          </div>
        ) : mode === "enquiry" ? (
          <EnquiryForm saving={saving} onSubmit={submitEnquiry} slug={instituteSlug} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Takes about a minute — we ask a few questions at a time.
            </p>
            <AdmissionForm onSubmit={onSubmit} saving={saving} />
          </>
        )}
      </div>
    </div>
  );
}

/** Five fields, one screen. For walk-ins and hoardings — details come later on call. */
function EnquiryForm({
  saving,
  onSubmit,
  slug,
}: {
  saving: boolean;
  slug?: string;
  onSubmit: (v: {
    full_name: string;
    parent_name: string;
    phone: string;
    class: string;
    program: string;
  }) => void;
}) {
  const [full_name, setFullName] = useState("");
  const [parent_name, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [klass, setKlass] = useState("");
  const [program, setProgram] = useState("");

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!full_name.trim() || !parent_name.trim() || phone.trim().length < 10) {
      toast.error("Student name, parent name and a 10-digit phone number are needed.");
      return;
    }
    onSubmit({ full_name, parent_name, phone, class: klass, program });
  }

  return (
    <form className="space-y-4" onSubmit={handle}>
      <p className="text-sm text-muted-foreground">
        Just five details — we will call you with batches, timings and fees.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="q-name">Student name</Label>
        <Input id="q-name" value={full_name} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-parent">Parent name</Label>
        <Input id="q-parent" value={parent_name} onChange={(e) => setParentName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-phone">WhatsApp number</Label>
        <Input
          id="q-phone"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={klass} onValueChange={setKlass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Interested in</Label>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Sending…" : "Send enquiry"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Ready to admit instead?{" "}
        <Link
          to="/apply"
          search={{ i: slug, mode: "admission" }}
          className="text-primary hover:underline"
        >
          Fill the full admission form
        </Link>
      </p>
    </form>
  );
}
