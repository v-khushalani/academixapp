import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/dates";

export const Route = createFileRoute("/app/platform/users")({
  head: () => ({
    meta: [
      { title: "Accounts — Academix platform console" },
      {
        name: "description",
        content:
          "Every login on the Academix network, the institute it belongs to, and the option to erase an account completely.",
      },
      { property: "og:title", content: "Accounts — Academix platform console" },
      {
        property: "og:description",
        content: "Team Academix view of every login on the network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformUsers,
});

type PlatformUser = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[] | null;
  institutes: string[] | null;
  student_names: string[] | null;
};

function PlatformUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [erasing, setErasing] = useState<PlatformUser | null>(null);
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_users");
      if (error) throw error;
      return (data ?? []) as PlatformUser[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((u) =>
      [u.email, u.full_name, ...(u.roles ?? []), ...(u.institutes ?? []), ...(u.student_names ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data, q]);

  async function erase() {
    if (!erasing) return;
    setBusy(true);
    const { error } = await supabase.rpc("platform_delete_user", { _user_id: erasing.user_id });
    setBusy(false);
    if (error) return toast.error(error.message);
    setErasing(null);
    await qc.invalidateQueries({ queryKey: ["platform-users"] });
    await qc.invalidateQueries({ queryKey: ["platform-institutes"] });
    toast.success("Account erased — this person can join again from a fresh invite link.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-base font-semibold">Accounts</h2>
          <p className="text-xs text-muted-foreground">
            Erasing removes the login completely. The student or teacher record stays with the
            institute, so the same person can sign in again from a fresh invite link.
          </p>
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email, name or institute…"
            className="h-9 pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((u) => (
            <li key={u.user_id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.full_name || u.email || "Unnamed"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · joined {formatDate(u.created_at)}
                  {u.last_sign_in_at ? ` · last seen ${formatDate(u.last_sign_in_at)}` : ""}
                </p>
                {(u.student_names ?? []).length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">
                    Student record: {(u.student_names ?? []).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {(u.roles ?? []).map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">
                    {r}
                  </Badge>
                ))}
                {(u.institutes ?? []).map((n) => (
                  <Badge key={n} variant="outline" className="text-[10px]">
                    {n}
                  </Badge>
                ))}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                title="Erase this account completely"
                onClick={() => setErasing(u)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No accounts match that search.
            </li>
          )}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(erasing)}
        onOpenChange={(v) => !v && setErasing(null)}
        title={`Erase ${erasing?.email ?? "this account"}?`}
        description="The login, its roles and its profile are deleted for good. Any student or teacher record stays with the institute and is unlinked, so the person can sign in again using an invite link. An empty institute this person created by mistake is removed too."
        confirmLabel={busy ? "Erasing…" : "Erase account"}
        destructive
        onConfirm={() => void erase()}
      />
    </div>
  );
}
