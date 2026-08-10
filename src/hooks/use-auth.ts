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
  loading: boolean;
};

let cache: AuthState = { session: null, user: null, roles: [], loading: true };
const listeners = new Set<(s: AuthState) => void>();
let initialised = false;

function notify() {
  for (const l of listeners) l(cache);
}

async function loadRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("[roles]", error);
    return [];
  }
  return (data ?? []).map((r) => r.role);
}

async function bootstrap() {
  if (initialised) return;
  initialised = true;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const user = session?.user ?? null;
  const roles = user ? await loadRoles(user.id) : [];
  cache = { session, user, roles, loading: false };
  notify();
  if (user) void hydrateInstitute().catch(() => {});

  supabase.auth.onAuthStateChange(async (event, s) => {
    const u = s?.user ?? null;
    const r = u ? await loadRoles(u.id) : [];
    cache = { session: s, user: u, roles: r, loading: false };
    notify();
    if (u && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED")) {
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
