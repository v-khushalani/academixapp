import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Copy, Plus, Trash2 } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { SyllabusBars } from "@/components/app/syllabus-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field as F } from "@/components/app/field";
import { batchesApi } from "@/lib/api";
import {
  groupBySubject,
  overallPct,
  syllabusApi,
  STATUS_LABEL,
  type Chapter,
  type ChapterStatus,
} from "@/lib/api/syllabus";

export const Route = createFileRoute("/app/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus Tracker — Academix" },
      {
        name: "description",
        content:
          "See how much syllabus each batch has covered, chapter by chapter, before the next exam.",
      },
      { property: "og:title", content: "Syllabus Tracker — Academix" },
      {
        property: "og:description",
        content: "Live chapter-wise coverage for every batch and subject.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SyllabusPage,
});

const NEXT: Record<ChapterStatus, ChapterStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

const TONE: Record<ChapterStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function SyllabusPage() {
  const qc = useQueryClient();
  const [batchId, setBatchId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [titles, setTitles] = useState("");
  const [copyFrom, setCopyFrom] = useState("");

  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: batchesApi.list });
  useEffect(() => {
    if (!batchId && batches[0]) setBatchId(batches[0].id);
  }, [batches, batchId]);

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ["syllabus", batchId],
    queryFn: () => syllabusApi.chapters(batchId),
    enabled: Boolean(batchId),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["syllabus-logs", batchId],
    queryFn: () => syllabusApi.logs({ batchId, limit: 12 }),
    enabled: Boolean(batchId),
  });

  const groups = useMemo(() => groupBySubject(chapters), [chapters]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["syllabus"] });
    qc.invalidateQueries({ queryKey: ["syllabus-logs"] });
  };

  const cycle = useMutation({
    mutationFn: (c: Chapter) => syllabusApi.setStatus(c, NEXT[c.status as ChapterStatus]),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => syllabusApi.removeChapter(id),
    onSuccess: () => {
      toast.success("Chapter removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const add = useMutation({
    mutationFn: () => {
      const existing = chapters.filter((c) => c.subject === subject.trim()).length;
      return syllabusApi.addChapters(batchId, subject.trim(), titles.split("\n"), existing + 1);
    },
    onSuccess: (rows) => {
      toast.success(`${rows.length} chapter(s) added`);
      setTitles("");
      setAddOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const copy = useMutation({
    mutationFn: () => syllabusApi.copyToBatch(copyFrom, batchId),
    onSuccess: (n) => {
      toast.success(`${n} chapters copied`);
      setCopyOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batch = batches.find((b) => b.id === batchId);
  const pending = chapters.filter((c) => c.status !== "done").length;

  return (
    <>
      <PageHeader
        title="Syllabus"
        description="Chapter-wise coverage per batch — what is running now and what is still left."
        actions={
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => setCopyOpen(true)}>
              <Copy className="h-4 w-4" /> Copy from batch
            </Button>
            <Button className="gap-1.5" onClick={() => setAddOpen(true)} disabled={!batchId}>
              <Plus className="h-4 w-4" /> Add chapters
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="h-9 w-full sm:w-[260px]">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                  {b.class_level ? ` · Class ${b.class_level}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {chapters.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{overallPct(chapters)}%</span> covered
              · {pending} chapter(s) left
            </p>
          )}
        </div>

        {batches.length === 0 && (
          <p className="mt-6 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Create a batch first — syllabus is tracked per batch.
          </p>
        )}

        {batchId && (
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!isLoading && groups.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  <BookOpen className="mb-2 h-5 w-5" />
                  No chapters for {batch?.name} yet. Add the subject-wise chapter list once and
                  teachers will keep it updated from their phones.
                </div>
              )}
              {groups.map((g) => (
                <div key={g.subject} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{g.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.done} of {g.total} chapters done
                        {g.current ? ` · now: ${g.current.title}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{g.pct}%</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.chapters.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
                          {c.position}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{c.title}</p>
                          {c.completed_on ? (
                            <p className="text-xs text-muted-foreground">
                              Completed {c.completed_on}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => cycle.mutate(c)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${TONE[c.status as ChapterStatus]}`}
                        >
                          {STATUS_LABEL[c.status as ChapterStatus]}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => remove.mutate(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold">Coverage</p>
                <div className="mt-3">
                  <SyllabusBars chapters={chapters} />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold">Recent teaching log</p>
                <ul className="mt-3 space-y-2">
                  {logs.length === 0 && (
                    <li className="text-xs text-muted-foreground">Nothing logged yet.</li>
                  )}
                  {logs.map((l) => {
                    const ch = (l as { chapter?: { title?: string; subject?: string } | null })
                      .chapter;
                    return (
                      <li key={l.id} className="text-xs">
                        <span className="font-medium text-foreground">{l.date}</span>{" "}
                        <span className="text-muted-foreground">
                          {ch?.subject ? `${ch.subject} · ` : ""}
                          {ch?.title ?? "Chapter"} — {l.note}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </PageBody>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add chapters</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <F label="Subject">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Physics"
                list="syllabus-subjects"
              />
              <datalist id="syllabus-subjects">
                {Array.from(new Set(chapters.map((c) => c.subject))).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </F>
            <F label="Chapters (one per line)">
              <Textarea
                rows={8}
                value={titles}
                onChange={(e) => setTitles(e.target.value)}
                placeholder={"Units and Measurements\nKinematics\nLaws of Motion"}
              />
            </F>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!subject.trim() || !titles.trim() || add.isPending}
              onClick={() => add.mutate()}
            >
              {add.isPending ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy syllabus into {batch?.name ?? "this batch"}</DialogTitle>
          </DialogHeader>
          <F label="Copy chapters from">
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches
                  .filter((b) => b.id !== batchId)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </F>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!copyFrom || copy.isPending} onClick={() => copy.mutate()}>
              {copy.isPending ? "Copying…" : "Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}