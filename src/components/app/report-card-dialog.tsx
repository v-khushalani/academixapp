import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { batchesApi } from "@/lib/api";
import { examLabel } from "@/lib/exam-types";
import { openWhatsApp, preferredParentPhone } from "@/lib/whatsapp";
import { buildReportCardPdf, grade } from "@/lib/report-card-pdf";

type Batch = { id: string; name: string };

export function ReportCardDialog({
  open,
  onOpenChange,
  batches,
  initialBatchId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  batches: Batch[];
  initialBatchId?: string | null;
}) {
  const [batchId, setBatchId] = useState<string>(initialBatchId ?? "");
  const [studentId, setStudentId] = useState<string>("");
  const bid = batchId || initialBatchId || "";

  const { data: roster = [] } = useQuery({
    queryKey: ["test-roster", bid],
    queryFn: () => batchesApi.roster(bid),
    enabled: open && Boolean(bid),
  });

  const { data: institute } = useQuery({
    queryKey: ["report-institute"],
    enabled: open,
    queryFn: async () => {
      const { data: iid } = await supabase.rpc("current_institute_id");
      if (!iid) return null;
      const { data } = await supabase
        .from("institutes")
        .select("name, phone, address, email, logo_url, primary_color, tagline")
        .eq("id", iid as string)
        .maybeSingle();
      return data;
    },
  });

  const [examType, setExamType] = useState<string>("");
  const { data: batchTypes = [] } = useQuery({
    queryKey: ["report-types", bid],
    enabled: open && Boolean(bid),
    queryFn: async () => {
      const { data } = await supabase.from("tests").select("type, date").eq("batch_id", bid).order("date");
      return Array.from(new Set((data ?? []).map((t) => t.type as string)));
    },
  });
  const et = examType || batchTypes[batchTypes.length - 1] || "";

  const { data: card, isLoading } = useQuery({
    queryKey: ["report-card", bid, studentId, et],
    enabled: open && Boolean(bid && studentId && et),
    queryFn: async () => {
      const [{ data: tests, error: e1 }, { data: res, error: e2 }, { data: stu }] =
        await Promise.all([
          supabase
            .from("tests")
            .select("id, title, subject, type, date, max_marks")
            .eq("batch_id", bid)
            .eq("type", et as never)
            .order("subject"),
          supabase.from("test_results").select("test_id, marks").eq("student_id", studentId),
          supabase
            .from("students")
            .select("full_name, admission_no, class, preferred_contact, father_phone, parent_phone, mother_phone, phone")
            .eq("id", studentId)
            .maybeSingle(),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const m = new Map((res ?? []).map((r) => [r.test_id, r.marks]));
      const rows = (tests ?? []).map((t) => ({ ...t, marks: m.get(t.id) ?? null }));
      // rank in batch by overall % across these tests
      let rank: number | null = null;
      let outOf = 0;
      const ids = (tests ?? []).map((t) => t.id);
      if (ids.length) {
        const { data: all } = await supabase
          .from("test_results")
          .select("test_id, student_id, marks")
          .in("test_id", ids);
        const maxBy = new Map((tests ?? []).map((t) => [t.id, t.max_marks]));
        const agg = new Map<string, { g: number; m: number }>();
        for (const r of all ?? []) {
          if (r.marks == null) continue;
          const a = agg.get(r.student_id) ?? { g: 0, m: 0 };
          a.g += Number(r.marks);
          a.m += Number(maxBy.get(r.test_id) ?? 0);
          agg.set(r.student_id, a);
        }
        const pcts = [...agg.entries()].map(([sid, a]) => [sid, a.m ? a.g / a.m : 0] as const);
        pcts.sort((a, b) => b[1] - a[1]);
        outOf = pcts.length;
        const mine = agg.get(studentId);
        if (mine) {
          const p = mine.m ? mine.g / mine.m : 0;
          rank = pcts.filter(([, x]) => x > p).length + 1;
        }
      }
      return { rows, student: stu, rank, outOf };
    },
  });

  const scored = useMemo(() => (card?.rows ?? []).filter((r) => r.marks != null), [card]);
  const got = scored.reduce((s, r) => s + Number(r.marks), 0);
  const max = scored.reduce((s, r) => s + Number(r.max_marks), 0);
  const pct = max > 0 ? ((got / max) * 100).toFixed(1) : null;
  const batchName = batches.find((b) => b.id === bid)?.name ?? "";

  const [busy, setBusy] = useState(false);

  async function makePdf() {
    if (!card?.student || !institute) return null;
    const blob = await buildReportCardPdf({
      institute,
      student: card.student,
      batchName,
      examName: examLabel(et),
      rows: card.rows,
      rank: card.rank,
      outOf: card.outOf,
    });
    const name = `Report-${examLabel(et).replace(/\s+/g, "-")}-${card.student.full_name.replace(/\s+/g, "-")}.pdf`;
    return new File([blob], name, { type: "application/pdf" });
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function onDownload() {
    setBusy(true);
    try {
      const f = await makePdf();
      if (f) download(f);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!card?.student) return;
    setBusy(true);
    try {
      const file = await makePdf();
      if (!file) return;
      const phone = preferredParentPhone(card.student);
      const msg = `Dear Parent,\n\nPlease find the report card of *${card.student.full_name}* (${batchName}).\nOverall: ${got}/${max}${pct ? ` (${pct}%)` : ""}${card.rank ? ` · Rank ${card.rank}` : ""}\n\n${institute?.name ?? ""}${institute?.phone ? `\n${institute.phone}` : ""}`;
      download(file);
      if (!openWhatsApp(phone, msg)) {
        toast.error("No parent phone number saved");
        return;
      }
      toast.success("PDF downloaded — attach it in the WhatsApp chat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student report card</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Select
              value={bid}
              onValueChange={(v) => {
                setBatchId(v);
                setStudentId("");
                setExamType("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!bid}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Exam</Label>
            <Select value={et} onValueChange={setExamType} disabled={!batchTypes.length}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {batchTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {examLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {studentId && (
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
            <div className="bg-primary p-4 text-center text-primary-foreground">
              <p className="text-base font-bold tracking-wide">{institute?.name}</p>
              <p className="text-xs uppercase tracking-[0.2em] opacity-90">
                {examLabel(et)} · Report card
              </p>
            </div>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
              <span className="font-semibold">{card?.student?.full_name}</span>
              <span className="text-muted-foreground">{batchName}</span>
            </div>
            {isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (card?.rows.length ?? 0) === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No tests for this exam yet.
              </p>
            ) : (
              <>
              <div className="grid grid-cols-4 gap-2 p-3">
                {[
                  ["Total", `${got}/${max}`],
                  ["Percent", pct ? `${pct}%` : "—"],
                  ["Grade", pct ? grade(Number(pct)) : "—"],
                  ["Rank", card?.rank ? `${card.rank}/${card.outOf}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
                    <p className="text-sm font-bold text-primary">{v}</p>
                  </div>
                ))}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2 text-right">Marks</th>
                    <th className="px-4 py-2 text-right">%</th>
                    <th className="px-4 py-2 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {card!.rows.map((r) => {
                    const p = r.marks != null ? (Number(r.marks) / r.max_marks) * 100 : null;
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-medium">{r.subject || r.title}</td>
                        <td className="px-4 py-2 text-right">
                          {r.marks != null ? `${r.marks}/${r.max_marks}` : "Not entered"}
                        </td>
                        <td className="px-4 py-2 text-right">{p != null ? `${p.toFixed(0)}%` : "—"}</td>
                        <td className="px-4 py-2 text-right font-semibold">{p != null ? grade(p) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
            <div className="flex justify-end border-t border-border p-3">
              <Button size="sm" variant="outline" className="mr-2 gap-1.5" onClick={onDownload} disabled={!scored.length || busy}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button size="sm" className="gap-1.5" onClick={send} disabled={!scored.length || busy}>
                <MessageCircle className="h-4 w-4" />
                Send PDF on WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
