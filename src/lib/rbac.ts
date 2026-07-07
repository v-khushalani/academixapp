import type { AppRole } from "@/hooks/use-auth";

export type ModuleKey =
  | "dashboard" | "students" | "admissions" | "batches" | "attendance"
  | "fees" | "tests" | "homework" | "study-material" | "timetable"
  | "faculty" | "reports" | "notifications" | "settings";

export const MODULE_ACCESS: Record<ModuleKey, AppRole[]> = {
  dashboard: ["owner","admin","faculty","receptionist","counsellor","accountant","student","parent"],
  students: ["owner","admin","faculty","receptionist","counsellor","accountant"],
  admissions: ["owner","admin","receptionist","counsellor"],
  batches: ["owner","admin","faculty","receptionist"],
  attendance: ["owner","admin","faculty","student","parent"],
  fees: ["owner","admin","accountant","receptionist","student","parent"],
  tests: ["owner","admin","faculty","student","parent"],
  homework: ["owner","admin","faculty","student","parent"],
  "study-material": ["owner","admin","faculty","student","parent"],
  timetable: ["owner","admin","faculty","receptionist","student","parent"],
  faculty: ["owner","admin"],
  reports: ["owner","admin","accountant"],
  notifications: ["owner","admin","faculty","receptionist","counsellor","accountant"],
  settings: ["owner","admin"],
};

// Action-level permissions
export type Action =
  | "student:write" | "batch:write" | "fees:write" | "lead:write"
  | "attendance:write" | "test:write" | "role:manage";

export const ACTION_ROLES: Record<Action, AppRole[]> = {
  "student:write": ["owner","admin","receptionist"],
  "batch:write": ["owner","admin"],
  "fees:write": ["owner","admin","accountant"],
  "lead:write": ["owner","admin","receptionist","counsellor"],
  "attendance:write": ["owner","admin","faculty"],
  "test:write": ["owner","admin","faculty"],
  "role:manage": ["owner","admin"],
};

export function canAccess(module: ModuleKey, roles: AppRole[]): boolean {
  return roles.some((r) => MODULE_ACCESS[module].includes(r));
}
export function can(action: Action, roles: AppRole[]): boolean {
  return roles.some((r) => ACTION_ROLES[action].includes(r));
}