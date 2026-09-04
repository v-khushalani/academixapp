import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LINKED_KEYS } from "@/lib/api";
import { hydrateInstitute } from "@/lib/academy-settings";
import { useAuth } from "@/hooks/use-auth";

/**
 * Live sync between devices: when a teacher marks attendance on an iPad the
 * front desk sees it without a refresh. Attendance, fees and students are the
 * three tables that two people genuinely touch at the same time.
 */
export function useLinkedRealtime(enabled = true) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled) return;
    const invalidate = () =>
      LINKED_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
    const refreshInstitute = () => {
      void hydrateInstitute().catch(() => {});
      invalidate();
    };
    const refreshRoles = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc("get_my_roles");
      if (!error) {
        qc.invalidateQueries({ queryKey: ["resolved-features", user.id] });
        window.dispatchEvent(new CustomEvent("vk-roles-changed", { detail: data ?? [] }));
      }
    };

    const channel = supabase
      .channel("academix-linked")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "fees" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "institutes" },
        refreshInstitute,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_feature_flags" },
        refreshInstitute,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, refreshRoles)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, enabled, user]);
}
