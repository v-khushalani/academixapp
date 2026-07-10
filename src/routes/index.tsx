import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Zap,
  Users,
  TrendingUp,
  Clock,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const stats = [
    { label: "Faster", value: "10x" },
    { label: "Easier", value: "1 Dashboard" },
    { label: "Smarter", value: "Real-time" },
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Zero Friction",
      desc: "Setup in minutes. Start managing in seconds.",
    },
    {
      icon: TrendingUp,
      title: "Data That Matters",
      desc: "See student progress. Track fees. Manage batches. All at a glance.",
    },
    {
      icon: Users,
      title: "Your Team Loves It",
      desc: "Intuitive design. No training needed. Your staff will prefer it.",
    },
  ];

  const features = [
    {
      icon: Users,
      title: "Student Management",
      desc: "Track, approve, onboard—all in one place",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      desc: "Understand your institute at a glance",
    },
    {
      icon: TrendingUp,
      title: "Fee Tracking",
      desc: "Never miss a payment or due date",
    },
    {
      icon: Clock,
      title: "Attendance",
      desc: "One-click batch attendance marking",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-md">
              <span className="text-sm font-bold">VK</span>
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight">VK Academy</span>
              <span className="block text-xs text-primary">Institute OS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Link to="/app">Launch App →</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
        <div className="space-y-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              The OS your institute deserves
            </span>
          </div>

          {/* Main Heading */}
          <div>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Stop drowning in{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                spreadsheets.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              One dashboard for everything. Students, admissions, fees, attendance, tests. Fast.
              Beautiful. Actually useful.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2 bg-primary px-6">
              <Link to="/app">
                See it in action <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-6">
              <Link to="/apply">Apply for admission</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 sm:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl font-bold text-primary sm:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-y border-border/50 bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
            Why institutes choose VK Academy
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-border bg-background p-8 transition hover:border-primary/50 hover:shadow-lg"
              >
                <benefit.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything you need</h2>
          <p className="mt-3 text-muted-foreground">
            No bloat. No complexity. Just the tools that matter.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 rounded-lg border border-border/50 bg-card p-6 transition hover:border-primary/50 hover:bg-card/80"
            >
              <feature.icon className="h-6 w-6 flex-shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-t border-border/50 bg-primary/5">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold">Built for real institutes.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Trusted by coaching centers. Scaled for growth. Ready for tomorrow.
          </p>
          <Button asChild size="lg" className="mt-8 gap-2">
            <Link to="/app">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-primary/10 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Ready to stop wasting time on admin?
          </p>
          <p className="mt-2 text-2xl font-bold">Join us today.</p>
          <Button asChild size="lg" className="mt-6 gap-2 bg-primary">
            <Link to="/app">
              Open VK Academy <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} VK Academy</span>
          <span className="text-xs">Built for institutes, by people who care.</span>
        </div>
      </footer>
    </div>
  );
}
