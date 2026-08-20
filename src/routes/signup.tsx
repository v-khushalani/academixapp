import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your institute — Academix" },
      {
        name: "description",
        content:
          "Set up your coaching institute on Academix in a minute. Free for 100 students, no card and no setup fee.",
      },
      { property: "og:title", content: "Create your institute — Academix" },
      {
        property: "og:description",
        content: "Start free on Academix — admissions, attendance, fees, tests and timetable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [institute, setInstitute] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: name, institute_name: institute.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      // email confirmation is on — say so instead of bouncing to /login silently
      setSent(true);
      return;
    }
    toast.success("Account created");
    navigate({ to: "/app" });
  }

  if (sent) {
    return (
      <MarketingShell>
        <div className="mx-auto w-full max-w-sm px-5 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to
            activate your institute workspace, then sign in.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/login" })}>
            Go to sign in
          </Button>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-sm px-5 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Create your institute</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You become the owner of this institute workspace. Your data stays yours alone.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="institute">Institute name</Label>
            <Input
              id="institute"
              placeholder="e.g. Sharma Classes"
              value={institute}
              onChange={(e) => setInstitute(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Teachers, students and parents don&apos;t sign up here — your institute sends you a login
          link.
        </p>
      </div>
    </MarketingShell>
  );
}
