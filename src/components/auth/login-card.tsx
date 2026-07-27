import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";

export type PortalKind = "admin" | "teacher" | "family";

const STAFF_ROLES: AppRole[] = ["owner", "admin", "receptionist", "counsellor", "accountant"];
const CONFIG: Record<
  PortalKind,
  { roles: AppRole[]; destination: string; label: string; elsewhere: string; elsewhereTo: string }
> = {
  admin: {
    roles: STAFF_ROLES,
    destination: "/app",
    label: "staff & admin",
    elsewhere: "Teacher or student? Use the right portal",
    elsewhereTo: "/login/teacher",
  },
  teacher: {
    roles: ["faculty"],
    destination: "/app/attendance",
    label: "teacher",
    elsewhere: "Not a teacher? Pick your portal",
    elsewhereTo: "/login/student",
  },
  family: {
    roles: ["student", "parent"],
    destination: "/portal",
    label: "student & parent",
    elsewhere: "Staff member? Sign in here",
    elsewhereTo: "/login/admin",
  },
};

function portalHomeFor(roles: AppRole[]): { to: string; name: string } | null {
  if (roles.some((r) => STAFF_ROLES.includes(r))) return { to: "/login/admin", name: "staff" };
  if (roles.includes("faculty")) return { to: "/login/teacher", name: "teacher" };
  if (roles.includes("student") || roles.includes("parent"))
    return { to: "/login/student", name: "student & parent" };
  return null;
}

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
  const cfg = CONFIG[kind];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrongPortal, setWrongPortal] = useState<{ to: string; name: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setWrongPortal(null);
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
    const allowed = roles.some((r) => cfg.roles.includes(r));

    if (!allowed) {
      const target = portalHomeFor(roles);
      await supabase.auth.signOut();
      setBusy(false);
      setWrongPortal(target);
      toast.error(
        target
          ? `This is the ${cfg.label} login. Your account belongs to the ${target.name} portal.`
          : "No role has been assigned to this account yet. Ask your institute to enable access.",
      );
      return;
    }

    setBusy(false);
    toast.success("Welcome back");
    navigate({ to: cfg.destination });
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

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Login ID</Label>
              <Input
                id="email"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="username"
                placeholder={kind === "family" ? "as printed on your login slip" : "you@institute.in"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {kind !== "family" && (
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot?
                  </Link>
                )}
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

          {wrongPortal && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Wrong portal</p>
              <p className="mt-1 text-muted-foreground">
                Your account belongs to the {wrongPortal.name} portal.
              </p>
              <Link
                to={wrongPortal.to}
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                Go to the {wrongPortal.name} login →
              </Link>
            </div>
          )}

          <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
            {footer}
            <p>
              <Link to={cfg.elsewhereTo} className="text-primary hover:underline">
                {cfg.elsewhere}
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