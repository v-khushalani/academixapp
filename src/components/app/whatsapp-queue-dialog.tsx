import { useEffect, useState } from "react";
import { Check, MessageCircle, SkipForward } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type QueueItem = { id: string; name: string; sub?: string };

/** Sequential WhatsApp sender: one tap per parent, browsers block bulk pop-ups. */
export function WhatsAppQueueDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  items: QueueItem[];
  onSend: (item: QueueItem) => Promise<boolean> | boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [sent, setSent] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setIdx(0);
      setSent(0);
    }
  }, [open]);
  const done = idx >= items.length;
  const cur = items[idx];

  async function send() {
    if (!cur) return;
    setBusy(true);
    try {
      if (await onSend(cur)) setSent((n) => n + 1);
    } finally {
      setBusy(false);
      setIdx((i) => i + 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Progress value={items.length ? (Math.min(idx, items.length) / items.length) * 100 : 100} />
        <p className="text-xs text-muted-foreground">
          {Math.min(idx, items.length)} of {items.length} done · {sent} opened in WhatsApp
        </p>
        {done ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Check className="h-8 w-8 text-success" />
            <p className="font-medium">Queue complete</p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="font-medium">{cur.name}</p>
              {cur.sub && <p className="text-sm text-muted-foreground">{cur.sub}</p>}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-1.5" onClick={send} disabled={busy}>
                <MessageCircle className="h-4 w-4" /> Send &amp; next
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => setIdx((i) => i + 1)} disabled={busy}>
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </div>
            {idx + 1 < items.length && (
              <p className="text-xs text-muted-foreground">
                Next: {items.slice(idx + 1, idx + 4).map((i) => i.name).join(", ")}
                {items.length - idx - 1 > 3 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
