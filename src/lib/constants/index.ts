/**
 * Application-wide constants and enums
 */

/** Student status constants */
export const STUDENT_STATUSES = ["active", "inactive", "suspended"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/** Approval status constants */
export const APPROVAL_STATUSES = ["approved", "pending", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Attendance status constants */
export const ATTENDANCE_STATUSES = ["present", "absent", "leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Fee status constants */
export const FEE_STATUSES = ["pending", "partial", "paid", "overdue"] as const;
export type FeeStatus = (typeof FEE_STATUSES)[number];

/** Lead stage constants */
export const LEAD_STAGES = [
  "inquiry",
  "interested",
  "qualified",
  "admitted",
  "rejected",
  "discontinued",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

/** Batch status constants */
export const BATCH_STATUSES = ["active", "completed", "inactive"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

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
