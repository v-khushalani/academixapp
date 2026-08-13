import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";

export type PortalKind = "admin" | "teacher" | "family" | "platform" | "unified";

const STAFF_ROLES: AppRole[] = [
  "owner",
  "admin",
  "receptionist",
  "counsellor",
  "accountant",
  "superadmin" as AppRole,
];

export function LoginCard({
  kind,
  title,
  subtitle,
  hint,
  aside,
  footer,
}: {
  kind: PortalKind;
  title: string;
  subtitle: string;
  hint?: ReactNode;
  aside: ReactNode;
  footer?: ReactNode;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    const { data: roleRows, error: roleError } = await supabase.rpc("get_my_roles");
    
    if (roleError) {
      console.error("Role fetch error:", roleError);
      setBusy(false);
      toast.error("Failed to verify account permissions. Please try again.");
      return;
    }

    const roles = (roleRows ?? []) as AppRole[];
    
    // Use the unified home helper
    const { homeForRoles } = await import("@/lib/post-auth");
    const to = homeForRoles(roles);

    if (!to) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error("No role has been assigned to this account yet. Ask your institute to enable access.");
      return;
    }

    setBusy(false);
    toast.success("Welcome back");
    navigate({ to });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">Ax</span>
            </div>
            <span className="text-sm font-semibold">Academix</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8 space-y-3">
            <GoogleButton />
            <OrDivider />
          </div>

          <form className="mt-3 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Login ID or Email</Label>
              <Input
                id="email"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                placeholder="you@institute.in or Login ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
            {footer}
            <p>
              Students and faculty: your institute creates your account. Owners: sign up to start.
            </p>
            <p>
              <Link to="/" className="hover:text-foreground">
                ← Back to Academix
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="hidden bg-primary lg:flex lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-primary-foreground">{aside}</div>
      </div>
    </div>
  );
}