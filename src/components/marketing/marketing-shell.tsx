import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcademixLogo, AcademixWordmark } from "@/components/brand";
import { InstallAcademix } from "@/components/install-academix";

const NAV = [
  { to: "/for-institutes" as const, label: "Features" },
  { to: "/pricing" as const, label: "Pricing" },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <AcademixLogo size={32} />
      <AcademixWordmark className="text-base" />
    </Link>
  );
}


/**
 * Single public shell — same header, nav and footer on landing, features,
 * pricing, sign-in chooser and signup. Nav links never disappear.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Wordmark />

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium bg-muted" }}
              >
                {n.label}
              </Link>
            ))}
            <Button asChild variant="outline" size="sm" className="ml-2">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Start free</Link>
            </Button>
          </nav>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-md border border-border md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm text-muted-foreground"
                  activeProps={{ className: "text-foreground font-medium bg-muted" }}
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" onClick={() => setOpen(false)}>
                  <Link to="/signup">Start free</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Academix</span>
            <InstallAcademix label="Install app" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link to="/for-institutes" className="hover:text-foreground">
              Features
            </Link>
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/guide" className="hover:text-foreground">
              Guide
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
