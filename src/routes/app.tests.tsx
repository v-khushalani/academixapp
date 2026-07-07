import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tests } from "@/lib/mock/data";

export const Route = createFileRoute("/app/tests")({
  component: TestsPage,
});

function TestsPage() {
  return (
    <>
      <PageHeader
        title="Tests"
        description={`${tests.length} tests · ${tests.filter((t) => t.status === "completed").length} completed`}
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Create test</Button>}
      />
      <PageBody>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Test</th><th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Subject</th><th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Avg</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/app/tests/$id" params={{ id: t.id }} className="hover:text-primary">{t.title}</Link>
                  </td>
                  <td className="px-4 py-3 uppercase text-muted-foreground">{t.type}</td>
                  <td className="px-4 py-3">{t.subject}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.batch}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                  <td className="px-4 py-3">{t.status === "completed" ? `${t.avgScore}%` : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={t.status === "completed" ? "bg-success/10 text-success" : "bg-accent text-primary"}>
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>
    </>
  );
}