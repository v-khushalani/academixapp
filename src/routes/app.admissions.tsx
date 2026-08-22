import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Copy, ExternalLink, Printer } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { batchesApi, leadsApi, studentsApi, type Lead, type LeadInsert, type Student } from "@/lib/api";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  provisionPortalAccounts,
  type ProvisionedAccount,
} from "@/lib/provisioning.functions";
import { openWhatsApp } from "@/lib/whatsapp";
import { getInstitute } from "@/lib/academy-settings";
import { ApplicantPreview } from "@/components/app/applicant-preview";
import { EnquiryRecords } from "@/components/app/enquiry-records";
import type { Database } from "@/integrations/supabase/types";
import { formatDate } from "@/lib/dates";

type Stage = Database["public"]["Enums"]["lead_stage"];
const STAGES: { key: Stage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "visit_scheduled", label: "Visit" },
  { key: "demo", label: "Demo" },
  { key: "negotiation", label: "Negotiation" },
  { key: "enrolled", label: "Enrolled" },
  { key: "lost", label: "Lost" },
];

export const Route = createFileRoute("/app/admissions")({
  component: AdmissionsPage,
});

function AdmissionsPage() {
  const { roles } = useAuth();
  const canWrite = can("lead:write", roles);
  const [tab, setTab] = useState("applications");

  return (
    <>
      <PageHeader
        title="Admissions"
        description="One QR → parent fills the form → you approve and give a batch. Everything not admitted stays in follow-ups."
      />
      <PageBody>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="records">Follow-ups</TabsTrigger>
            <TabsTrigger value="qr">QR &amp; link</TabsTrigger>
          </TabsList>
          <TabsContent value="applications" className="mt-4">
            <ApplicationsList canWrite={canWrite} />
          </TabsContent>
          <TabsContent value="records" className="mt-4 space-y-8">
            <EnquiryRecords canWrite={canWrite} />
            <div>
              <h2 className="mb-2 text-sm font-semibold">Walk-in / call leads</h2>
              <LeadsBoard canWrite={canWrite} />
            </div>
          </TabsContent>
          <TabsContent value="qr" className="mt-4">
            <QrPanel />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

/* -------------------- Leads Kanban -------------------- */
function LeadsBoard({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list(),
  });
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<Stage, Lead[]> = {
      new: [],
      contacted: [],
      visit_scheduled: [],
      demo: [],
      negotiation: [],
      enrolled: [],
      lost: [],
    };
    data.forEach((l) => g[l.stage].push(l));
    return g;
  }, [data]);

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => leadsApi.updateStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => leadsApi.remove(id),
    onSuccess: () => {
      toast.success("Lead removed");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} leads in the funnel</p>
        {canWrite && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div
              key={s.key}
              className="min-w-[240px] flex-1 rounded-lg border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </h3>
                <span className="text-xs text-muted-foreground">{grouped[s.key].length}</span>
              </div>
              <div className="space-y-2 p-2">
                {grouped[s.key].map((l) => (
                  <div
                    key={l.id}
                    className="group rounded-md border border-border bg-background p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.phone ?? l.email ?? "—"}
                        </p>
                      </div>
                      {canWrite && (
                        <button
                          onClick={() => delMut.mutate(l.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                    {l.course_interest && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Interest: {l.course_interest}
                      </p>
                    )}
                    {canWrite && (
                      <Select
                        value={l.stage}
                        onValueChange={(v) => stageMut.mutate({ id: l.id, stage: v as Stage })}
                      >
                        <SelectTrigger className="mt-2 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((x) => (
                            <SelectItem key={x.key} value={x.key}>
                              {x.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <LeadDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function LeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<LeadInsert>({ full_name: "", stage: "new" });
  const mut = useMutation({
    mutationFn: (i: LeadInsert) => leadsApi.create(i),
    onSuccess: () => {
      toast.success("Lead added");
      qc.invalidateQueries({ queryKey: ["leads"] });
      onOpenChange(false);
      setF({ full_name: "", stage: "new" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            mut.mutate(f);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name</Label>
            <Input
              value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={f.email ?? ""}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input
              placeholder="Referral, Google, walk-in…"
              value={f.source ?? ""}
              onChange={(e) => setF({ ...f, source: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Course interest</Label>
            <Input
              value={f.course_interest ?? ""}
              onChange={(e) => setF({ ...f, course_interest: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Input value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Applications (pending approval) -------------------- */
function ApplicationsList({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["students", "pending"],
    queryFn: () => studentsApi.list({ approval: "pending" }),
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
  });
  const [preview, setPreview] = useState<Student | null>(null);
  const [credentials, setCredentials] = useState<ProvisionedAccount[] | null>(null);
  const [admitting, setAdmitting] = useState<Student | null>(null);
  const [batchId, setBatchId] = useState("");
  const [token, setToken] = useState(0);
  const provision = useServerFn(provisionPortalAccounts);
  const refresh = useRefreshLinked();

  const approveMut = useMutation({
    mutationFn: async ({
      id,
      decision,
      batch_id,
      token_amount,
    }: {
      id: string;
      decision: "approved" | "rejected";
      batch_id?: string;
      token_amount?: number;
    }) => {
      if (decision !== "approved") {
        await studentsApi.setApproval(id, decision);
        return null;
      }
      await studentsApi.approveWithBatch(id, batch_id!, token_amount);
      const res = await provision({ data: { student_id: id } });
      return res.accounts;
    },
    onSuccess: (accounts, v) => {
      toast.success(
        v.decision === "approved"
          ? "Admitted — batch assigned and fees created"
          : "Moved to enquiry records",
      );
      refresh();
      qc.invalidateQueries({ queryKey: ["students", "pending"] });
      setAdmitting(null);
      if (accounts && accounts.length > 0) setCredentials(accounts);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdmit(s: Student) {
    setAdmitting(s);
    setBatchId(s.batch_id ?? "");
    setToken(Number(s.token_amount ?? 0));
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.length === 0)
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-medium">No pending applications</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Share the QR from the "Public QR" tab to start collecting applications.
        </p>
      </div>
    );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Applicant</th>
            <th className="px-4 py-3">Class</th>
            <th className="px-4 py-3">Program</th>
            <th className="px-4 py-3">Parent</th>
            <th className="px-4 py-3">Token paid</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">
                <button className="text-left" onClick={() => setPreview(s)}>
                  <p className="font-medium hover:underline">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.phone ?? "—"} · {s.admission_no}
                  </p>
                </button>
              </td>
              <td className="px-4 py-3">{s.class ?? "—"}</td>
              <td className="px-4 py-3 capitalize">
                {s.program ?? "—"}
                {s.stream ? ` · ${s.stream.toUpperCase()}` : ""}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm">{s.father_name || s.mother_name || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.father_phone || s.mother_phone || "—"}
                </p>
              </td>
              <td className="px-4 py-3 text-sm">
                {Number(s.token_amount ?? 0) > 0
                  ? "₹" + Number(s.token_amount).toLocaleString("en-IN")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {s.onboarding_completed_at
                  ? formatDate(s.onboarding_completed_at)
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {canWrite && (
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setPreview(s)}>
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      onClick={() => approveMut.mutate({ id: s.id, decision: "rejected" })}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => openAdmit(s)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Admit
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ApplicantPreview student={preview} onClose={() => setPreview(null)} />
      <CredentialsDialog accounts={credentials} onClose={() => setCredentials(null)} />

      <Dialog open={Boolean(admitting)} onOpenChange={(v) => !v && setAdmitting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Admit {admitting?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              The batch fee is applied automatically once admitted. Payments, scholarship and
              discount are handled from the Fees page.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitting(null)}>
              Cancel
            </Button>
            <Button
              disabled={!batchId || approveMut.isPending}
              onClick={() =>
                admitting &&
                approveMut.mutate({
                  id: admitting.id,
                  decision: "approved",
                  batch_id: batchId,
                  token_amount: token,
                })
              }
            >
              {approveMut.isPending ? "Admitting…" : "Confirm admission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredentialsDialog({
  accounts,
  onClose,
}: {
  accounts: ProvisionedAccount[] | null;
  onClose: () => void;
}) {
  if (!accounts) return null;
  const institute = getInstitute().name || "our institute";

  const message = (a: ProvisionedAccount) =>
    `Namaste ${a.name},\n\nYour ${institute} portal login is ready.\n\nLogin page: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nLogin ID: ${a.loginId}\n${a.password ? `Temporary password: ${a.password}\n\nPlease sign in and change your password.` : "Use your existing password."}`;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Portal logins created</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share these credentials over WhatsApp. Passwords are shown only once.
        </p>
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.kind + a.loginId} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {a.kind} · {a.name}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">ID: {a.loginId}</p>
                  <p className="text-xs text-muted-foreground">
                    Password: {a.password ?? "(existing account — unchanged)"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(message(a));
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={!a.phone}
                    onClick={() => {
                      if (!openWhatsApp(a.phone, message(a))) toast.error("No valid phone number");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- QR panel -------------------- */
function QrCard({
  title,
  blurb,
  url,
}: {
  title: string;
  blurb: string;
  url: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
      <div className="mt-4 rounded-md bg-white p-3">
        <QRCodeSVG value={url} size={180} includeMargin />
      </div>
    </div>
  );
}

function QrPanel() {
  const slug = getInstitute().slug;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const q = slug ? `i=${encodeURIComponent(slug)}&` : "";
  const enquiryUrl = `${base}/apply?${q}mode=enquiry`;
  const admissionUrl = `${base}/apply?${q}mode=admission`;

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        <QrCard
          title="Enquiry QR"
          blurb="5 fields · for hoardings, school visits, walk-ins"
          url={enquiryUrl}
        />
        <QrCard
          title="Admission QR"
          blurb="Full details + photo · for parents ready to join"
          url={admissionUrl}
        />
      </div>
      <div className="space-y-3 text-sm">
        <h3 className="text-base font-semibold">How the admissions funnel works</h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>
            <b>Enquiry QR</b> — someone just asking about fees or timing scans this and gives only
            student name, parent name, phone, class and interest. It lands in <b>Follow-ups</b>.
          </li>
          <li>
            <b>Follow-ups</b> — your counsellor calls them, notes what happened, and when the
            parent agrees, sends them the admission link (or fills it at the desk).
          </li>
          <li>
            <b>Admission QR</b> — full form: child details, both parents, address, program and
            photo. It lands in <b>Applications</b> within seconds.
          </li>
          <li>
            <b>Approve</b> — you verify the details and pick a batch. The student goes live and the
            batch fee is assigned automatically on the Fees page.
          </li>
          <li>
            Anyone you do not admit stays in <b>Follow-ups</b> so nobody is lost.
          </li>
        </ol>
        <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Rule of thumb: enquiry QR on anything public (banner, pamphlet, WhatsApp status),
          admission QR only after the parent has said yes.
        </p>
        {!slug && (
          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Tip: open the app once as an admin so your institute code loads — the link then tags
            every submission to your institute.
          </p>
        )}
      </div>
    </div>
  );
}
