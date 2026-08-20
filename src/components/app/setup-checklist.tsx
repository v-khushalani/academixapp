import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { getInstitute } from "@/lib/academy-settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEY = "vk_setup_done";

export type SetupSignals = {
  batches: number;
  students: number;
  firstActionDone: boolean;
};

/**
 * First-run guide. Four steps, one sentence each, and it disappears for good the
 * moment the institute has done real work. Non-technical owners should never have to
 * guess what to do next on day one.
 */
export function SetupChecklist({ signals }: { signals: SetupSignals }) {
  const [hidden, setHidden] = useState(true);

  const inst = getInstitute();
  const brandDone = !!inst.name && inst.name !== "Your Institute";
  const steps = [
    { label: "Add your institute name and logo", done: brandDone, to: "/app/settings", cta: "Open settings" },
    { label: "Create your first batch", done: signals.batches > 0, to: "/app/batches", cta: "Add batch" },
    { label: "Add students", done: signals.students > 0, to: "/app/students", cta: "Add students" },
    {
      label: "Take attendance or collect a fee",
      done: signals.firstActionDone,
      to: "/app/attendance",
      cta: "Take attendance",
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length;

  useEffect(() => {
    const dismissed = typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
    setHidden(dismissed);
  }, []);

  useEffect(() => {
    if (complete && typeof window !== "undefined") window.localStorage.setItem(KEY, "1");
  }, [complete]);

  if (hidden || complete) return null;

  const next = steps.find((s) => !s.done)!;

  return (
    <section className="rounded-lg border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Set up your institute</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Step {done + 1} of {steps.length} — about 5 minutes in total.
          </p>
        </div>
        <button
          type="button"
          aria-label="Hide setup guide"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            window.localStorage.setItem(KEY, "1");
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s.label}
            className={cn("h-1.5 flex-1 rounded-full", i < done ? "bg-primary" : "bg-primary/15")}
          />
        ))}
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                s.done
                  ? "border-success bg-success text-success-foreground"
                  : "border-border bg-background",
              )}
            >
              {s.done ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className={cn("min-w-0 flex-1 truncate", s.done && "text-muted-foreground line-through")}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      <Button asChild size="sm" className="mt-4">
        <Link to={next.to}>{next.cta}</Link>
      </Button>
    </section>
  );
}
