import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download, FileText } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { feesApi, studentsApi, attendanceApi, batchesApi } from "@/lib/api";
import { exportCSV, exportPDF, type Column } from "@/lib/exporters";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function ReportsPage() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Revenue, attendance and admissions with export."
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" className="h-9 w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" className="h-9 w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-4 w-4" /> Filters apply to all reports below
          </div>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="fees">Fee report</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <RevenueReport from={from} to={to} />
          </TabsContent>
          <TabsContent value="fees" className="mt-4">
            <FeeReport from={from} to={to} />
          </TabsContent>
          <TabsContent value="attendance" className="mt-4">
            <AttendanceReport from={from} to={to} />
          </TabsContent>
          <TabsContent value="admissions" className="mt-4">
            <AdmissionsReport from={from} to={to} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function ExportButtons<T>({ rows, cols, name, title }: { rows: T[]; cols: Column<T>[]; name: string; title: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" />Export</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(name, rows, cols)}><FileText className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(name, title, rows, cols)}><FileText className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function RevenueReport({ from, to }: { from: string; to: string }) {
  const { data = [] } = useQuery({
    queryKey: ["report-revenue", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("fees").select("paid_date, amount_paid, method")
        .gte("paid_date", from).lte("paid_date", to).gt("amount_paid", 0);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = data.reduce((s, r) => s + Number(r.amount_paid), 0);
  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((r) => { const k = r.method || "other"; m[k] = (m[k] ?? 0) + Number(r.amount_paid); });
    return Object.entries(m).map(([method, amount]) => ({ id: method, method, amount }));
  }, [data]);

  const cols: Column<typeof byMethod[number]>[] = [
    { key: "method", label: "Method" },
    { key: "amount", label: "Amount (INR)" },
  ];

  return (
    <Section
      title={`Revenue ${from} → ${to} · Total ${inr(total)}`}
      actions={<ExportButtons rows={byMethod} cols={cols} name={`revenue-${from}-${to}`} title="Revenue" />}
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {byMethod.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No revenue in this period.</td></tr>}
          {byMethod.map((r) => (
            <tr key={r.method}><td className="px-4 py-3 capitalize">{r.method}</td><td className="px-4 py-3">{inr(r.amount)}</td></tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function FeeReport({ from, to }: { from: string; to: string }) {
  const { data = [] } = useQuery({ queryKey: ["fees"], queryFn: () => feesApi.list() });
  const filtered = data.filter((f) => {
    const d = f.due_date ?? f.paid_date;
    return !d || (d >= from && d <= to);
  });
  const rows = filtered.map((f) => ({
    id: f.id,
    student: f.student?.full_name ?? "",
    admission_no: f.student?.admission_no ?? "",
    description: f.description ?? "",
    amount: Number(f.amount),
    paid: Number(f.amount_paid),
    due: Number(f.amount) - Number(f.amount_paid),
    status: f.status,
    due_date: f.due_date ?? "",
  }));
  const cols: Column<typeof rows[number]>[] = [
    { key: "student", label: "Student" }, { key: "admission_no", label: "Admission #" },
    { key: "description", label: "For" }, { key: "amount", label: "Amount" },
    { key: "paid", label: "Paid" }, { key: "due", label: "Due" },
    { key: "status", label: "Status" }, { key: "due_date", label: "Due date" },
  ];
  return (
    <Section title={`Fee report · ${rows.length} entries`}
      actions={<ExportButtons rows={rows} cols={cols} name={`fees-${from}-${to}`} title="Fees" />}>
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>{cols.map((c) => <th key={c.key as string} className="px-4 py-3">{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.student}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.admission_no}</td>
                <td className="px-4 py-3">{r.description || "—"}</td>
                <td className="px-4 py-3">{inr(r.amount)}</td>
                <td className="px-4 py-3">{inr(r.paid)}</td>
                <td className="px-4 py-3">{inr(r.due)}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.due_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function AttendanceReport({ from, to }: { from: string; to: string }) {
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => studentsApi.list() });
  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list() });
  const { data: attendance = [] } = useQuery({
    queryKey: ["report-attendance", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("student_id, status")
        .gte("date", from).lte("date", to);
      if (error) throw error; return data ?? [];
    },
  });

  const perStudent = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number; total: number }>();
    attendance.forEach((a) => {
      const s = map.get(a.student_id) ?? { present: 0, absent: 0, late: 0, total: 0 };
      s.total += 1;
      if (a.status === "present") s.present += 1;
      else if (a.status === "absent") s.absent += 1;
      else if (a.status === "late") s.late += 1;
      map.set(a.student_id, s);
    });
    return students.map((s) => {
      const st = map.get(s.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
      const pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : 0;
      return {
        id: s.id,
        student: s.full_name,
        admission_no: s.admission_no,
        batch: batches.find((b) => b.id === s.batch_id)?.name ?? "",
        present: st.present, absent: st.absent, late: st.late, total: st.total, pct,
      };
    });
  }, [students, batches, attendance]);

  const cols: Column<typeof perStudent[number]>[] = [
    { key: "student", label: "Student" }, { key: "admission_no", label: "Admission #" },
    { key: "batch", label: "Batch" }, { key: "present", label: "Present" },
    { key: "absent", label: "Absent" }, { key: "late", label: "Late" },
    { key: "total", label: "Total" }, { key: "pct", label: "%" },
  ];

  return (
    <Section title={`Attendance ${from} → ${to}`}
      actions={<ExportButtons rows={perStudent} cols={cols} name={`attendance-${from}-${to}`} title="Attendance" />}>
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>{cols.map((c) => <th key={c.key as string} className="px-4 py-3">{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {perStudent.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.student}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.admission_no}</td>
                <td className="px-4 py-3">{r.batch || "—"}</td>
                <td className="px-4 py-3">{r.present}</td>
                <td className="px-4 py-3">{r.absent}</td>
                <td className="px-4 py-3">{r.late}</td>
                <td className="px-4 py-3">{r.total}</td>
                <td className={`px-4 py-3 ${r.pct >= 85 ? "text-success" : r.pct >= 70 ? "" : "text-warning"}`}>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function AdmissionsReport({ from, to }: { from: string; to: string }) {
  const { data = [] } = useQuery({
    queryKey: ["report-admissions", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name, admission_no, admission_date, class, status")
        .gte("admission_date", from).lte("admission_date", to).order("admission_date", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const cols: Column<typeof data[number]>[] = [
    { key: "full_name", label: "Student" }, { key: "admission_no", label: "Admission #" },
    { key: "class", label: "Class" }, { key: "admission_date", label: "Admission date" },
    { key: "status", label: "Status" },
  ];
  return (
    <Section title={`Admissions ${from} → ${to} · ${data.length} students`}
      actions={<ExportButtons rows={data} cols={cols} name={`admissions-${from}-${to}`} title="Admissions" />}>
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>{cols.map((c) => <th key={c.key as string} className="px-4 py-3">{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.admission_no}</td>
                <td className="px-4 py-3">{r.class ?? "—"}</td>
                <td className="px-4 py-3">{r.admission_date}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}