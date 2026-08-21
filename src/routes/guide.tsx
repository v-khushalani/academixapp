import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer, ChevronDown } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui/button";
import { GUIDE_SECTIONS } from "@/lib/guide-content";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Academix Operating Guide — Setup to Daily Use" },
      {
        name: "description",
        content:
          "Step-by-step guide for coaching institutes on Academix: platform setup, onboarding, faculty, students, fees, attendance, exams and WhatsApp.",
      },
      { property: "og:title", content: "Academix Operating Guide" },
      {
        property: "og:description",
        content:
          "A complete checklist for running a coaching institute on Academix — from first login to the daily routine.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <header className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Training manual
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Academix operating guide
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Everything from platform setup to the daily routine — written as a checklist for
            non-technical institute owners, teachers and front-desk staff.
          </p>
          <div className="mt-5 print:hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </header>

        <div className="mt-10 gap-10 lg:flex lg:items-start">
          {/* Table of contents */}
          <nav className="mb-8 lg:sticky lg:top-24 lg:mb-0 lg:w-64 lg:shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              aria-expanded={tocOpen}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium lg:hidden"
            >
              Contents
              <ChevronDown
                className={`h-4 w-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}
              />
            </button>
            <ol
              className={`${tocOpen ? "block" : "hidden"} mt-2 space-y-1 lg:mt-0 lg:block`}
            >
              {GUIDE_SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => setTocOpen(false)}
                    className="flex gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="tabular-nums opacity-60">{i + 1}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-12">
            {GUIDE_SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                {s.intro ? (
                  <p className="mt-2 text-sm text-muted-foreground">{s.intro}</p>
                ) : null}

                <div className="mt-5 space-y-5">
                  {s.blocks.map((b, bi) =>
                    "table" in b ? (
                      <div
                        key={bi}
                        className="overflow-x-auto rounded-lg border border-border bg-card"
                      >
                        <table className="w-full min-w-[420px] text-sm">
                          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              {b.table.head.map((h) => (
                                <th key={h} className="px-4 py-2.5 font-medium">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {b.table.rows.map((r) => (
                              <tr key={r.join("|")} className="border-t border-border">
                                {r.map((c, ci) => (
                                  <td
                                    key={ci}
                                    className={
                                      ci === 0 ? "px-4 py-2.5 font-medium" : "px-4 py-2.5"
                                    }
                                  >
                                    {c}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div key={bi}>
                        {b.heading ? (
                          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {b.heading}
                          </h3>
                        ) : null}
                        <ul className={b.heading ? "mt-2 space-y-1.5" : "space-y-1.5"}>
                          {b.items.map((it) => (
                            <li key={it} className="flex gap-2.5 text-sm leading-relaxed">
                              <span
                                aria-hidden
                                className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                              />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
