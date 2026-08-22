import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Save, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { myBatches, myFaculty } from "@/lib/api/teach";
import { attendanceApi, batchesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Search = { batch?: string };

export const Route = createFileRoute("/teach/attendance")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    batch: typeof s.batch === "string" ? s.batch : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mark Attendance — Teacher Portal" },
      { name: "description", content: "Tap present or absent for your batch and save." },
      { property: "og:title", content: "Mark Attendance — Teacher Portal" },
      { property: "og:description", content: "Fast attendance marking on mobile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachAttendance,
});

function TeachAttendance() {
  const { batch: batchParam } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [batchId, setBatchId] = useState<string>(batchParam ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});

  const { data: faculty } = useQuery({
    queryKey: ["my-faculty", user?.id],
    queryFn: () => myFaculty(user?.id, user?.email),
    enabled: Boolean(user),
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["my-batches", faculty?.id],
    queryFn: () => myBatches(faculty!.id),
    enabled: Boolean(faculty?.id),
  });
  useEffect(() => {
    if (!batchId && batches[0]) setBatchId(batches[0].id);
  }, [batches, batchId]);

  const { data: roster = [] } = useQuery({
    queryKey: ["teach-roster", batchId],
    queryFn: () => batchesApi.roster(batchId),
    enabled: Boolean(batchId),
  });
  const { data: existing = [] } = useQuery({
    queryKey: ["teach-att", batchId, date],
    queryFn: () => attendanceApi.listForBatchDate(batchId, date),
    enabled: Boolean(batchId),
  });

  const initial = useMemo(() => {
    const m: Record<string, "present" | "absent"> = {};
    existing.forEach((a) => {
      m[a.student_id] = a.status === "absent" ? "absent" : "present";
    });
    return m;
  }, [existing]);
  const merged = { ...initial, ...marks };

  const save = useMutation({
    mutationFn: async () => {
      const rows = roster.map((s) => ({
        student_id: s.id,
        batch_id: batchId,
        date,
        status: (merged[s.id] ?? "present") as "present" | "absent",
        marked_by: user?.id ?? null,
      }));
      await attendanceApi.upsertMany(rows);
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["teach-att", batchId, date] });
      setMarks({});
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const presentCount = roster.filter((s) => (merged[s.id] ?? "present") === "present").length;

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Mark attendance</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger className="h-9 w-full sm:w-[190px]">
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
        <Input
          type="date"
          className="h-9 w-full sm:w-[160px]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          className="ml-auto gap-1.5"
          disabled={!batchId || roster.length === 0 || save.isPending}
          onClick={() => save.mutate()}
        >
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {roster.length} students · {presentCount} present · {roster.length - presentCount} absent
      </p>

      <div className="mt-3 space-y-2">
        {roster.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {batches.length === 0
              ? "No batches assigned to you in the timetable yet."
              : "No students in this batch yet."}
          </p>
        )}
        {roster.map((s) => {
          const st = merged[s.id] ?? "present";
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">{s.admission_no}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant={st === "present" ? "default" : "outline"}
                  onClick={() => setMarks((m) => ({ ...m, [s.id]: "present" }))}
                  title="Present"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={st === "absent" ? "destructive" : "outline"}
                  onClick={() => setMarks((m) => ({ ...m, [s.id]: "absent" }))}
                  title="Absent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
