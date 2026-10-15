/** App-wide date display: always "06 August 2026". */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDate(v?: string | number | Date | null): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d =
    v instanceof Date
      ? v
      : new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-08-06" -> "06 August 2026". Returns the dash placeholder for empty values. */
export function formatDate(v?: string | number | Date | null, fallback = "—"): string {
  const d = toDate(v);
  if (!d) return fallback;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Same format, plus time — used where a timestamp matters. */
export function formatDateTime(v?: string | number | Date | null, fallback = "—"): string {
  const d = toDate(v);
  if (!d) return fallback;
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

/** Today's date in the device's local timezone (not UTC) as YYYY-MM-DD. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
