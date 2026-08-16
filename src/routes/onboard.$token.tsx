import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { completeOnboarding } from "@/lib/onboarding.functions";
import { AdmissionForm, type AdmissionFormValues } from "@/components/app/admission-form";
import { CheckCircle2 } from "lucide-react";
import { getInstitute } from "@/lib/academy-settings";

export const Route = createFileRoute("/onboard/$token")({
  head: () => ({
    meta: [
      { title: "Complete your admission form — Academix" },
      {
        name: "description",
        content:
          "Fill in student and parent details to complete your admission at your coaching institute.",
      },
      { property: "og:title", content: "Complete your admission form — Academix" },
      {
        property: "og:description",
        content: "Secure student onboarding link from your institute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardPage,
});

type S = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  class: string | null;
  school: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  address: string | null;
  admission_no: string | null;
  onboarding_completed_at: string | null;
  father_name?: string | null;
  father_phone?: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
  preferred_contact?: string | null;
};

function OnboardPage() {
  const { token } = useParams({ from: "/onboard/$token" });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefill, setPrefill] = useState<Partial<AdmissionFormValues>>({});
  const [studentName, setStudentName] = useState("");
  const [admissionNo, setAdmissionNo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_student_by_token", { _token: token });
      if (error) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = ((data ?? [])[0] ?? null) as S | null;
      if (!row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (row.onboarding_completed_at) {
        setDone(true);
        setStudentName(row.full_name ?? "");
      }
      setPrefill({
        full_name: row.full_name ?? "",
        phone: row.phone ?? "",
        email: row.email ?? "",
        class: row.class ?? "",
        school: row.school ?? "",
        father_name: row.father_name ?? row.parent_name ?? "",
        father_phone: row.father_phone ?? row.parent_phone ?? "",
        mother_name: row.mother_name ?? "",
        mother_phone: row.mother_phone ?? "",
        preferred_contact: row.preferred_contact === "mother" ? "mother" : "father",
        address: row.address ?? "",
      });
      setAdmissionNo(row.admission_no);
      setLoading(false);
    })();
  }, [token]);

  async function onSubmit(v: AdmissionFormValues, photoPath: string | null) {
    setSaving(true);
    try {
      await completeOnboarding({
        data: {
          _token: token,
          _full_name: v.full_name,
          _phone: v.phone,
          _email: v.email,
          _class: v.class,
          _school: v.school,
          _parent_name: v.preferred_contact === "mother" ? v.mother_name : v.father_name,
          _parent_phone: v.preferred_contact === "mother" ? v.mother_phone : v.father_phone,
          _address: v.address,
          _dob: v.dob || null,
          _father_name: v.father_name,
          _father_phone: v.father_phone,
          _mother_name: v.mother_name,
          _mother_phone: v.mother_phone,
          _program: v.program || undefined,
          _stream: v.stream || undefined,
          _photo_path: photoPath ?? undefined,
          _preferred_contact: v.preferred_contact,
        },
      });
      setStudentName(v.full_name);
      setDone(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  if (notFound)
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Link expired or invalid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please contact {getInstitute().name || "your institute"} for a fresh onboarding link.
        </p>
      </Shell>
    );
  if (done)
    return (
      <Shell>
        <div className="grid place-items-center py-4">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <h1 className="text-center text-lg font-semibold">Thanks, {studentName || "student"}!</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Your application is now with the admissions office for approval. We'll reach out shortly.
        </p>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="text-lg font-semibold">Welcome to {getInstitute().name || "our institute"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill your admission details. Admission no: <span className="font-mono">{admissionNo}</span>
      </p>
      <div className="mt-6">
        <AdmissionForm initial={prefill} onSubmit={onSubmit} saving={saving} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const name = getInstitute().name || "Academix";
  const initials = (name.match(/\b\w/g) || ["A"]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{initials}</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">{name}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
