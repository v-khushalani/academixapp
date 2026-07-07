import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Zap, Sparkles, ShieldCheck, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">VK</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">VK Academy</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#pillars" className="hover:text-foreground">Product</a>
          <a href="#modules" className="hover:text-foreground">Modules</a>
          <a href="#trust" className="hover:text-foreground">Why VK</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild size="sm"><Link to="/app">Open dashboard</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          The operating system for modern coaching institutes
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Run VK Academy like a{" "}
          <span className="text-primary">world-class product.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Students, admissions, batches, attendance, fees and tests — one calm,
          lightning-fast dashboard. No clutter. No noise. Just clarity.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-1.5">
            <Link to="/app">Open dashboard <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section id="pillars" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-3">
          {[
            { icon: Zap, title: "Speed", body: "Sub-second navigation. Keyboard-first. Built for daily operators." },
            { icon: Sparkles, title: "Simplicity", body: "Zero clutter. Every screen answers one question well." },
            { icon: ShieldCheck, title: "Reliability", body: "Scales from one branch to many, without rewrites." },
          ].map((p) => (
            <div key={p.title} className="bg-card p-8">
              <p.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything, one dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">14 focused modules. All working together.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Dashboard","Students","Admissions","Batches","Attendance","Fees","Tests","Homework","Study Material","Timetable","Faculty","Reports","Notifications","Settings"].map((m) => (
            <div key={m} className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
              {m}
            </div>
          ))}
        </div>
      </section>

      <section id="trust" className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <LineChart className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for institutes that value craft.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Multi-branch ready. Multi-tenant ready. Ready for the AI-native future without
            asking you to change how you work today.
          </p>
          <Button asChild size="lg" className="mt-6 gap-1.5">
            <Link to="/app">Explore the product <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} VK Academy</span>
          <span>Made with care.</span>
        </div>
      </footer>
    </div>
  );
}
