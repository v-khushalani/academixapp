import type { AppRole } from "@/hooks/use-auth";

export type ModuleKey =
  | "dashboard"
  | "students"
  | "admissions"
  | "batches"
  | "attendance"
  | "fees"
  | "tests"
  | "syllabus"
  | "timetable"
  | "faculty"
  | "reports"
  | "settings"
  | "platform";

/** Team Academix. Hidden from every institute-facing role picker. */
export const SUPERADMIN: AppRole = "superadmin" as AppRole;

export function isSuperAdmin(roles: AppRole[]): boolean {
  return roles.includes(SUPERADMIN);
}

export const MODULE_ACCESS: Record<ModuleKey, AppRole[]> = {
  dashboard: [
    "owner",
    "admin",
    "faculty",
    "receptionist",
    "counsellor",
    "accountant",
    "student",
    "parent",
  ],
  students: ["owner", "admin", "receptionist", "counsellor", "accountant"],
  admissions: ["owner", "admin", "receptionist", "counsellor"],
  batches: ["owner", "admin", "receptionist"],
  attendance: ["owner", "admin", "faculty", "student", "parent"],
  fees: ["owner", "admin", "accountant", "receptionist", "student", "parent"],
  tests: ["owner", "admin", "faculty", "student", "parent"],
  syllabus: ["owner", "admin", "faculty", "receptionist"],
  timetable: ["owner", "admin", "faculty", "receptionist", "student", "parent"],
  faculty: ["owner", "admin"],
  reports: ["owner", "admin", "accountant"],
  settings: ["owner", "admin"],
  platform: [],
};

// Action-level permissions
export type Action =
  | "student:write"
  | "student:edit"
  | "batch:write"
  | "fees:write"
  | "lead:write"
  | "attendance:write"
  | "test:write"
  | "syllabus:write"
  | "role:manage";

export const ACTION_ROLES: Record<Action, AppRole[]> = {
  "student:write": ["owner", "admin", "receptionist"],
  // Enrolment details are locked after submission — only admins/owners may change them
  "student:edit": ["owner", "admin"],
  "batch:write": ["owner", "admin"],
  "fees:write": ["owner", "admin", "accountant"],
  "lead:write": ["owner", "admin", "receptionist", "counsellor"],
  "attendance:write": ["owner", "admin", "faculty"],
  "test:write": ["owner", "admin", "faculty"],
  "syllabus:write": ["owner", "admin"],
  "role:manage": ["owner", "admin"],
};

/**
 * Check if user has access to a module
 * @param module - Module key to check
 * @param roles - User's roles
 * @returns true if user has access
 */
export function canAccess(module: ModuleKey, roles: AppRole[]): boolean {
  if (isSuperAdmin(roles)) return true;
  const allowed = MODULE_ACCESS[module];
  if (!allowed) return false;
  return roles.some((r) => allowed.includes(r));
}

/**
 * Check if user can perform an action
 * @param action - Action to check
 * @param roles - User's roles
 * @returns true if user can perform action
 */
export function can(action: Action, roles: AppRole[]): boolean {
  if (isSuperAdmin(roles)) return true;
  return roles.some((r) => ACTION_ROLES[action].includes(r));
}
