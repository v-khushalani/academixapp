import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, Send, XCircle } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchesApi, studentsApi } from "@/lib/api";
import { messagesApi, MESSAGE_KINDS, type MessageKind } from "@/lib/api/messages";
import { getInstitute, getTemplates } from "@/lib/academy-settings";
import { openWhatsApp, renderTemplate } from "@/lib/whatsapp";
import { formatDateTime } from "@/lib/dates";
import { PendingQueue } from "@/components/app/pending-queue";

export const Route = createFileRoute("/app/messages")({
  component: MessagesPage,
});

const ALL = "__all";

function MessagesPage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [batchId, setBatchId] = useState(ALL);
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list() });
  const filters = {
    from: from || undefined,
    to: to || undefined,
    kind: kind === ALL ? undefined : kind,
    status: status === ALL ? undefined : status,
    batchId: batchId === ALL ? undefined : batchId,
  };
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["messages", filters],
    queryFn: () => messagesApi.list(filters),
  });

  const sentCount = rows.filter((r) => r.status === "sent" || r.status === "delivered").length;

  return (
    <>
      <PageHeader
        title="Messages"
        description="Every WhatsApp message Academix has prepared for you, and who it went to."
        actions={
          <Button className="gap-1.5" onClick={() => setComposeOpen(true)}>
            <Send className="h-4 w-4" /> Send message
          </Button>
        }
      />
      <PageBody>
        <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {(["pending", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "pending" ? (
          <PendingQueue />
        ) : (
          <>
          <div className="flex flex-wrap items-end gap-2">
            <Filter label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-[150px]" />
            </Filter>
            <Filter label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-[150px]" />
            </Filter>
            <Filter label="Batch">
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Type">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {Object.entries(MESSAGE_KINDS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${rows.length} message${rows.length === 1 ? "" : "s"} · ${sentCount} sent`}
          </p>

          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {rows.length === 0 && !isLoading ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No messages yet. Fee reminders, absent alerts and results land here once sent.
              </li>
            ) : null}
            {rows.map((r) => (
              <li key={r.id} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 shrink-0">
                  {r.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {r.recipient_name || r.student?.full_name || "—"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {MESSAGE_KINDS[r.kind as MessageKind] ?? r.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(r.sent_at ?? r.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                    {r.message}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </PageBody>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={(v) => {
          setComposeOpen(v);
          if (!v) qc.invalidateQueries({ queryKey: ["messages"] });
        }}
      />
    </>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const PRESETS: { key: MessageKind; label: string; body: () => string }[] = [
  { key: "fee_reminder", label: "Fee reminder", body: () => getTemplates().fee_pending },
  { key: "attendance_absent", label: "Attendance alert", body: () => getTemplates().attendance_absent },
  {
    key: "result",
    label: "Result",
    body: () =>
      "Hello {{parent_name}},\n\n{{student_name}}'s latest test result is ready. Please check the parent portal or contact us for details.\n\nRegards,\n{{academy_name}}",
  },
  {
    key: "manual",
    label: "Custom message",
    body: () => "Hello {{parent_name}},\n\n\n\nRegards,\n{{academy_name}}",
  },
];

function ComposeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [batchId, setBatchId] = useState(ALL);
  const [presetKey, setPresetKey] = useState<MessageKind>("fee_reminder");
  const [body, setBody] = useState(PRESETS[0]!.body());
  const [done, setDone] = useState<Record<string, boolean>>({});

  const { data: batches = [] } = useQuery({ queryKey: ["batches"], queryFn: () => batchesApi.list() });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });

  const recipients = useMemo(
    () => students.filter((s) => (batchId === ALL ? true : s.batch_id === batchId)),
    [students, batchId],
  );

  function pick(k: MessageKind) {
    setPresetKey(k);
    const p = PRESETS.find((x) => x.key === k);
    if (p) setBody(p.body());
  }

  function send(s: (typeof recipients)[number]) {
    const inst = getInstitute();
    const msg = renderTemplate(body, {
      student_name: s.full_name,
      parent_name: s.parent_name || s.father_name || "Parent",
      batch_name: s.batch?.name ?? "—",
      academy_name: inst.name,
    });
    const phone = s.parent_phone || s.phone;
    const ok = openWhatsApp(phone, msg);
    void messagesApi
      .log([
        {
          kind: presetKey,
          title: PRESETS.find((p) => p.key === presetKey)?.label ?? "Message",
          message: msg,
          status: ok ? "sent" : "failed",
          recipient_name: s.full_name,
          recipient_phone: phone ?? null,
          student_id: s.id,
        },
      ])
      .catch(() => {});
    if (!ok) {
      toast.error(`No phone number on file for ${s.full_name}.`);
      return;
    }
    setDone((d) => ({ ...d, [s.id]: true }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send a message</DialogTitle>
          <DialogDescription>
            WhatsApp opens with the text ready — you press send. Each one is recorded here.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All students</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={presetKey} onValueChange={(v) => pick(v as MessageKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="msg-body">Message</Label>
          <Textarea id="msg-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">
            {"{{student_name}}, {{parent_name}}, {{batch_name}}, {{academy_name}} fill in automatically."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>
            Recipients ({recipients.length}) · sent {Object.keys(done).length}
          </Label>
          <ul className="max-h-52 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {recipients.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                No students in this batch.
              </li>
            ) : null}
            {recipients.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{s.full_name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {s.batch?.name ?? "No batch"}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={done[s.id] ? "ghost" : "outline"}
                  className="gap-1.5"
                  onClick={() => send(s)}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-success" />
                  {done[s.id] ? "Sent" : "Send"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
