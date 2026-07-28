import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdmissionForm, type AdmissionFormValues } from "@/components/app/admission-form";
import { getInstitute } from "@/lib/academy-settings";

export const Route = createFileRoute("/apply")({
  component: ApplyPage,
});

function ApplyPage() {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [intent, setIntent] = useState<"admission" | "enquiry">("admission");
  const instituteName = getInstitute().name || "Academix";
  const initials = (instituteName.match(/\b\w/g) || ["A"]).slice(0, 2).join("").toUpperCase();

  async function onSubmit(v: AdmissionFormValues, photoPath: string | null) {
    setSaving(true);
    const { error } = await supabase.rpc("submit_admission_application", {
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
      _intent: v.intent,
      _token_amount: v.token_amount ?? 0,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName(v.full_name);
    setIntent(v.intent);
    setDone(true);
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
            <p className="text-xs text-muted-foreground">Admission Application Form</p>
          </div>
        </div>
        {done ? (
          <div className="py-6 text-center">
            <div className="grid place-items-center py-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h1 className="text-lg font-semibold">Thank you, {name}!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {intent === "enquiry"
                ? "Your enquiry has been received. Our team will call you with all the details shortly."
                : "Your admission form has been submitted. The admissions office will confirm your batch and fees shortly."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Fill in the details below. Fields marked * are required. Your application will be
              reviewed by our admissions office.
            </p>
            <AdmissionForm onSubmit={onSubmit} saving={saving} />
          </>
        )}
      </div>
    </div>
  );
}
