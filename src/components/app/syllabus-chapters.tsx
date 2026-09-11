import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FolderPlus, GripVertical, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  computeOrder,
  splitSections,
  syllabusApi,
  STATUS_LABEL,
  type Chapter,
  type ChapterStatus,
  type SubjectProgress,
} from "@/lib/api/syllabus";

const TONE: Record<ChapterStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const SEC = (name: string | null) => `sec:${name ?? ""}`;

function Row({
  chapter,
  index,
  onCycle,
  onRemove,
}: {
  chapter: Chapter;
  index: number;
  onCycle: (c: Chapter) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="flex touch-none items-center gap-2 border-b border-border bg-card px-2 py-2.5 last:border-b-0 sm:px-4"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{index}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{chapter.title}</p>
        {chapter.completed_on ? (
          <p className="text-xs text-muted-foreground">Completed {chapter.completed_on}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onCycle(chapter)}
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${TONE[chapter.status as ChapterStatus]}`}
      >
        {STATUS_LABEL[chapter.status as ChapterStatus]}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onRemove(chapter.id)}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </li>
  );
}

function SectionHeader({
  name,
  count,
  open,
  onToggle,
}: {
  name: string | null;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: SEC(name) });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-1.5 border-b border-border px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-4 ${
        isOver ? "bg-primary/10" : "bg-muted/40"
      }`}
    >
      {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      {name ?? "Ungrouped chapters"}
      <span className="ml-auto font-normal normal-case">{count}</span>
    </button>
  );
}

export function SubjectCard({
  group,
  onCycle,
  onRemove,
  onReordered,
}: {
  group: SubjectProgress;
  onCycle: (c: Chapter) => void;
  onRemove: (id: string) => void;
  onReordered: (subject: string, next: Chapter[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const sections = useMemo(() => splitSections(group.chapters), [group.chapters]);

  const save = useMutation({
    mutationFn: (next: Chapter[]) => syllabusApi.setOrder(computeOrder(next)),
    onError: (e: Error) => toast.error(e.message),
  });

  function apply(next: Chapter[]) {
    onReordered(group.subject, next);
    save.mutate(next);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const list = group.chapters;
    const from = list.findIndex((c) => c.id === active.id);
    if (from < 0) return;
    const overId = String(over.id);

    if (overId.startsWith("sec:")) {
      const target = overId.slice(4) || null;
      const moving = { ...list[from], section: target };
      const rest = list.filter((_, i) => i !== from);
      const lastOfSection = rest.reduce(
        (acc, c, i) => ((c.section?.trim() || null) === target ? i : acc),
        -1,
      );
      const next = [...rest];
      next.splice(lastOfSection + 1, 0, moving);
      apply(next);
      return;
    }

    const to = list.findIndex((c) => c.id === overId);
    if (to < 0 || to === from) return;
    const target = list[to].section?.trim() || null;
    const next = arrayMove(list, from, to).map((c) =>
      c.id === active.id ? { ...c, section: target } : c,
    );
    apply(next);
  }

  function toggleSection(name: string | null) {
    const key = name ?? "";
    setClosedSections((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });
  }

  const createSection = useMutation({
    mutationFn: () =>
      syllabusApi.moveToSection(group.chapters, Array.from(picked), sectionName.trim()),
    onSuccess: () => {
      toast.success("Section created");
      setSectionOpen(false);
      setSectionName("");
      setPicked(new Set());
      onReordered(group.subject, group.chapters); // let the refetch settle the real order
      save.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{group.subject}</p>
            <p className="truncate text-xs text-muted-foreground">
              {group.done} of {group.total} chapters done
              {group.current ? ` · now: ${group.current.title}` : ""}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="New section"
            onClick={() => setSectionOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{group.pct}%</span>
        </div>
      </div>

      {open && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={group.chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((sec, si) => {
              const isOpen = !closedSections.has(sec.section ?? "");
              return (
                <div key={sec.section ?? `plain-${si}`}>
                  {(sec.section || sections.length > 1) && (
                    <SectionHeader
                      name={sec.section}
                      count={sec.chapters.length}
                      open={isOpen}
                      onToggle={() => toggleSection(sec.section)}
                    />
                  )}
                  {isOpen && (
                    <ul>
                      {sec.chapters.map((c, i) => (
                        <Row
                          key={c.id}
                          chapter={c}
                          index={i + 1}
                          onCycle={onCycle}
                          onRemove={onRemove}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={sectionOpen} onOpenChange={setSectionOpen}>
        <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New section in {group.subject}</DialogTitle>
            <DialogDescription>
              Pick the chapters that belong to it — numbering restarts at 1 inside a section, and
              you can drag more chapters in afterwards.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            placeholder="Part A: Mechanics"
          />
          <ul className="space-y-1">
            {group.chapters.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
                  <Checkbox
                    checked={picked.has(c.id)}
                    onCheckedChange={(v) =>
                      setPicked((prev) => {
                        const s = new Set(prev);
                        if (v) s.add(c.id);
                        else s.delete(c.id);
                        return s;
                      })
                    }
                  />
                  <span className="truncate">{c.title}</span>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!sectionName.trim() || picked.size === 0 || createSection.isPending}
              onClick={() => createSection.mutate()}
            >
              {createSection.isPending ? "Saving…" : "Create section"}
            </Button>
          </DialogFooter>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
