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
