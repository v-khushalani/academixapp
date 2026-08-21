import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellOff, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  pendingApi,
  PENDING_LABEL,
  type PendingItem,
  type PendingKind,
  type PendingScope,
} from "@/lib/api/pending";
import { openWhatsApp } from "@/lib/whatsapp";

const ALL = "__all";

export function PendingQueue() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<PendingScope>("today");
  const [kind, setKind] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pending", scope],
    queryFn: () => pendingApi.list(scope),
  });

  const visible = useMemo(
    () => (kind === ALL ? items : items.filter((i) => i.kind === kind)),
    [items, kind],
  );
  const chosen = visible.filter((i) => selected.has(i.key));

  const refresh = () => {
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["pending"] });
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  const ignoreMut = useMutation({
    mutationFn: (rows: PendingItem[]) => pendingApi.ignore(rows),
    onSuccess: (_d, rows) => {
      toast.success(`${rows.length} message${rows.length === 1 ? "" : "s"} ignored`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sentMut = useMutation({
    mutationFn: (rows: PendingItem[]) => pendingApi.markSent(rows),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  function sendOne(item: PendingItem) {
    if (!item.phone) {
      toast.error(`No WhatsApp number saved for ${item.studentName}`);
      return;
    }
    openWhatsApp(item.phone, item.message);
    sentMut.mutate([item]);
  }

  async function sendMany(rows: PendingItem[]) {
    const withPhone = rows.filter((r) => r.phone);
    if (!withPhone.length) {
      toast.error("None of these have a WhatsApp number saved");
      return;
    }
    for (const r of withPhone) {
      openWhatsApp(r.phone, r.message);
      // Give the WhatsApp handover a beat so the browser does not swallow tabs.
      await new Promise((res) => setTimeout(res, 700));
    }
    sentMut.mutate(withPhone);
    toast.success(`Opened WhatsApp for ${withPhone.length} message(s)`);
  }

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const counts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.kind] = (acc[i.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={scope} onValueChange={(v) => setScope(v as PendingScope)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {(Object.keys(PENDING_LABEL) as PendingKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {PENDING_LABEL[k]}
                {counts[k] ? ` (${counts[k]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!chosen.length || ignoreMut.isPending}
            onClick={() => ignoreMut.mutate(chosen)}
          >
            <BellOff className="h-4 w-4" /> Ignore{chosen.length ? ` (${chosen.length})` : ""}
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!visible.length}
            onClick={() => sendMany(chosen.length ? chosen : visible)}
          >
            <Send className="h-4 w-4" />
            {chosen.length ? `Send ${chosen.length}` : `Send all (${visible.length})`}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {visible.length ? (
          <>
            <Checkbox
              checked={chosen.length === visible.length && visible.length > 0}
              onCheckedChange={(v) =>
                setSelected(v ? new Set(visible.map((i) => i.key)) : new Set())
              }
              aria-label="Select all"
            />
            <span>Select all</span>
          </>
        ) : null}
      </div>

      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</li>
        ) : visible.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing pending. Absent alerts and fee reminders show up here automatically.
          </li>
        ) : (
          visible.map((i) => (
            <li key={i.key} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                className="mt-1"
                checked={selected.has(i.key)}
                onCheckedChange={() => toggle(i.key)}
                aria-label={`Select ${i.studentName}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{i.studentName}</span>
                  <Badge
                    variant="secondary"
                    className={
                      i.urgency === "high" ? "bg-destructive/10 text-destructive" : undefined
                    }
                  >
                    {i.label}
                  </Badge>
                  {!i.phone ? (
                    <Badge variant="outline" className="text-[10px]">
                      No number
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground/80">
                  {i.message}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  title="Ignore"
                  onClick={() => ignoreMut.mutate([i])}
                >
                  <BellOff className="h-4 w-4" />
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => sendOne(i)}>
                  <MessageCircle className="h-4 w-4" /> Send
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
