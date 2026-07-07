import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { tests, students } from "@/lib/mock/data";

export const Route = createFileRoute("/app/tests/$id")({
  loader: ({ params }) => {
    const test = tests.find((t) => t.id === params.id);
    if (!test) throw notFound();
    return { test };
  },
  errorComponent: () => <Fallback />,
  notFoundComponent: () => <Fallback />,
  component: TestDetail,
});

function Fallback() { return <PageBody><p className="text-sm text-muted-foreground">Test not found.</p></PageBody>; }

function TestDetail() {
  const { test } = Route.useLoaderData();
  const results = students.slice(0, 12).map((s, i) => ({
    ...s,
    marks: Math.max(20, Math.min(test.maxMarks, Math.round(test.avgScore * (test.maxMarks / 100) + (i - 6) * 8))),
  })).sort((a, b) => b.marks - a.marks);
  const dist = [
    { range: "0-25%", count: 1 }, { range: "25-50%", count: 3 },
    { range: "50-75%", count: 6 }, { range: "75-100%", count: 2 },
  ];

  return (
    <>
      <PageHeader
        title={test.title}
        description={`${test.subject} · ${test.batch} · ${test.date} · Max ${test.maxMarks}`}
        actions={<Button asChild variant="ghost" size="sm" className="gap-1.5"><Link to="/app/tests"><ArrowLeft className="h-4 w-4" />Back</Link></Button>}
      />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Ranks</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3">Percentile</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r, i) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">{r.marks}/{test.maxMarks}</td>
                    <td className="px-4 py-3 text-muted-foreground">{Math.max(1, 100 - Math.round((i / results.length) * 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Score distribution</h3></div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dist}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="range" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}