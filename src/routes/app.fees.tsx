import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Download, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/app/kpi-card";
import { fees, revenueTrend } from "@/lib/mock/data";

export const Route = createFileRoute("/app/fees")({
  component: FeesPage,
});

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function FeesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => fees.filter((f) => {
    if (status !== "all" && f.status !== status) return false;
    return `${f.studentName} ${f.batch}`.toLowerCase().includes(q.toLowerCase());
  }), [q, status]);

  const outstanding = fees.reduce((a, b) => a + (b.amount - b.paid), 0);
  const collected = fees.reduce((a, b) => a + b.paid, 0);
  const overdueCount = fees.filter((f) => f.status === "overdue").length;

  return (
    <>
      <PageHeader
        title="Fees"
        description="Collect faster. Chase smarter."
        actions={<>
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Export</Button>
          <Button size="sm">Record payment</Button>
        </>}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Outstanding" value={inr(outstanding)} icon={Wallet} tone="warning" />
          <KpiCard label="Collected (Year)" value={inr(collected)} icon={Wallet} tone="success" />
          <KpiCard label="Overdue students" value={overdueCount} icon={Bell} tone="danger" />
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold">Monthly Collection</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueTrend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input placeholder="Search by student or batch" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th><th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Amount</th><th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 30).map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{f.studentName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.batch}</td>
                    <td className="px-4 py-3">{inr(f.amount)}</td>
                    <td className="px-4 py-3">{inr(f.paid)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.dueDate}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={
                        f.status === "paid" ? "bg-success/10 text-success"
                          : f.status === "partial" ? "bg-warning/10 text-warning"
                          : f.status === "overdue" ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }>{f.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="gap-1.5"><Bell className="h-4 w-4" />Remind</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </>
  );
}