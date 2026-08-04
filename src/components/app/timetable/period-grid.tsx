import { type ReactNode } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { formatTime12 } from "@/lib/time";
import type { Band } from "@/lib/timetable/conflicts";
import { cardKey, cellKey, useTimetableDrag } from "./drag";

export type GridCol = { id: string; label: string; sub?: string };

export type GridCell = {
  id: string;
  title: string;
  subject?: string | null;
  person?: string | null;
  clash?: boolean;
  warn?: boolean;
};

/**
 * A plain periods × columns table. Every period is one row, so the whole day
 * fits on the screen without any scrolling — the thing everyone actually reads.
 */
export function PeriodGrid({
  columns,
  bands,
  cell,
  canWrite,
  onCellClick,
  onDelete,
  emptyLabel = "Add class",
  caption,
  innerRef,
  onEditCol,
}: {
  columns: GridCol[];
  bands: Band[];
  cell: (colId: string, band: Band) => GridCell | null;
  canWrite?: boolean;
  onCellClick?: (colId: string, band: Band) => void;
  onDelete?: (cellId: string) => void;
  emptyLabel?: string;
  caption?: ReactNode;
  innerRef?: React.Ref<HTMLDivElement>;
  /** click a room header to rename it / change its capacity */
  onEditCol?: (colId: string) => void;
}) {
  const drag = useTimetableDrag();
  if (!columns.length || !bands.length) return null;

  return (
    <div ref={innerRef} className="overflow-hidden rounded-xl border border-border bg-card">
      {caption}
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="bg-muted/60">
            <th className="w-[92px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Time
            </th>
            {columns.map((c) => (
              <th key={c.id} className="border-l border-border px-2 py-2 text-left">
                {canWrite && onEditCol ? (
                  <button
                    type="button"
                    onClick={() => onEditCol(c.id)}
                    className="block w-full text-left hover:text-primary"
                    title="Rename room / change capacity"
                  >
                    <p className="truncate text-xs font-semibold">{c.label}</p>
                    {c.sub && <p className="truncate text-[10px] text-muted-foreground">{c.sub}</p>}
                  </button>
                ) : (
                  <>
                    <p className="truncate text-xs font-semibold">{c.label}</p>
                    {c.sub && <p className="truncate text-[10px] text-muted-foreground">{c.sub}</p>}
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => (
            <tr key={b.start} className="border-t border-border">
              <th className="px-2 py-1.5 text-left align-top">
                <p className="text-[11px] font-semibold leading-tight">{formatTime12(b.start)}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  to {formatTime12(b.end)}
                </p>
              </th>
              {columns.map((c) => {
                const item = cell(c.id, b);
                const hot =
                  drag?.active != null &&
                  drag.hoverKey === (item ? cardKey(item.id) : cellKey(c.id, b.start));
                return (
                  <td
                    key={c.id}
                    data-drop-col={canWrite && !item ? c.id : undefined}
                    data-drop-band={canWrite && !item ? b.start : undefined}
                    className={`border-l border-border p-1 align-top transition-colors ${
                      hot ? "bg-primary/15" : ""
                    }`}
                  >
                    {item ? (
                      <div
                        data-drop-card={canWrite ? item.id : undefined}
                        className={`group relative rounded-md border px-2 py-1.5 ${
                          hot ? "ring-2 ring-primary " : ""
                        }${
                          item.clash
                            ? "border-destructive/60 bg-destructive/10"
                            : item.warn
                              ? "border-amber-500/60 bg-amber-500/10"
                              : "border-primary/30 bg-primary/10"
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          <p className="truncate text-[11px] font-semibold leading-tight">
                            {item.title}
                          </p>
                          {item.clash && (
                            <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-destructive" />
                          )}
                        </div>
                        <p className="truncate text-[10px] leading-tight">{item.subject || "—"}</p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground">
                          {item.person || "—"}
                        </p>
                        {canWrite && onDelete && (
                          <button
                            type="button"
                            aria-label="Remove class"
                            onClick={() => onDelete(item.id)}
                            className="absolute right-0.5 top-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : canWrite && onCellClick ? (
                      <button
                        type="button"
                        onClick={() => onCellClick(c.id, b)}
                        className={`flex h-full min-h-[52px] w-full items-center justify-center gap-1 rounded-md border border-dashed text-[10px] transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary ${
                          hot
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 text-muted-foreground/50"
                        }`}
                      >
                        <Plus className="h-3 w-3" />
                        {emptyLabel}
                      </button>
                    ) : (
                      <div className="min-h-[52px] rounded-md border border-dashed border-border/50" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}