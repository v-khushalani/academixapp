/** Shared time helpers. DB stores 24-hour "HH:MM[:SS]"; the UI always shows 12-hour. */

export function toMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "15:30" -> "3:30 PM", "15:00" -> "3 PM" */
export function formatTime12(t?: string | null): string {
  if (!t) return "—";
  const total = toMinutes(String(t));
  const h24 = Math.floor(total / 60);
  const mm = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return mm === 0 ? `${h12} ${suffix}` : `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function formatRange12(start?: string | null, end?: string | null): string {
  return `${formatTime12(start)} – ${formatTime12(end)}`;
}