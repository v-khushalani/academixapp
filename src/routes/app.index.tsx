import { createFileRoute } from "@tanstack/react-router";
import {
  Users, CalendarCheck, Wallet, AlertCircle, Presentation, Layers, FileText, UserPlus,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import {
  dashboardKpis, revenueTrend, attendanceTrend, admissionsTrend, activities, tasks,
} from "@/lib/mock/data";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything happening at VK Academy — glanceable in 5 seconds."
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Students" value={dashboardKpis.totalStudents} icon={Users} />
          <KpiCard label="Today's Attendance" value={`${dashboardKpis.todayAttendance}%`} icon={CalendarCheck} tone="success" />
          <KpiCard label="Today's Revenue" value={inr(dashboardKpis.todayRevenue)} icon={Wallet} />
          <KpiCard label="Pending Fees" value={inr(dashboardKpis.pendingFees)} icon={AlertCircle} tone="warning" />
          <KpiCard label="Today's Lectures" value={dashboardKpis.todayLectures} icon={Presentation} />
          <KpiCard label="Active Batches" value={dashboardKpis.activeBatches} icon={Layers} />
          <KpiCard label="Upcoming Tests" value={dashboardKpis.upcomingTests} icon={FileText} />
          <KpiCard label="Recent Admissions" value={dashboardKpis.recentAdmissions} icon={UserPlus} tone="success" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ChartCard title="Monthly Revenue" subtitle="Last 12 months" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Attendance Trend" subtitle="Last 14 days">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={attendanceTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[60, 100]} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                <Area type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2} fill="url(#att)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ChartCard title="Admissions" subtitle="Monthly count">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={admissionsTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold">Latest Activities</h3>
            </div>
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 p-4">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold">Upcoming Tasks</h3>
            </div>
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <p className="text-sm text-foreground">{t.text}</p>
                  <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">{t.due}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function ChartCard({
  title, subtitle, className, children,
}: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border border-border bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}