import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [institute, setInstitute] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <MarketingShell>
        <div className="mx-auto w-full max-w-sm px-5 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">All set</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re setting up <span className="font-medium">{institute}</span> and signing you
            in. You&apos;ll land on your dashboard in a moment.
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
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!institute.trim()) return;
            setSent(true);
          }}
        >
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
          <GoogleButton
            label="Create with Google"
            instituteName={institute.trim() || undefined}
          />
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
