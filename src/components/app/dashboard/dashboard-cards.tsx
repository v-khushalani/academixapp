import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const inr = (n: number) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

/** Oversized headline figure. No card chrome — whitespace does the work. */
export function HeroStat({
  label,
  value,
  tone = "default",
  to,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  to?: string;
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  } as const;
  const body = (
    <>
      <p
        className={cn(
          "truncate text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl",
          toneCls[tone],
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </>
  );
  return to ? (
    <Link to={to} className="min-w-0 transition-opacity hover:opacity-70">
      {body}
    </Link>
  ) : (
    <div className="min-w-0">{body}</div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {action.label}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  } as const;
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold tracking-tight sm:text-xl", toneCls[tone])}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ActionRow({
  icon: Icon,
  label,
  count,
  to,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  to: string;
  tone?: "default" | "warning" | "danger";
}) {
  const dot = {
    default: "bg-muted text-muted-foreground",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:border-primary/30"
    >
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", dot)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <span className="text-sm font-semibold">{count}</span>
    </Link>
  );
}
