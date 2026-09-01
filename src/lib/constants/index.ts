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

/** Application form program options */
export const PROGRAMS = ["JEE Main", "JEE Advanced", "NEET", "CA"] as const;

/** Application form stream options */
export const STREAMS = ["PCM", "PCB", "Commerce", "Humanities"] as const;

/** Application form preferred contact options */
export const PREFERRED_CONTACTS = ["father", "mother", "self"] as const;
