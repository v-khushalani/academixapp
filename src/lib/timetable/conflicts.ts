import { toMinutes, toHHMM } from "@/lib/time";
import type { TimetableSlot } from "@/lib/api";

export type RoomRef = { id: string; name: string; capacity: number };

export type SlotRow = TimetableSlot & {
  batch?: { id: string; name: string } | null;
  faculty?: { id: string; full_name: string } | null;
  room_ref?: RoomRef | null;
};

export type Band = { start: string; end: string };

/** Display name for a slot's classroom (new room_id link, falling back to legacy free text). */
export function roomLabel(s: { room_ref?: RoomRef | null; room?: string | null }): string | null {
  return s.room_ref?.name ?? (s.room && s.room.trim() ? s.room.trim() : null);
}

/** Stable key used to detect "same classroom" across linked and legacy rows. */
function roomKey(s: { room_id?: string | null; room_ref?: RoomRef | null; room?: string | null }) {
  if (s.room_id) return `id:${s.room_id}`;
  const label = roomLabel(s);
  return label ? `name:${label.toLowerCase()}` : null;
}

export function overlaps(aS: string, aE: string, bS: string, bE: string) {
  return toMinutes(aS) < toMinutes(bE) && toMinutes(bS) < toMinutes(aE);
}

export type Candidate = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string | null;
  room?: string | null;
  room_ref?: RoomRef | null;
  faculty_id?: string | null;
  batch_id?: string | null;
};

export function findConflicts(candidate: Candidate, all: SlotRow[]): SlotRow[] {
  const rk = roomKey(candidate);
  return all.filter((s) => {
    if (s.id === candidate.id) return false;
    if (s.day_of_week !== candidate.day_of_week) return false;
    if (!overlaps(s.start_time, s.end_time, candidate.start_time, candidate.end_time)) return false;
    const sameRoom = Boolean(rk && roomKey(s) === rk);
    const sameFaculty = Boolean(
      candidate.faculty_id && s.faculty_id && s.faculty_id === candidate.faculty_id,
    );
    const sameBatch = Boolean(
      candidate.batch_id && s.batch_id && s.batch_id === candidate.batch_id,
    );
    return sameRoom || sameFaculty || sameBatch;
  });
}

export function conflictReason(a: Candidate, b: SlotRow): string {
  const reasons: string[] = [];
  const rk = roomKey(a);
  if (rk && roomKey(b) === rk) reasons.push(`room ${roomLabel(b) ?? ""}`.trim());
  if (a.faculty_id && b.faculty_id === a.faculty_id)
    reasons.push(`teacher ${b.faculty?.full_name ?? ""}`.trim());
  if (a.batch_id && b.batch_id === a.batch_id) reasons.push(`batch ${b.batch?.name ?? ""}`.trim());
  return reasons.join(", ");
}

export type Clash = {
  key: string;
  day: number;
  time: string;
  kind: "teacher" | "room" | "batch";
  who: string;
  slots: SlotRow[];
};

/** Every double-booking in the week, grouped so the panel can list them one line each. */
export function reconcile(slots: SlotRow[]): { clashes: Clash[]; badIds: Set<string> } {
  const clashes: Clash[] = [];
  const badIds = new Set<string>();
  const seen = new Set<string>();

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.day_of_week !== b.day_of_week) continue;
      if (!overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) continue;

      const pairs: { kind: Clash["kind"]; who: string }[] = [];
      const rk = roomKey(a);
      if (rk && roomKey(b) === rk) pairs.push({ kind: "room", who: roomLabel(a) ?? "room" });
      if (a.faculty_id && a.faculty_id === b.faculty_id)
        pairs.push({ kind: "teacher", who: a.faculty?.full_name ?? "teacher" });
      if (a.batch_id && a.batch_id === b.batch_id)
        pairs.push({ kind: "batch", who: a.batch?.name ?? "batch" });

      for (const p of pairs) {
        const key = `${a.day_of_week}|${a.start_time}|${p.kind}|${p.who}`;
        badIds.add(a.id);
        badIds.add(b.id);
        if (seen.has(key)) continue;
        seen.add(key);
        clashes.push({
          key,
          day: a.day_of_week,
          time: a.start_time,
          kind: p.kind,
          who: p.who,
          slots: [a, b],
        });
      }
    }
  }
  return { clashes, badIds };
}

/** Soft warnings when a batch's strength exceeds the classroom capacity. */

export function buildBands(start: string, end: string, period: number): Band[] {
  const out: Band[] = [];
  const step = Math.max(15, period || 60);
  const startM = toMinutes(start);
  const endM = Math.max(startM + step, toMinutes(end));
  for (let m = startM; m < endM; m += step) {
    out.push({ start: toHHMM(m), end: toHHMM(Math.min(m + step, endM)) });
  }
  return out;
}
