import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/auth/google-button";

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
  const navigate = useNavigate();
  const claimed = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["student-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // Already signed in (e.g. Google sent them straight back here) — just claim it.
  useEffect(() => {
    if (!data?.valid || claimed.current) return;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return;
      claimed.current = true;
      const { error } = await supabase.rpc("accept_student_invite", { _token: token });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("You're in — welcome!");
      void navigate({ to: "/portal" });
    })();
  }, [data?.valid, token, navigate]);

  const isParent = data?.kind === "parent";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
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
                  : "Link not valid"}
            </p>
          </div>
        </div>

        {!isLoading && !data?.valid ? (
          <p className="text-sm text-muted-foreground">
            This link has already been used or has expired. Ask the institute office to send you a
            fresh one on WhatsApp.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Sign in with Google to activate the portal. You&apos;ll see attendance, test scores,
              fees, timetable and homework — updated by the institute.
            </p>
            <GoogleButton label="Continue with Google" inviteToken={token} />
            <p className="mt-4 text-xs text-muted-foreground">
              Use any Google account you check regularly. There is no separate password to remember.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
