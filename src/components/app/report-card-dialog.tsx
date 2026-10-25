import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
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
import { openWhatsApp, parentPhone } from "@/lib/whatsapp";

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
        .select("name, phone")
        .eq("id", iid as string)
        .maybeSingle();
      return data;
    },
  });

  const { data: card, isLoading } = useQuery({
    queryKey: ["report-card", bid, studentId],
    enabled: open && Boolean(bid && studentId),
    queryFn: async () => {
      const [{ data: tests, error: e1 }, { data: res, error: e2 }, { data: stu }] =
        await Promise.all([
          supabase
            .from("tests")
            .select("id, title, subject, type, date, max_marks")
            .eq("batch_id", bid)
            .order("date"),
          supabase.from("test_results").select("test_id, marks").eq("student_id", studentId),
          supabase
            .from("students")
            .select("full_name, father_phone, parent_phone, mother_phone, phone")
            .eq("id", studentId)
            .maybeSingle(),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const m = new Map((res ?? []).map((r) => [r.test_id, r.marks]));
      const rows = (tests ?? []).map((t) => ({ ...t, marks: m.get(t.id) ?? null }));
      return { rows, student: stu };
    },
  });

  const scored = useMemo(() => (card?.rows ?? []).filter((r) => r.marks != null), [card]);
  const got = scored.reduce((s, r) => s + Number(r.marks), 0);
  const max = scored.reduce((s, r) => s + Number(r.max_marks), 0);
  const pct = max > 0 ? ((got / max) * 100).toFixed(1) : null;
  const batchName = batches.find((b) => b.id === bid)?.name ?? "";

  function send() {
    if (!card?.student) return;
    const lines = scored.map(
      (r) =>
        `• ${r.subject || r.title} (${examLabel(r.type)}): ${r.marks}/${r.max_marks} — ${((Number(r.marks) / r.max_marks) * 100).toFixed(0)}%`,
    );
    const msg = [
      `*${institute?.name ?? "Report Card"}* — Report Card`,
      `Student: *${card.student.full_name}*`,
      `Batch: ${batchName}`,
      "",
      ...lines,
      "",
      `*Total: ${got}/${max}${pct ? ` (${pct}%)` : ""}*`,
      institute?.phone ? `\nFor queries: ${institute.phone}` : "",
    ].join("\n");
    if (!openWhatsApp(parentPhone(card.student), msg)) toast.error("No parent phone number saved");
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
        </div>

        {studentId && (
          <div className="mt-2 rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4 text-center">
              <p className="text-base font-semibold">{institute?.name}</p>
              <p className="text-sm text-muted-foreground">
                {card?.student?.full_name} · {batchName}
              </p>
            </div>
            {isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (card?.rows.length ?? 0) === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No tests in this batch yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Subject / Test</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Marks</th>
                    <th className="px-4 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {card!.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 font-medium">{r.subject || r.title}</td>
                      <td className="px-4 py-2 text-muted-foreground">{examLabel(r.type)}</td>
                      <td className="px-4 py-2 text-right">
                        {r.marks != null ? `${r.marks}/${r.max_marks}` : "Not entered"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {r.marks != null
                          ? `${((Number(r.marks) / r.max_marks) * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-semibold">
                    <td className="px-4 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-2 text-right">
                      {got}/{max}
                    </td>
                    <td className="px-4 py-2 text-right">{pct ? `${pct}%` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            )}
            <div className="flex justify-end border-t border-border p-3">
              <Button size="sm" className="gap-1.5" onClick={send} disabled={!scored.length}>
                <MessageCircle className="h-4 w-4" />
                Send on WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
