// Branch (multi-campus) support. An institute can have child institutes; a
// head-office admin holds a role on the parent and therefore sees the parent
// plus all of its branches. This module remembers which branch they are
// currently looking at — "all" means the combined view.

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BranchRow = { id: string; name: string; parent_institute_id: string | null };

const KEY = "acx_active_branch";
const EVENT = "acx-branch-changed";
export const ALL_BRANCHES = "all";

export function getActiveBranch(): string {
  if (typeof window === "undefined") return ALL_BRANCHES;
  return window.localStorage.getItem(KEY) || ALL_BRANCHES;
}

export function setActiveBranch(id: string) {
  window.localStorage.setItem(KEY, id);
  window.dispatchEvent(new Event(EVENT));
}

export async function fetchMyBranches(): Promise<BranchRow[]> {
  const { data, error } = await supabase
    .from("institutes")
    .select("id, name, parent_institute_id")
    .order("parent_institute_id", { nullsFirst: true })
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function useBranches() {
  const { data: branches = [] } = useQuery({ queryKey: ["my-branches"], queryFn: fetchMyBranches });
  const [active, setActive] = useState<string>(ALL_BRANCHES);

  useEffect(() => {
    const sync = () => setActive(getActiveBranch());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  // A branch that no longer exists (or a single-institute account) falls back to combined.
  const valid = active === ALL_BRANCHES || branches.some((b) => b.id === active);
  const activeId = valid ? active : ALL_BRANCHES;

  const select = useCallback((id: string) => setActiveBranch(id), []);

  const filter = useCallback(
    <T extends { institute_id?: string | null }>(rows: T[] | undefined | null): T[] => {
      if (!rows) return [];
      if (activeId === ALL_BRANCHES) return rows;
      return rows.filter((r) => !r.institute_id || r.institute_id === activeId);
    },
    [activeId],
  );

  return { branches, activeId, select, filter, multi: branches.length > 1 };
}
