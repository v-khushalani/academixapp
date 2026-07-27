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
import { leadsApi, studentsApi, type Lead, type LeadInsert, type Student } from "@/lib/api";
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
import type { Database } from "@/integrations/supabase/types";

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
  const [tab, setTab] = useState("leads");

  return (
    <>
      <PageHeader
        title="Admissions"
        description="Leads pipeline, pending applications, and the public QR."
      />
      <PageBody>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="leads">Leads pipeline</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="qr">Public QR</TabsTrigger>
            <TabsTrigger value="how">How it works</TabsTrigger>
          </TabsList>
          <TabsContent value="leads" className="mt-4">
            <LeadsBoard canWrite={canWrite} />
          </TabsContent>
          <TabsContent value="applications" className="mt-4">
            <ApplicationsList canWrite={canWrite} />
          </TabsContent>
          <TabsContent value="qr" className="mt-4">
            <QrPanel />
          </TabsContent>
          <TabsContent value="how" className="mt-4">
            <HowItWorks />
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
  const [preview, setPreview] = useState<Student | null>(null);
  const [credentials, setCredentials] = useState<ProvisionedAccount[] | null>(null);
  const provision = useServerFn(provisionPortalAccounts);

  const approveMut = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      await studentsApi.setApproval(id, decision);
      if (decision !== "approved") return null;
      const res = await provision({ data: { student_id: id } });
      return res.accounts;
    },
    onSuccess: (accounts, v) => {
      toast.success(v.decision === "approved" ? "Application approved" : "Application rejected");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["students", "pending"] });
      if (accounts && accounts.length > 0) setCredentials(accounts);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {s.onboarding_completed_at
                  ? new Date(s.onboarding_completed_at).toLocaleDateString()
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
                      onClick={() => approveMut.mutate({ id: s.id, decision: "approved" })}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
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
    `Namaste ${a.name},\n\nYour ${institute} portal login is ready.\n\nLogin page: ${typeof window !== "undefined" ? window.location.origin : ""}/login/student\nLogin ID: ${a.loginId}\n${a.password ? `Temporary password: ${a.password}\n\nPlease sign in and change your password.` : "Use your existing password."}`;

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

function ApplicantPreview({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useMemo(() => {
    setPhotoUrl(null);
    if (student?.photo_path) studentsApi.signedPhotoUrl(student.photo_path).then(setPhotoUrl);
  }, [student]);
  if (!student) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application · {student.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={student.full_name}
                className="h-36 w-full rounded-md border border-border object-cover"
              />
            ) : (
              <div className="grid h-36 w-full place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                {student.photo_path ? "Loading…" : "No photo"}
              </div>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">{student.admission_no}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <D k="Phone" v={student.phone} />
            <D k="Email" v={student.email} />
            <D k="Date of birth" v={student.dob} />
            <D k="Class" v={student.class} />
            <D k="Program" v={student.program} />
            <D k="Stream" v={student.stream?.toUpperCase() ?? null} />
            <D k="School" v={student.school} />
            <D k="Father" v={student.father_name} />
            <D k="Father phone" v={student.father_phone} />
            <D k="Mother" v={student.mother_name} />
            <D k="Mother phone" v={student.mother_phone} />
            <D k="Address" v={student.address} full />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function D({ k, v, full }: { k: string; v: string | null | undefined; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="text-sm">{v || "—"}</p>
    </div>
  );
}

/* -------------------- QR panel -------------------- */
function QrPanel() {
  const url = typeof window !== "undefined" ? `${window.location.origin}/apply` : "/apply";
  function copy() {
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  }
  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <div className="rounded-md bg-white p-4">
          <QRCodeSVG value={url} size={220} includeMargin />
        </div>
        <p className="mt-3 font-mono text-xs break-all">{url}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={copy}>
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <h3 className="text-base font-semibold">How to use this QR</h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>
            Print this QR and stick it at the reception or hand it to parents at a school visit.
          </li>
          <li>Parents scan the QR with any phone — no login needed.</li>
          <li>They fill in the admission form (child details, parents, class, program, photo).</li>
          <li>
            The submission shows up under the <b>Applications</b> tab as "Pending".
          </li>
          <li>
            Your reception / admin reviews and approves or rejects. Approved applicants become
            active students.
          </li>
        </ol>
      </div>
    </div>
  );
}

/* -------------------- How it works -------------------- */
function HowItWorks() {
  return (
    <div className="prose prose-sm max-w-none text-sm">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-base font-semibold">Admissions module — the flow</h3>
        <p className="mt-2 text-muted-foreground">
          Think of it as three lanes that feed each other:
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Lane n="1" title="Leads pipeline (Kanban)">
            Enquiries from parents you meet or receive calls from. Track them from <i>New</i> →{" "}
            <i>Contacted</i> → <i>Visit</i> → <i>Demo</i> → <i>Enrolled</i>. Update the stage in one
            click. This is your day-to-day sales board.
          </Lane>
          <Lane n="2" title="Applications (self-serve)">
            The parent fills the full form themselves — either via the Quick Admit link you send, or
            by scanning the public QR at your reception. Applications land here as <b>Pending</b>.
            Your admin approves or rejects. Approved applicants become students automatically.
          </Lane>
          <Lane n="3" title="Public QR">
            One QR code printed at reception. Anyone scans → fills form → application lands in the
            queue. Zero data entry for staff, zero cost.
          </Lane>
        </div>

        <h4 className="mt-6 font-semibold">Recommended workflow</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <b>Parent visits or calls:</b> receptionist adds a <b>Lead</b> and shares the QR / Quick
            Admit link.
          </li>
          <li>
            <b>Parent fills the form on their phone.</b> Application enters the <b>Applications</b>{" "}
            tab.
          </li>
          <li>
            <b>Admin reviews the photo + details</b> → clicks Approve. Student becomes active and
            can be assigned a batch on the Students page.
          </li>
          <li>
            <b>Move the lead</b> to "Enrolled" and you're done.
          </li>
        </ul>

        <h4 className="mt-6 font-semibold">Why this is better than paper forms</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>No manual data entry — parent's own typing goes straight into your database.</li>
          <li>Photo, DOB, parent phone all captured in one go.</li>
          <li>Approval step keeps the "real students" list clean.</li>
          <li>Zero cost: no WhatsApp API, no SMS, no third-party form service.</li>
        </ul>
      </div>
    </div>
  );
}

function Lane({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {n}
        </Badge>
        <p className="font-medium">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
