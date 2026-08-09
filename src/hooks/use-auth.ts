import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { hydrateInstitute } from "@/lib/academy-settings";

export type AppRole = Database["public"]["Enums"]["app_role"];

type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  /** true when at least one role row is attached to an institute */
  linked: boolean;
  loading: boolean;
};

let cache: AuthState = { session: null, user: null, roles: [], linked: false, loading: true };
const listeners = new Set<(s: AuthState) => void>();
let initialised = false;

function notify() {
  for (const l of listeners) l(cache);
}

async function loadRoles(userId: string): Promise<{ roles: AppRole[]; linked: boolean }> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, institute_id")
    .eq("user_id", userId);
  if (error) {
    console.error("[roles]", error);
    return { roles: [], linked: false };
  }
  const rows = data ?? [];
  return {
    roles: rows.map((r) => r.role),
    linked: rows.some((r) => r.institute_id !== null),
  };
}

async function bootstrap() {
  if (initialised) return;
  initialised = true;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const user = session?.user ?? null;
  const { roles, linked } = user ? await loadRoles(user.id) : { roles: [], linked: false };
  cache = { session, user, roles, linked, loading: false };
  notify();
  if (user) void hydrateInstitute().catch(() => {});

  supabase.auth.onAuthStateChange(async (event, s) => {
    const u = s?.user ?? null;
    const r = u ? await loadRoles(u.id) : { roles: [], linked: false };
    cache = { session: s, user: u, roles: r.roles, linked: r.linked, loading: false };
    notify();
    if (u && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
      void hydrateInstitute().catch(() => {});
    }
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(cache);
  useEffect(() => {
    bootstrap();
    listeners.add(setState);
    setState(cache);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}

export function hasAnyRole(roles: AppRole[], allowed: AppRole[]): boolean {
  return roles.some((r) => allowed.includes(r));
}
