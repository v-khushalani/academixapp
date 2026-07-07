import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/onboard/$token")({
  component: OnboardPage,
});

type S = {
  id: string; full_name: string | null; phone: string | null; email: string | null;
  class: string | null; school: string | null; parent_name: string | null;
  parent_phone: string | null; address: string | null; admission_no: string | null;
  onboarding_completed_at: string | null;
};

function OnboardPage() {
  const { token } = useParams({ from: "/onboard/$token" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState<S | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_student_by_token", { _token: token });
      if (error) { setNotFound(true); setLoading(false); return; }
      const row = (data?.[0] ?? null) as S | null;
      if (!row) setNotFound(true);
      else {
        setF(row);
        if (row.onboarding_completed_at) setDone(true);
      }
      setLoading(false);
    })();
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!f) return;
    setSaving(true);
    const { error } = await supabase.rpc("complete_student_onboarding", {
      _token: token,
      _full_name: f.full_name ?? "",
      _phone: f.phone ?? "",
      _email: f.email ?? "",
      _class: f.class ?? "",
      _school: f.school ?? "",
      _parent_name: f.parent_name ?? "",
      _parent_phone: f.parent_phone ?? "",
      _address: f.address ?? "",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
  }

  if (loading) {
    return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  }
  if (notFound || !f) {
    return <Shell><h1 className="text-lg font-semibold">Link expired or invalid</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please contact VK Academy for a fresh onboarding link.</p></Shell>;
  }
  if (done) {
    return <Shell>
      <div className="grid place-items-center py-4"><CheckCircle2 className="h-12 w-12 text-success" /></div>
      <h1 className="text-center text-lg font-semibold">You're all set, {f.full_name}!</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Your details have been submitted. VK Academy will reach out with next steps.</p>
    </Shell>;
  }

  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value } as S);

  return (
    <Shell>
      <h1 className="text-lg font-semibold">Welcome to VK Academy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Fill your admission details. Admission no: <span className="font-mono">{f.admission_no}</span></p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.full_name ?? ""} onChange={set("full_name")} required /></Field>
        <Field label="Phone"><Input value={f.phone ?? ""} onChange={set("phone")} required /></Field>
        <Field label="Email"><Input type="email" value={f.email ?? ""} onChange={set("email")} /></Field>
        <Field label="Class"><Input value={f.class ?? ""} onChange={set("class")} /></Field>
        <Field label="School" cls="sm:col-span-2"><Input value={f.school ?? ""} onChange={set("school")} /></Field>
        <Field label="Parent name"><Input value={f.parent_name ?? ""} onChange={set("parent_name")} /></Field>
        <Field label="Parent phone (WhatsApp)"><Input value={f.parent_phone ?? ""} onChange={set("parent_phone")} /></Field>
        <Field label="Address" cls="sm:col-span-2"><Input value={f.address ?? ""} onChange={set("address")} /></Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Submitting…" : "Submit"}</Button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">VK</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">VK Academy</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return <div className={`space-y-1.5 ${cls ?? ""}`}><Label>{label}</Label>{children}</div>;
}