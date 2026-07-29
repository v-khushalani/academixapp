import { Fragment, type DragEvent, type ReactNode } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { formatTime12, toMinutes } from "@/lib/time";

/** Vertical scale of the board. 1.25px per minute => a 60-min class is ~75px tall. */
const PX_PER_MIN = 1.25;

export type GridColumn = { id: string; label: string; sub?: string };

export type GridItem = {
  id: string;
  colId: string;
  /** "HH:MM" or "HH:MM:SS" */
  start: string;
  end: string;
  title: string;
  subject?: string | null;
  person?: string | null;
  tone?: "default" | "clash" | "warn" | "cancelled" | "changed";
  badge?: string | null;
};

export type GridBand = { start: string; end: string };

const TONE: Record<NonNullable<GridItem["tone"]>, string> = {
  default: "border-primary/30 bg-primary/10 hover:border-primary/60",
  changed: "border-accent-foreground/30 bg-accent hover:border-accent-foreground/50",
  clash: "border-destructive/60 bg-destructive/10 hover:border-destructive",
  warn: "border-amber-500/60 bg-amber-500/10 hover:border-amber-500",
  cancelled: "border-dashed border-border bg-muted/60 opacity-70",
};

/**
 * Rooms (or teachers) across the top, real clock time down the side.
 * Classes are positioned by their actual minutes, so a 90-minute class
 * genuinely looks longer than a 60-minute one and parallel batches sit
 * side by side in their own classroom column.
 */
export function ScheduleGrid({
  columns,
  bands,
  items,
  onItemClick,
  onEmptyClick,
  onDropCell,
  onItemDelete,
  canWrite,
  emptyHint = "Add class",
  footer,
}: {
  columns: GridColumn[];
  bands: GridBand[];
  items: GridItem[];
  onItemClick?: (item: GridItem) => void;
  onEmptyClick?: (colId: string, band: GridBand) => void;
  onDropCell?: (colId: string, band: GridBand, ev: DragEvent) => void;
  onItemDelete?: (item: GridItem) => void;
  canWrite?: boolean;
  emptyHint?: string;
  footer?: ReactNode;
}) {
  if (!bands.length || !columns.length) return null;

  const dayStart = toMinutes(bands[0].start);
  const dayEnd = toMinutes(bands[bands.length - 1].end);
  const height = Math.max(120, (dayEnd - dayStart) * PX_PER_MIN);

  const byCol = new Map<string, GridItem[]>();
  columns.forEach((c) => byCol.set(c.id, []));
  items.forEach((i) => {
    if (!byCol.has(i.colId)) byCol.set(i.colId, []);
    byCol.get(i.colId)!.push(i);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 68 + columns.length * 168 }}>
          {/* column headers */}
          <div
            className="sticky top-0 z-20 grid border-b border-border bg-card/95 backdrop-blur"
            style={{ gridTemplateColumns: `68px repeat(${columns.length}, minmax(168px, 1fr))` }}
          >
            <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Time
            </div>
            {columns.map((c) => (
              <div key={c.id} className="border-l border-border px-3 py-2">
                <p className="truncate text-sm font-semibold leading-tight">{c.label}</p>
                {c.sub && (
                  <p className="truncate text-[10px] text-muted-foreground">{c.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* board */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `68px repeat(${columns.length}, minmax(168px, 1fr))`,
              height,
            }}
          >
            {/* time rail */}
            <div className="relative">
              {bands.map((b) => (
                <Fragment key={b.start}>
                  <div
                    className="absolute right-2 -translate-y-1/2 text-right text-[10px] font-medium text-muted-foreground"
                    style={{ top: (toMinutes(b.start) - dayStart) * PX_PER_MIN }}
                  >
                    {formatTime12(b.start)}
                  </div>
                </Fragment>
              ))}
              <div
                className="absolute right-2 -translate-y-1/2 text-right text-[10px] font-medium text-muted-foreground"
                style={{ top: height }}
              >
                {formatTime12(bands[bands.length - 1].end)}
              </div>
            </div>

            {columns.map((c) => {
              const colItems = (byCol.get(c.id) ?? []).sort((a, b) =>
                a.start.localeCompare(b.start),
              );
              return (
                <div key={c.id} className="relative border-l border-border">
                  {/* empty band cells (click / drop targets) */}
                  {bands.map((b) => {
                    const top = (toMinutes(b.start) - dayStart) * PX_PER_MIN;
                    const h = (toMinutes(b.end) - toMinutes(b.start)) * PX_PER_MIN;
                    const busy = colItems.some(
                      (i) =>
                        toMinutes(i.start) < toMinutes(b.end) &&
                        toMinutes(b.start) < toMinutes(i.end),
                    );
                    return (
                      <div
                        key={b.start}
                        className="absolute inset-x-0 border-b border-dashed border-border/60"
                        style={{ top, height: h }}
                        onDragOver={(e) => {
                          if (canWrite && onDropCell) e.preventDefault();
                        }}
                        onDrop={(e) => onDropCell?.(c.id, b, e)}
                      >
                        {!busy && canWrite && onEmptyClick && (
                          <button
                            type="button"
                            onClick={() => onEmptyClick(c.id, b)}
                            className="group flex h-full w-full items-center justify-center gap-1 text-[11px] text-muted-foreground/0 transition-colors hover:bg-primary/5 hover:text-muted-foreground"
                          >
                            <Plus className="h-3 w-3" />
                            {emptyHint}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* classes */}
                  {colItems.map((it, idx) => {
                    const s = Math.max(toMinutes(it.start), dayStart);
                    const e = Math.min(toMinutes(it.end), dayEnd);
                    const overlaps = colItems.filter(
                      (o) =>
                        toMinutes(o.start) < toMinutes(it.end) &&
                        toMinutes(it.start) < toMinutes(o.end),
                    );
                    const lane = overlaps.findIndex((o) => o.id === it.id);
                    const lanes = Math.max(1, overlaps.length);
                    const tone = TONE[it.tone ?? "default"];
                    const short = e - s <= 45;
                    return (
                      <div
                        key={it.id ?? idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => onItemClick?.(it)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") onItemClick?.(it);
                        }}
                        className={`group absolute cursor-pointer overflow-hidden rounded-lg border p-2 text-left transition-colors ${tone}`}
                        style={{
                          top: (s - dayStart) * PX_PER_MIN + 2,
                          height: Math.max(28, (e - s) * PX_PER_MIN - 4),
                          left: `calc(${(lane / lanes) * 100}% + 4px)`,
                          width: `calc(${100 / lanes}% - 8px)`,
                        }}
                      >
                        {canWrite && onItemDelete && (
                          <button
                            type="button"
                            aria-label="Remove class"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onItemDelete(it);
                            }}
                            className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <div className="flex items-start gap-1">
                          <p
                            className={`truncate text-xs font-semibold leading-tight ${
                              it.tone === "cancelled" ? "line-through" : ""
                            }`}
                          >
                            {it.title}
                          </p>
                          {it.tone === "clash" && (
                            <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-destructive" />
                          )}
                        </div>
                        {!short && (
                          <>
                            {it.subject && (
                              <p className="truncate text-[11px] leading-tight">{it.subject}</p>
                            )}
                            {it.person && (
                              <p className="truncate text-[10px] text-muted-foreground">
                                {it.person}
                              </p>
                            )}
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {formatTime12(it.start)} – {formatTime12(it.end)}
                            </p>
                          </>
                        )}
                        {it.badge && (
                          <span className="mt-1 inline-block rounded bg-background/70 px-1 py-px text-[9px] font-medium uppercase tracking-wide">
                            {it.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}