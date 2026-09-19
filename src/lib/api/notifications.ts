import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  batch_id: string | null;
  created_at: string;
  read: boolean;
};

export const notificationsApi = {
  /** Latest updates the signed-in person is allowed to see, with their own read state. */
  async feed(limit = 30): Promise<AppNotification[]> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, batch_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = data ?? [];
    if (!uid || rows.length === 0) return rows.map((r) => ({ ...r, read: false }));

    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", uid)
      .in(
        "notification_id",
        rows.map((r) => r.id),
      );
    const seen = new Set((reads ?? []).map((r) => r.notification_id));
    return rows.map((r) => ({ ...r, read: seen.has(r.id) }));
  },

  /** Mark the given updates as read for the signed-in person. */
  async markRead(ids: string[]) {
    if (ids.length === 0) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from("notification_reads")
      .upsert(
        ids.map((id) => ({ notification_id: id, user_id: uid })),
        { onConflict: "notification_id,user_id" },
      );
    if (error) throw error;
  },

  /** Staff-written announcement (optionally to one batch only). */
  async create(input: {
    title: string;
    body?: string | null;
    batch_id?: string | null;
    kind?: "timetable" | "test" | "fee" | "general";
    link?: string | null;
  }) {
    const { data, error } = await supabase
      .from("notifications")
      .insert({ kind: "general", ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
