import { useMemo, useRef, useState } from "react";
import { Image, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTime12, toMinutes } from "@/lib/time";
import { roomLabel, type SlotRow } from "@/lib/timetable/conflicts";
import { getInstitute } from "@/lib/academy-settings";
import { shareTableAsImage } from "@/lib/timetable/share-image";
import type { Batch } from "@/lib/api";

const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * The school-style timetable students/parents are used to:
 * days down the side, periods across the top, one batch at a time.
 */
export function ClassTimetable({ slots, batches }: { slots: SlotRow[]; batches: Batch[] }) {
  const [batchId, setBatchId] = useState<string>(() => batches[0]?.id ?? "");
  const activeId = batchId || batches[0]?.id || "";
  const batch = batches.find((b) => b.id === activeId);
  const gridRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => slots.filter((s) => s.batch_id === activeId), [slots, activeId]);

  /** Period columns = the distinct time windows this batch actually runs. */
  const periods = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    rows.forEach((s) => {
      const key = `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`;
      if (!map.has(key)) map.set(key, { start: s.start_time, end: s.end_time });
    });
    return Array.from(map.values()).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  }, [rows]);

  const cell = (dow: number, p: { start: string; end: string }) =>
    rows.find(
      (s) =>
        s.day_of_week === dow &&
        s.start_time.slice(0, 5) === p.start.slice(0, 5) &&
        s.end_time.slice(0, 5) === p.end.slice(0, 5),
    );

  function share() {
    const inst = getInstitute();
    const lines = [`*${inst.name || "Academy"} — ${batch?.name ?? "Batch"} timetable*`];
    DAY_ORDER.forEach((d) => {
      const day = rows
        .filter((s) => s.day_of_week === d)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (!day.length) return;
      lines.push(`\n*${DAY_FULL[d]}*`);
      day.forEach((s) => {
        const parts = [
          `${formatTime12(s.start_time)}–${formatTime12(s.end_time)}`,
          s.subject ?? "Class",
          s.faculty?.full_name && `👨‍🏫 ${s.faculty.full_name}`,
          roomLabel(s) && `🚪 ${roomLabel(s)}`,
        ].filter(Boolean);
        lines.push(`• ${parts.join(" · ")}`);
      });
    });
    if (lines.length === 1) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function shareImage() {
    const res = await shareTableAsImage(
      gridRef.current,
      `class-timetable-${batch?.name ?? "batch"}`,
      `${getInstitute().name || "Academy"} — ${batch?.name ?? "Batch"} timetable`,
    );
    if (res === "failed") toast.error("Could not create the image. Try again.");
    else if (res === "copied")
      toast.success("Image copied — paste it in the WhatsApp chat with Ctrl+V");
  }

  if (!batches.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Create a batch first — this view shows one batch's week the way students read it.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-card p-3 sm:flex sm:flex-wrap">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Batch</span>
          <Select value={activeId} onValueChange={setBatchId}>
            <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-56">
              <SelectValue />
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
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={shareImage}>
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Image</span>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={share}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Text</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No classes scheduled for {batch?.name ?? "this batch"} yet — add them in the weekly plan.
        </div>
      ) : (
        <div ref={gridRef} className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Day
                </th>
                {periods.map((p, i) => (
                  <th
                    key={`${p.start}-${p.end}`}
                    className="min-w-full sm:w-[132px] border-l border-border px-3 py-2 text-center"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Period {i + 1}
                    </p>
                    <p className="text-[11px] font-medium">
                      {formatTime12(p.start)} – {formatTime12(p.end)}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_ORDER.map((d) => (
                <tr key={d} className="border-t border-border">
                  <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-semibold">
                    {DAY_FULL[d].slice(0, 3)}
                  </th>
                  {periods.map((p) => {
                    const s = cell(d, p);
                    return (
                      <td
                        key={`${d}-${p.start}`}
                        className="border-l border-border px-2 py-2 text-center align-middle"
                      >
                        {s ? (
                          <div className="rounded-md bg-primary/10 px-2 py-1.5">
                            <p className="truncate text-xs font-semibold">
                              {s.subject ?? "Class"}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {s.faculty?.full_name ?? "—"}
                            </p>
                            {roomLabel(s) && (
                              <p className="truncate text-[10px] text-muted-foreground">
                                {roomLabel(s)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        This is the student/parent view — same schedule as the weekly plan, laid out like a school
        timetable. Share it on WhatsApp or print it for the notice board.
      </p>
    </div>
  );
}