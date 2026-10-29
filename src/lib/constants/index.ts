/**
 * Application-wide constants and enums
 */

/** Class / grade options (school grades only — programs are a separate field) */
export const CLASSES = [
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

/** Programs for Nursery–10 */
export const SCHOOL_PROGRAMS = [
  { value: "schooling", label: "Schooling" },
  { value: "foundation", label: "Foundation" },
  { value: "both", label: "Both — Schooling + Foundation" },
] as const;

/** Programs for 11–12 */
export const SENIOR_PROGRAMS = [
  { value: "jee", label: "JEE Main + Advanced" },
  { value: "cet", label: "CET" },
  { value: "neet", label: "NEET" },
] as const;

export function programsForClass(klass: string) {
  if (klass === "11" || klass === "12") return SENIOR_PROGRAMS;
  if (!klass) return [];
  return SCHOOL_PROGRAMS;
}

export function programLabel(v: string | null | undefined) {
  if (!v) return "";
  return [...SCHOOL_PROGRAMS, ...SENIOR_PROGRAMS].find((p) => p.value === v)?.label ?? v;
}
