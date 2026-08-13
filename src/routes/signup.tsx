import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { GoogleButton } from "@/components/auth/google-button";

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
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check if user is already logged in via Google
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setName(data.user.user_metadata.full_name || "");
      }
    });
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please login with Google first");
      return;
    }
    
    setBusy(true);
    // Update user metadata with institute info
    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: name, 
        institute_name: institute.trim(),
        is_onboarding: true 
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    toast.success("Institute details saved");
    navigate({ to: "/app" });
  }

  if (!user) {
    return (
      <MarketingShell>
        <div className="mx-auto w-full max-w-sm px-5 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your institute</h1>
          <p className="mt-2 text-sm text-muted-foreground mb-8">
            To ensure security and verify ownership, please sign in with your Google account first.
          </p>
          <GoogleButton label="Login with Google to continue" />
          <p className="mt-6 text-xs text-muted-foreground">
            After login, you can set up your institute workspace.
          </p>
          <p className="mt-8 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground underline">
              Already have an account? Sign in
            </Link>
          </p>
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
            <Label htmlFor="name">Your full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5 opacity-60">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Finalizing…" : "Complete Setup"}
          </Button>
        </form>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Logged in as <span className="font-medium">{user.email}</span>.{" "}
          <button 
            onClick={() => supabase.auth.signOut().then(() => setUser(null))}
            className="text-primary hover:underline"
          >
            Not you? Switch account
          </button>
        </p>
      </div>
    </MarketingShell>
  );
}
