import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Grid3x3, List, Plus, Search, Users } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { batchList } from "@/lib/mock/data";

export const Route = createFileRoute("/app/batches")({
  component: BatchesPage,
});

function BatchesPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");
  const rows = batchList.filter((b) => (`${b.name} ${b.faculty}`).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Batches"
        description={`${rows.length} active batches`}
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />New batch</Button>}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search batches or faculty" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pl-9" />
          </div>
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("grid")}><Grid3x3 className="h-4 w-4" /></Button>
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((b) => (
              <Link key={b.id} to="/app/batches/$id" params={{ id: b.id }} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{b.name}</h3>
                  <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">{b.classroom}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{b.faculty}</p>
                <p className="mt-3 text-xs text-muted-foreground">{b.timing}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" />{b.strength}/{b.capacity}</span>
                  <span className={b.attendancePct >= 85 ? "text-success" : "text-warning"}>{b.attendancePct}%</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Batch</th><th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Timing</th><th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Strength</th><th className="px-4 py-3">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium"><Link to="/app/batches/$id" params={{ id: b.id }}>{b.name}</Link></td>
                    <td className="px-4 py-3">{b.faculty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.timing}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.classroom}</td>
                    <td className="px-4 py-3">{b.strength}/{b.capacity}</td>
                    <td className="px-4 py-3">{b.attendancePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </>
  );
}