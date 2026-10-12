import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome/$token")({
  head: () => ({
    meta: [
      { title: "Activate your Academix portal" },
      {
        name: "description",
        content:
          "Students and parents activate their Academix portal with the link their institute sent on WhatsApp.",
      },
      { property: "og:title", content: "Activate your Academix portal" },
      {
        property: "og:description",
        content: "See attendance, marks, fees and timetable the moment they change.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { token } = Route.useParams();
  const claimed = useRef(false);
  const [onboarded, setOnboarded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["student-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: s }) => setSignedIn(!!s.session));
  }, []);

  // Back from Google (or already signed in) — claim the invite, then show the welcome card.
  useEffect(() => {
    if (!data?.valid || claimed.current) return;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return;
      claimed.current = true;
      const { error } = await supabase.rpc("accept_student_invite", { _token: token });
      if (error) {
        claimed.current = false;
        toast.error(error.message);
        return;
      }
      setOnboarded(true);
    })();
  }, [data?.valid, token]);

  const isParent = data?.kind === "parent";
  const dashboardUrl = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        {onboarded ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <h1 className="mt-3 text-xl font-semibold tracking-tight">Welcome onboard!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.student_name} · {data?.institute_name}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Your {isParent ? "parent" : "student"} portal is now linked to your Google account.
              Save this website link — open it any time to reach your dashboard:
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                {dashboardUrl}
              </span>
              <Button
                size="icon"
                variant="outline"
                title="Copy link"
                onClick={() => {
                  void navigator.clipboard.writeText(dashboardUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button asChild size="lg" className="mt-5 w-full">
              <Link to="/portal">Go to my dashboard →</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight">
                  {isParent ? "Parent portal" : "Student portal"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isLoading
                    ? "Checking your link…"
                    : data?.valid
                      ? `${data.institute_name} · ${data.student_name}`
                      : "Link already used"}
                </p>
              </div>
            </div>

            {!isLoading && !data?.valid ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This link has already been used or has expired. If you have already activated
                  your portal, go straight to your dashboard.
                </p>
                <Button asChild size="lg" className="w-full">
                  <Link to={signedIn ? "/portal" : "/login"}>
                    {signedIn ? "Go to my dashboard →" : "Sign in to my dashboard →"}
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Not activated yet? Ask the institute office to send a fresh link on WhatsApp.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Tap below and choose your Google account. You&apos;ll see attendance, test
                  scores, fees, timetable and homework — updated by the institute.
                </p>
                <GoogleButton label="Continue with Google" inviteToken={token} />
                <p className="mt-4 text-xs text-muted-foreground">
                  Opened inside WhatsApp? Tap ⋮ → “Open in browser” first — Google sign-in works
                  best in Chrome or Safari.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
