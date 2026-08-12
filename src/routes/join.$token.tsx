import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acceptFacultyInviteFn } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field as F } from "@/components/app/field";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Teacher sign-up — Academix" },
      {
        name: "description",
        content: "Set up your teacher account with the invite your institute sent you.",
      },
      { property: "og:title", content: "Teacher sign-up — Academix" },
      {
        property: "og:description",
        content: "Accept your institute's invite and start marking attendance and test marks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const claimed = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["faculty-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_faculty_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // Already signed in (e.g. returned from Google on this same link) — just claim it.
  useEffect(() => {
    if (!data?.valid || claimed.current) return;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return;
      claimed.current = true;
      try {
        await acceptFacultyInviteFn({ data: { _token: token } });
      } catch (error: any) {
        toast.error(error.message);
        return;
      }
      toast.success("You're in — welcome aboard!");
      void navigate({ to: "/teach" });
    })();
  }, [data?.valid, token, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/join/${token}` },
    });
    if (signUpError && !signUpError.message.toLowerCase().includes("already registered")) {
      setSaving(false);
      toast.error(signUpError.message);
      return;
    }
    if (signUpError) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setSaving(false);
        toast.error("This email already has an account — use the correct password.");
        return;
      }
    }
    try {
      await acceptFacultyInviteFn({ data: { _token: token } });
    } catch (error: any) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    setSaving(false);
    toast.success("You're in — welcome aboard!");
    void navigate({ to: "/teach" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Teacher sign-up</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Checking your invite…"
                : data?.valid
                  ? `${data.institute_name} invited you`
                  : "Invite not valid"}
            </p>
          </div>
        </div>

        {!isLoading && !data?.valid ? (
          <p className="text-sm text-muted-foreground">
            This invite link has already been used or has expired. Please ask your institute to send
            a fresh one.
          </p>
        ) : (
          <div className="space-y-3">
            {data?.full_name && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                Hello <span className="font-semibold">{data.full_name}</span>
                {data.subject ? ` · ${data.subject}` : ""}
              </p>
            )}
            <GoogleButton label="Continue with Google" inviteToken={token} />
            <p className="text-center text-[11px] text-muted-foreground">
              Fastest way in — no email verification needed.
            </p>
            {!showPassword ? (
              <button
                type="button"
                className="w-full text-center text-xs text-primary hover:underline"
                onClick={() => setShowPassword(true)}
              >
                Use email and password instead
              </button>
            ) : (
              <>
                <OrDivider />
                <form className="space-y-3" onSubmit={onSubmit}>
            <F label="Your email *">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </F>
            <F label="Create a password *">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </F>
            <Button type="submit" className="w-full" disabled={saving || isLoading}>
              {saving ? "Setting up…" : "Create my teacher account"}
            </Button>
                </form>
              </>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              You'll be able to mark attendance and enter test marks — nothing else.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}