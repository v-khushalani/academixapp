import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AcademixLogo, AcademixWordmark } from "@/components/brand";
import { InstallAcademix } from "@/components/install-academix";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";
import { homeForRoles } from "@/lib/post-auth";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";

/**
 * Single sign-in for everyone — staff, teachers, students, parents and the
 * Academix team. Roles decide the destination, not the URL you arrived from.
 */
export function LoginCard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [noRole, setNoRole] = useState(false);
  // Guards against a native (non-React) form GET submit if a parent taps
  // "Sign in" before hydration finishes on a slow mobile connection.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNoRole(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    const { data: roleRows } = await supabase.rpc("get_my_roles");
    const roles = (roleRows ?? []) as AppRole[];
    const to = homeForRoles(roles);

    setBusy(false);
    if (!to) {
      setNoRole(true);
      navigate({ to: "/pending" });
      return;
    }
    toast.success("Welcome back");
    navigate({ to });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2">
            <AcademixLogo size={32} />
            <AcademixWordmark className="text-sm" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One login for everyone — office, teachers, students and parents. We take you to the
            right dashboard automatically.
          </p>

          <div className="mt-8 space-y-3">
            <GoogleButton />
            <OrDivider />
          </div>

          <form className="mt-3 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Login ID</Label>
              <Input
                id="email"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="username"
                placeholder="you@institute.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {noRole && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Access not activated yet</p>
              <p className="mt-1 text-muted-foreground">
                Your institute hasn&apos;t linked this account to a role yet. Ask them to send you
                the invite link again, or open the link they shared on WhatsApp.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
            <p>
              Running an institute and new here?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Create your institute
              </Link>
            </p>
            <p>
              Teachers, students and parents don&apos;t sign up — your institute sends the login
              link.
            </p>
            <p>
              <Link to="/" className="hover:text-foreground">
                ← Back to Academix
              </Link>
            </p>
            <InstallAcademix label="Install Academix" className="mt-1" />
          </div>
        </div>
      </div>
      <div className="hidden bg-primary lg:flex lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-primary-foreground">
          <p className="text-sm font-medium uppercase tracking-widest opacity-70">
            Academix · Institute OS
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">
            One dashboard for the entire institute.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Admissions, attendance, fees, tests and timetable — plus the teacher and family portals,
            all from this one sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}
