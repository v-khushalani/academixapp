import { useRef } from "react";
import { toast } from "sonner";
import { Image, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime12 } from "@/lib/time";
import { roomLabel, type SlotRow } from "@/lib/timetable/conflicts";
import { getInstitute } from "@/lib/academy-settings";
import { openWhatsApp, teacherDayMessage } from "@/lib/whatsapp";
import { shareTableAsImage } from "@/lib/timetable/share-image";

type FacultyRow = { id: string; full_name: string; phone?: string | null };

/**
 * What the office actually sends every morning: one card per teacher with
 * today's sessions, ready to WhatsApp them directly.
 */
export function TeacherDaySheet({
  slots,
  faculty,
  dayLabel,
}: {
  slots: SlotRow[];
  faculty: FacultyRow[];
  dayLabel: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const academy = getInstitute().name || "Academy";

  const rowsFor = (id: string) =>
    slots
      .filter((s) => s.faculty_id === id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const unassigned = slots.filter((s) => !s.faculty_id);

  async function shareImage() {
    const res = await shareTableAsImage(
      sheetRef.current,
      `teacher-schedule-${dayLabel.toLowerCase()}`,
      `${academy} — ${dayLabel} teacher schedule`,
    );
    if (res === "failed") toast.error("Could not create the image. Try again.");
    else if (res === "downloaded") toast.success("Image saved — attach it in WhatsApp");
  }

  if (!faculty.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Add teachers first — this view shows each teacher what they are taking today.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{dayLabel}</p>
        <p className="text-xs text-muted-foreground">
          {slots.length} session{slots.length === 1 ? "" : "s"} ·{" "}
          {faculty.filter((f) => rowsFor(f.id).length).length} teacher(s) on duty
        </p>
        <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={shareImage}>
          <Image className="h-4 w-4" />
          Share as image
        </Button>
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-3 text-xs">
          {unassigned.length} class(es) today have no teacher assigned — fix them in the weekly plan.
        </div>
      )}

      <div ref={sheetRef} className="grid gap-3 rounded-xl bg-background sm:grid-cols-2 xl:grid-cols-3">
        {faculty.map((f) => {
          const rows = rowsFor(f.id);
          return (
            <div key={f.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{f.full_name}</p>
                <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {rows.length} class{rows.length === 1 ? "" : "es"}
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Free today.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {rows.map((s) => (
                    <li key={s.id} className="rounded-md bg-primary/5 px-2 py-1.5">
                      <p className="text-xs font-medium">
                        {formatTime12(s.start_time)} – {formatTime12(s.end_time)} ·{" "}
                        {s.batch?.name ?? "Batch?"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.subject ?? "Subject?"}
                        {roomLabel(s) ? ` · ${roomLabel(s)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full gap-1.5"
                onClick={() => {
                  const msg = teacherDayMessage(
                    f.full_name,
                    dayLabel,
                    rows.map((s) => ({
                      start: formatTime12(s.start_time),
                      end: formatTime12(s.end_time),
                      batch: s.batch?.name,
                      room: roomLabel(s),
                      subject: s.subject,
                    })),
                    academy,
                  );
                  if (!openWhatsApp(f.phone, msg)) {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(msg)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
              >
                <Send className="h-3.5 w-3.5" />
                Send on WhatsApp
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}