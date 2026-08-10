import { useQuery } from "@tanstack/react-query";
import { KeyRound, Phone } from "lucide-react";
import { limitRows, useUsage } from "@/lib/usage";
import { fetchInstituteControls, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/institute-controls";
import { useBranches, ALL_BRANCHES } from "@/lib/branch";
import { cn } from "@/lib/utils";

/** Limits are configured per institute by Team Academix — never self-served. */
export function PlanUsageCard() {
  const { activeId } = useBranches();
  const { data: controls = [] } = useQuery({
    queryKey: ["institute-controls"],
    queryFn: () => fetchInstituteControls(),
  });
  const current =
    controls.find((c) => c.id === activeId) ?? (activeId === ALL_BRANCHES ? controls[0] : undefined);
  const { data } = useUsage();

  const rows = data && current ? limitRows(current.limits, data) : [];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Your limits</h3>
        <a
          href={`tel:${SUPPORT_PHONE_TEL}`}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Phone className="h-3.5 w-3.5" />
          Need more? Call {SUPPORT_PHONE}
        </a>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Academix sets these for your institute. To raise a limit or switch a module on, give us a
        call — we&apos;ll set it up the same day.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const unlimited = r.limit === 0;
          const pct = unlimited ? 0 : Math.min(100, Math.round((r.used / r.limit) * 100));
          const hot = !unlimited && pct >= 80;
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={cn("font-medium tabular-nums", hot && "text-warning")}>
                  {r.used} {unlimited ? "· unlimited" : `of ${r.limit}`}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", hot ? "bg-warning" : "bg-primary")}
                  style={{ width: `${unlimited ? 6 : pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Three doors in, no public sign-up. */
export function LoginsHelpCard() {
  const items = [
    {
      title: "Office & admin staff",
      body: "Sign in at the institute console login with their email and password. Owners add colleagues under Users & roles.",
    },
    {
      title: "Teachers",
      body: "Get a one-time invite link on WhatsApp from Faculty → Invite teacher. They open it and continue with Google — that link is the only way in.",
    },
    {
      title: "Students & parents",
      body: "Open Students → the key icon on a row, generate a portal link and send it on WhatsApp. Signing in with Google through that link attaches the account to the student.",
    },
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">How logins work</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        There is no public sign-up for teachers, students or parents — every account comes from a
        link your institute sends.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.title} className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">{i.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{i.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}