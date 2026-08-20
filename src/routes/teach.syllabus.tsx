import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Play } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { myBatches, myFaculty } from "@/lib/api/teach";
import {
  groupBySubject,
  overallPct,
  syllabusApi,
  type Chapter,
  type ChapterStatus,
} from "@/lib/api/syllabus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/teach/syllabus")({
  validateSearch: (s: Record<string, unknown>) => ({
    batch: typeof s.batch === "string" ? s.batch : undefined,
    subject: typeof s.subject === "string" ? s.subject : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Syllabus — Teacher Portal" },
      {
        name: "description",
        content: "Mark the chapter you are teaching today and tick it off when it is finished.",
      },
      { property: "og:title", content: "My Syllabus — Teacher Portal" },
      { property: "og:description", content: "One tap chapter progress from your phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachSyllabus,
});

function TeachSyllabus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = useSearch({ from: "/teach/syllabus" });
  const [batchId, setBatchId] = useState(search.batch ?? "");
  const [note, setNote] = useState("");

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

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ["syllabus", batchId],
    queryFn: () => syllabusApi.chapters(batchId),
    enabled: Boolean(batchId),
  });

  const groups = useMemo(() => {
    const all = groupBySubject(chapters);
    return search.subject ? all.filter((g) => g.subject === search.subject) : all;
  }, [chapters, search.subject]);

  const setStatus = useMutation({
    mutationFn: ({ chapter, status }: { chapter: Chapter; status: ChapterStatus }) =>
      syllabusApi.setStatus(chapter, status, { facultyId: faculty?.id ?? null, note }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "done" ? "Chapter marked done" : "Marked as currently teaching");
      setNote("");
      qc.invalidateQueries({ queryKey: ["syllabus"] });
      qc.invalidateQueries({ queryKey: ["syllabus-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold">My syllabus</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap a chapter to mark what you are teaching now, and tick it when it is finished.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger className="h-9 w-full sm:w-[240px]">
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
        {chapters.length > 0 && (
          <span className="text-sm text-muted-foreground">{overallPct(chapters)}% covered</span>
        )}
      </div>

      <Input
        className="mt-3 h-9"
        placeholder="Today's topic (optional) — e.g. Ray optics: mirrors"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="mt-4 space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !faculty && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Your teacher record isn't linked to this login yet.
          </p>
        )}
        {!isLoading && faculty && groups.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            The office hasn't added a chapter list for this batch yet.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.subject} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold">{g.subject}</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {g.done}/{g.total} · {g.pct}%
              </span>
            </div>
            <ul className="divide-y divide-border">
              {g.chapters.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${c.status === "done" ? "text-muted-foreground line-through" : ""}`}
                    >
                      {c.title}
                    </p>
                    {c.status === "in_progress" && (
                      <p className="text-xs text-primary">Currently teaching</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={c.status === "in_progress" ? "default" : "outline"}
                    className="h-8 gap-1 px-2 text-xs"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ chapter: c, status: "in_progress" })}
                  >
                    <Play className="h-3.5 w-3.5" /> Teaching
                  </Button>
                  <Button
                    size="sm"
                    variant={c.status === "done" ? "default" : "outline"}
                    className="h-8 gap-1 px-2 text-xs"
                    disabled={setStatus.isPending}
                    onClick={() =>
                      setStatus.mutate({
                        chapter: c,
                        status: c.status === "done" ? "in_progress" : "done",
                      })
                    }
                  >
                    <Check className="h-3.5 w-3.5" /> Done
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}