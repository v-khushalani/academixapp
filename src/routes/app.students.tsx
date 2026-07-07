import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Filter, Search, Phone, MessageCircle } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { students } from "@/lib/mock/data";

export const Route = createFileRoute("/app/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (cls !== "all" && s.class !== cls) return false;
      if (status !== "all" && s.status !== status) return false;
      if (q && !(`${s.name} ${s.admissionNo} ${s.batch}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [q, cls, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  const classes = Array.from(new Set(students.map((s) => s.class)));

  return (
    <>
      <PageHeader
        title="Students"
        description={`${filtered.length} of ${students.length} students`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Export</Button>
            <Button size="sm">Add student</Button>
          </>
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, admission no, batch…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 pl-9" />
          </div>
          <Select value={cls} onValueChange={(v) => { setCls(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />More</Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Admission #</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Pending Fees</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to="/app/students/$id" params={{ id: s.id }} className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">
                          {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.school}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.admissionNo}</td>
                    <td className="px-4 py-3">{s.batch}</td>
                    <td className="px-4 py-3">
                      <span className={s.attendancePct >= 85 ? "text-success" : s.attendancePct >= 75 ? "text-foreground" : "text-warning"}>
                        {s.attendancePct}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.pendingFees === 0 ? <span className="text-muted-foreground">—</span> : <span className="text-destructive">₹{s.pendingFees.toLocaleString("en-IN")}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "active" ? "secondary" : "outline"} className={s.status === "active" ? "bg-success/10 text-success" : ""}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label="Call"><Phone className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">No students match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Page {page} of {pageCount}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}