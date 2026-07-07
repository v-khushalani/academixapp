import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leadsApi, type Lead, type LeadInsert } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";
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
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canWrite = can("lead:write", roles);
  const { data = [], isLoading } = useQuery({ queryKey: ["leads"], queryFn: () => leadsApi.list() });
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<Stage, Lead[]> = { new: [], contacted: [], visit_scheduled: [], demo: [], negotiation: [], enrolled: [], lost: [] };
    data.forEach((l) => g[l.stage].push(l));
    return g;
  }, [data]);

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => leadsApi.updateStage(id, stage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => leadsApi.remove(id),
    onSuccess: () => { toast.success("Lead removed"); qc.invalidateQueries({ queryKey: ["leads"] }); },
  });

  return (
    <>
      <PageHeader
        title="Admissions"
        description={`${data.length} leads in the funnel`}
        actions={canWrite ? <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add lead</Button> : null}
      />
      <PageBody>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => (
              <div key={s.key} className="min-w-[240px] flex-1 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</h3>
                  <span className="text-xs text-muted-foreground">{grouped[s.key].length}</span>
                </div>
                <div className="space-y-2 p-2">
                  {grouped[s.key].map((l) => (
                    <div key={l.id} className="group rounded-md border border-border bg-background p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{l.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{l.phone ?? l.email ?? "—"}</p>
                        </div>
                        {canWrite && (
                          <button onClick={() => delMut.mutate(l.id)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Remove">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        )}
                      </div>
                      {l.course_interest && <p className="mt-1 text-[11px] text-muted-foreground">Interest: {l.course_interest}</p>}
                      {canWrite && (
                        <Select value={l.stage} onValueChange={(v) => stageMut.mutate({ id: l.id, stage: v as Stage })}>
                          <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STAGES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}
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
      </PageBody>
      <LeadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function LeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<LeadInsert>({ full_name: "", stage: "new" });
  const mut = useMutation({
    mutationFn: (i: LeadInsert) => leadsApi.create(i),
    onSuccess: () => { toast.success("Lead added"); qc.invalidateQueries({ queryKey: ["leads"] }); onOpenChange(false); setF({ full_name: "", stage: "new" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); mut.mutate(f); }} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Source</Label><Input placeholder="Referral, Google, walk-in…" value={f.source ?? ""} onChange={(e) => setF({ ...f, source: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Course interest</Label><Input value={f.course_interest ?? ""} onChange={(e) => setF({ ...f, course_interest: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Input value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}