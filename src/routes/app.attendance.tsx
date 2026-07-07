import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { batchList, students } from "@/lib/mock/data";

export const Route = createFileRoute("/app/attendance")({
  component: AttendancePage,
});

type Status = "P" | "A" | "L";

function AttendancePage() {
  const [batchId, setBatchId] = useState(batchList[0].id);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const batch = batchList.find((b) => b.id === batchId)!;
  const roster = useMemo(() => students.filter((s) => s.batch === batch.name).slice(0, 20), [batch.name]);
  const [marks, setMarks] = useState<Record<string, Status>>({});

  useEffect(() => setMarks({}), [batchId, date]);

  const setAll = (v: Status) => setMarks(Object.fromEntries(roster.map((s) => [s.id, v])));
  const counts = { P: 0, A: 0, L: 0 } as Record<Status, number>;
  roster.forEach((s) => { const v = marks[s.id]; if (v) counts[v]++; });
  const unmarked = roster.length - counts.P - counts.A - counts.L;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Fast marking. Press P / A / L on your keyboard while a row is focused."
        actions={<Button size="sm">Save attendance</Button>}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>{batchList.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[170px]" />
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <Chip label={`Present ${counts.P}`} tone="success" />
            <Chip label={`Absent ${counts.A}`} tone="danger" />
            <Chip label={`Late ${counts.L}`} tone="warning" />
            <Chip label={`Unmarked ${unmarked}`} tone="muted" />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAll("P")}>Mark all present</Button>
          <Button size="sm" variant="outline" onClick={() => setMarks({})}>Clear</Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Admission #</th><th className="px-4 py-3 text-right">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roster.map((s) => {
                const cur = marks[s.id];
                return (
                  <tr key={s.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      const key = e.key.toUpperCase();
                      if (key === "P" || key === "A" || key === "L") {
                        e.preventDefault();
                        setMarks((m) => ({ ...m, [s.id]: key as Status }));
                      }
                    }}
                    className="outline-none focus:bg-accent/40">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.admissionNo}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {(["P", "A", "L"] as const).map((k) => (
                          <button key={k}
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: k }))}
                            className={`h-7 w-7 rounded-md border text-xs font-semibold transition-colors ${cur === k
                              ? k === "P" ? "border-success bg-success text-success-foreground"
                                : k === "A" ? "border-destructive bg-destructive text-destructive-foreground"
                                : "border-warning bg-warning text-warning-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                            {k}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageBody>
    </>
  );
}

function Chip({ label, tone }: { label: string; tone: "success" | "danger" | "warning" | "muted" }) {
  const map = {
    success: "bg-success/10 text-success", danger: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning", muted: "bg-muted text-muted-foreground",
  } as const;
  return <span className={`rounded-md px-2 py-1 font-medium ${map[tone]}`}>{label}</span>;
}