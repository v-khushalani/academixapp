import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdmin } from "@/lib/rbac";
import {
  FEATURES,
  isFeatureOn,
  resolveFeatures,
  type FeatureKey,
  type FeatureMap,
} from "@/lib/features";

const ALL_ON: FeatureMap = Object.fromEntries(FEATURES.map((f) => [f.key, true]));

async function fetchGlobalOff(): Promise<string[]> {
  const { data } = await supabase
    .from("platform_feature_flags")
    .select("key, enabled")
    .eq("enabled", false);
  return (data ?? []).map((r) => r.key as string);
}

async function fetchInstituteFeatures(): Promise<Record<string, unknown>> {
  const { data: instituteId } = await supabase.rpc("current_institute_id");
  if (!instituteId) return {};
  const { data } = await supabase
    .from("institutes")
    .select("features")
    .eq("id", instituteId as string)
    .maybeSingle();
  return (data?.features ?? {}) as Record<string, unknown>;
}

/**
 * Features the signed-in institute may use right now.
 * Team Academix always sees everything.
 */
export function useFeatures() {
  const { roles, session } = useAuth();
  const superadmin = isSuperAdmin(roles);

  const { data, isLoading } = useQuery({
    queryKey: ["resolved-features", session?.user.id],
    enabled: !!session && !superadmin,
    staleTime: 60_000,
    queryFn: async () => {
      const [own, globalOff] = await Promise.all([fetchInstituteFeatures(), fetchGlobalOff()]);
      return resolveFeatures(own, globalOff);
    },
  });

  const map = superadmin ? ALL_ON : (data ?? ALL_ON);

  return {
    map,
    loading: !superadmin && isLoading,
    /** Unknown / still loading resolves to on, so nothing flickers as locked. */
    isOn: (key: FeatureKey) => isFeatureOn(map, key),
  };
}
