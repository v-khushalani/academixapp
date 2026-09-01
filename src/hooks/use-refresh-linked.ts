import { useQueryClient } from "@tanstack/react-query";
import { LINKED_KEYS } from "@/lib/api";

/**
 * Refresh every screen that shares enrolment / money state:
 * students, batch rosters, fees, dashboard KPIs, timetable, attendance, tests, portal.
 */
export function useRefreshLinked() {
  const qc = useQueryClient();
  return () => LINKED_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}
