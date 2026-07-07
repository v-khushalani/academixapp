import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { Calendar } from "lucide-react";
import { TimetableSlotDialog } from "@/components/app/timetable-slot-dialog";
import { timetableApi, type TimetableSlot } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/timetable")({
  component: TimetablePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]; // Monday-first columns mapped to DB day_of_week (0=Sun)

type SlotRow = TimetableSlot & {
  batch?: { id: string; name: string } | null;
  faculty?: { id: string; full_name: string } | null;
};

function TimetablePage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("batch:write", roles);
  const { data = [], isLoading } = useQuery({ queryKey: ["timetable"], queryFn: () => timetableApi.list() as Promise<SlotRow[]> });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [defaultDay, setDefaultDay] = useState<number>(1);

  const removeMut = useMutation({
    mutationFn: (id: string) => timetableApi.remove(id),
    onSuccess: () => { toast.success("Slot removed"); qc.invalidateQueries({ queryKey: ["timetable"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Build the list of unique time bands (start-end) sorted by start
  const timeBands = useMemo(() => {
    const set = new Map<string, { start: string; end: string }>();
    data.forEach((s) => {
      const key = `${s.start_time}-${s.end_time}`;
      if (!set.has(key)) set.set(key, { start: s.start_time, end: s.end_time });
    });
    return Array.from(set.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [data]);

  // Group slots by day+time band
  const grid = useMemo(() => {
    const g: Record<string, SlotRow[]> = {};
    data.forEach((s) => {
      const key = `${s.day_of_week}|${s.start_time}-${s.end_time}`;
      (g[key] ||= []).push(s);
    });
    return g;
  }, [data]);

  const fmtTime = (t: string) => t.slice(0, 5);

  function openNew(day: number) {
    setEditing(null);
    setDefaultDay(day);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description={`${data.length} scheduled slots · weekly matrix`}
        actions={canWrite ? <Button size="sm" className="gap-1.5" onClick={() => openNew(1)}><Plus className="h-4 w-4" />Add slot</Button> : null}
      />
      <PageBody>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={Calendar} title="Build your weekly timetable"
            description="Add a slot with day, time, room, faculty and subject. Slots appear in the matrix below." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-32 border-b border-border px-3 py-3">Time</th>
                  {DAYS.map((d) => (
                    <th key={d} className="border-b border-l border-border px-3 py-3">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeBands.map((band) => (
                  <tr key={`${band.start}-${band.end}`} className="align-top">
                    <td className="border-b border-border px-3 py-3 font-medium text-muted-foreground">
                      {fmtTime(band.start)} – {fmtTime(band.end)}
                    </td>
                    {DAY_INDEX.map((dow, i) => {
                      const key = `${dow}|${band.start}-${band.end}`;
                      const cells = grid[key] ?? [];
                      return (
                        <td key={i} className="border-b border-l border-border p-2">
                          <div className="flex flex-col gap-2">
                            {cells.map((s) => (
                              <div key={s.id} className="group rounded-md border border-primary/20 bg-primary/5 p-2">
                                <p className="text-sm font-semibold leading-tight">{s.subject ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">{s.batch?.name ?? "No batch"}</p>
                                <p className="mt-1 text-xs">{s.faculty?.full_name ?? "No faculty"}</p>
                                <p className="text-xs text-muted-foreground">Room {s.room ?? "—"}</p>
                                {canWrite && (
                                  <div className="mt-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditing(s); setOpen(true); }}>Edit</Button>
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => removeMut.mutate(s.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {canWrite && (
                              <button type="button" onClick={() => openNew(dow)}
                                className="rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                                + Add
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
      <TimetableSlotDialog open={open} onOpenChange={setOpen} slot={editing} defaultDay={defaultDay} />
    </>
  );
}