import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LINKED_KEYS } from "@/lib/api";

/**
 * Live sync between devices: when a teacher marks attendance on an iPad the
 * front desk sees it without a refresh. Attendance, fees and students are the
 * three tables that two people genuinely touch at the same time.
 */
export function useLinkedRealtime(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const invalidate = () =>
      LINKED_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));

    const channel = supabase
      .channel("academix-linked")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "fees" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, invalidate)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, enabled]);
}
