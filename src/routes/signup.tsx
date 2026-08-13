import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { createInstituteFn, getMyInstituteStatusFn } from "@/lib/signup.functions";
import { useServerFn } from "@tanstack/react-start";

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
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const createInstitute = useServerFn(createInstituteFn);
  const getStatus = useServerFn(getMyInstituteStatusFn);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        // Check if they already have an institute
        getStatus().then((status) => {
          if (status.hasInstitute) {
            navigate({ to: "/app" });
          } else {
            setLoading(false);
          }
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [navigate, getStatus]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please login with Google first");
      return;
    }
    
    setBusy(true);
    try {
      await createInstitute({ data: { name, tagline } });
      toast.success("Institute created successfully!");
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create institute");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <MarketingShell>
        <div className="mx-auto w-full max-w-sm px-5 py-20 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Checking your status...</p>
        </div>
      </MarketingShell>
    );
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline (optional)</Label>
            <Input 
              id="tagline" 
              placeholder="Best in Coaching"
              value={tagline} 
              onChange={(e) => setTagline(e.target.value)} 
            />
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
            {busy ? "Creating Institute…" : "Complete Setup"}
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
