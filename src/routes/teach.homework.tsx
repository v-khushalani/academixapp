import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { myBatches, myFaculty } from "@/lib/api/teach";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/dates";

export const Route = createFileRoute("/teach/homework")({
  head: () => ({
    meta: [
      { title: "Set Homework — Teacher Portal" },
      {
        name: "description",
        content: "Assign homework to your batches and let students see it in their portal.",
      },
      { property: "og:title", content: "Set Homework — Teacher Portal" },
      { property: "og:description", content: "Assign homework to a batch with a due date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachHomework,
});

function TeachHomework() {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const [batchId, setBatchId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const activeBatch = batchId || batches[0]?.id || "";

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["teach-homework", activeBatch],
    enabled: Boolean(activeBatch),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .eq("batch_id", activeBatch)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!activeBatch) throw new Error("Pick a batch first");
      if (!title.trim()) throw new Error("Give the homework a title");
      const { error } = await supabase.from("homework").insert({
        batch_id: activeBatch,
        title: title.trim(),
        subject: subject.trim() || null,
        due_date: dueDate || null,
        description: description.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Homework posted");
      setTitle("");
      setSubject("");
      setDueDate("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["teach-homework", activeBatch] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Homework removed");
      qc.invalidateQueries({ queryKey: ["teach-homework", activeBatch] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Homework</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Anything you post here shows up in the student and parent portal.
      </p>

      <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Batch</Label>
          <Select value={activeBatch} onValueChange={setBatchId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a batch" />
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Title</Label>
            <Input
              className="h-9"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter 4 exercise"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Subject</Label>
            <Input
              className="h-9"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Physics"
            />
          </div>
        </div>

        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Due date</Label>
          <Input
            type="date"
            className="h-9"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Details</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Questions 1 to 12, show all steps."
          />
        </div>

        <Button
          className="w-full sm:w-auto"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          {create.isPending ? "Posting…" : "Post homework"}
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && list.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing posted for this batch yet.
          </p>
        )}
        {list.map((h) => (
          <div
            key={h.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{h.title}</p>
              <p className="text-xs text-muted-foreground">
                {[h.subject, h.due_date ? `Due ${formatDate(h.due_date)}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {h.description && (
                <p className="mt-1 text-xs text-muted-foreground">{h.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete homework"
              onClick={() => remove.mutate(h.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}