import { groupBySubject, type Chapter } from "@/lib/api/syllabus";

/** Compact per-subject coverage bars, reused by admin, teacher and family screens. */
export function SyllabusBars({
  chapters,
  showCurrent = true,
  empty = "No syllabus added yet.",
}: {
  chapters: Chapter[];
  showCurrent?: boolean;
  empty?: string;
}) {
  const groups = groupBySubject(chapters);
  if (!groups.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.subject}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{g.subject}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {g.pct}% · {g.done}/{g.total}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${g.pct}%` }}
            />
          </div>
          {showCurrent && g.current ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Currently teaching: {g.current.title}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}