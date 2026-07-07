import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { coursesApi, subjectsApi, userRolesApi, type AppRole } from "@/lib/api";
import { getInstitute, saveInstitute, getTemplates, saveTemplates, type InstituteSettings } from "@/lib/academy-settings";
import { WA_TEMPLATES, type WhatsAppTemplateKey } from "@/lib/whatsapp";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Configure your academy — everything here is live." />
      <PageBody>
        <Tabs defaultValue="institute" className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="institute">Institute</TabsTrigger>
            <TabsTrigger value="courses">Courses & Subjects</TabsTrigger>
            <TabsTrigger value="fees">Fee structures</TabsTrigger>
            <TabsTrigger value="users">Users & roles</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp templates</TabsTrigger>
          </TabsList>
          <TabsContent value="institute"><InstitutePanel /></TabsContent>
          <TabsContent value="courses"><CoursesPanel /></TabsContent>
          <TabsContent value="fees"><FeesPanel /></TabsContent>
          <TabsContent value="users"><UsersPanel /></TabsContent>
          <TabsContent value="branding"><BrandingPanel /></TabsContent>
          <TabsContent value="whatsapp"><TemplatesPanel /></TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InstitutePanel() {
  const [s, setS] = useState<InstituteSettings>(getInstitute());
  useEffect(() => { setS(getInstitute()); }, []);
  function submit(e: FormEvent) {
    e.preventDefault();
    saveInstitute(s);
    toast.success("Institute details saved");
  }
  return (
    <Card title="Institute details" description="Used across receipts, WhatsApp messages, and printed reports.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <F label="Institute name"><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required /></F>
        <F label="Tagline"><Input value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} placeholder="Learn. Grow. Excel." /></F>
        <F label="Contact phone"><Input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} /></F>
        <F label="Contact email"><Input type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} /></F>
        <F label="Academic year"><Input value={s.academic_year} onChange={(e) => setS({ ...s, academic_year: e.target.value })} placeholder="2026-27" /></F>
        <F label="Address" cls="sm:col-span-2"><Textarea rows={2} value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} /></F>
        <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save</Button></div>
      </form>
    </Card>
  );
}

function CoursesPanel() {
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => coursesApi.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => subjectsApi.list() });
  const [cName, setCName] = useState(""); const [cCode, setCCode] = useState("");
  const [sName, setSName] = useState(""); const [sCourse, setSCourse] = useState<string>("");

  const addCourse = useMutation({
    mutationFn: () => coursesApi.create({ name: cName.trim(), code: cCode.trim() || null }),
    onSuccess: () => { toast.success("Course added"); setCName(""); setCCode(""); qc.invalidateQueries({ queryKey: ["courses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCourse = useMutation({ mutationFn: (id: string) => coursesApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }), onError: (e: Error) => toast.error(e.message) });
  const addSubject = useMutation({
    mutationFn: () => subjectsApi.create({ name: sName.trim(), course_id: sCourse || null }),
    onSuccess: () => { toast.success("Subject added"); setSName(""); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delSubject = useMutation({ mutationFn: (id: string) => subjectsApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }), onError: (e: Error) => toast.error(e.message) });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Courses">
        <form onSubmit={(e) => { e.preventDefault(); if (cName.trim()) addCourse.mutate(); }} className="flex flex-wrap gap-2">
          <Input placeholder="Course name (e.g. JEE Foundation)" value={cName} onChange={(e) => setCName(e.target.value)} className="min-w-[160px] flex-1" />
          <Input placeholder="Code" value={cCode} onChange={(e) => setCCode(e.target.value)} className="w-24" />
          <Button type="submit" size="sm" className="gap-1"><Plus className="h-4 w-4" />Add</Button>
        </form>
        <ul className="mt-3 divide-y divide-border">
          {courses.length === 0 && <li className="py-3 text-xs text-muted-foreground">No courses yet.</li>}
          {courses.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span>{c.name}{c.code ? <span className="ml-2 text-xs text-muted-foreground">{c.code}</span> : null}</span>
              <button onClick={() => delCourse.mutate(c.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Subjects">
        <form onSubmit={(e) => { e.preventDefault(); if (sName.trim()) addSubject.mutate(); }} className="flex flex-wrap gap-2">
          <Input placeholder="Subject (e.g. Physics)" value={sName} onChange={(e) => setSName(e.target.value)} className="min-w-[140px] flex-1" />
          <Select value={sCourse || "none"} onValueChange={(v) => setSCourse(v === "none" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— none —</SelectItem>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" className="gap-1"><Plus className="h-4 w-4" />Add</Button>
        </form>
        <ul className="mt-3 divide-y divide-border">
          {subjects.length === 0 && <li className="py-3 text-xs text-muted-foreground">No subjects yet.</li>}
          {subjects.map((s) => {
            const courseName = (s as { course?: { name?: string } }).course?.name;
            return (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span>{s.name}{courseName ? <span className="ml-2 text-xs text-muted-foreground">· {courseName}</span> : null}</span>
                <button onClick={() => delSubject.mutate(s.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function FeesPanel() {
  return (
    <Card title="Fee structures" description="Per-batch default fees are the source of truth — every student in the batch auto-inherits them, with optional scholarship % and flat discount at the student level.">
      <div className="space-y-2 text-sm">
        <p>Set or update a batch's default fee on the <Link to="/app/batches" className="font-medium text-primary underline">Batches</Link> page. Changes propagate to all students in that batch automatically.</p>
        <p className="text-muted-foreground">Per-student overrides live on the student profile → Scholarship % / Discount fields.</p>
      </div>
    </Card>
  );
}

const ALL_ROLES: AppRole[] = ["owner","admin","faculty","receptionist","counsellor","accountant","student","parent"];

function UsersPanel() {
  const qc = useQueryClient();
  const { roles: myRoles, user } = useAuth();
  const canManage = myRoles.includes("owner") || myRoles.includes("admin");
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users-with-roles"], queryFn: () => userRolesApi.listAll() });

  const addRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: AppRole }) => userRolesApi.addRole(uid, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-with-roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const removeRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: AppRole }) => userRolesApi.removeRole(uid, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-with-roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card title="Users & roles" description={canManage ? "Assign one or more roles per user. Owners can never lose their last owner role." : "Only owners/admins can edit roles."}>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      <ul className="divide-y divide-border">
        {users.length === 0 && !isLoading && <li className="py-3 text-xs text-muted-foreground">No users yet.</li>}
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{u.full_name || "(no name)"}{u.id === user?.id ? <span className="ml-1 text-xs text-muted-foreground">· you</span> : null}</p>
              <p className="truncate text-xs text-muted-foreground">{u.phone || u.id}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {u.roles.length === 0 && <span className="text-xs text-muted-foreground">no roles</span>}
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1 text-[10px]">
                    {r}
                    {canManage && (
                      <button onClick={() => removeRole.mutate({ uid: u.id, role: r })} className="ml-1 opacity-60 hover:opacity-100" aria-label={`Remove ${r}`}>×</button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
            {canManage && (
              <Select value="" onValueChange={(v) => addRole.mutate({ uid: u.id, role: v as AppRole })}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Add role" /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter((r) => !u.roles.includes(r)).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BrandingPanel() {
  const [s, setS] = useState<InstituteSettings>(getInstitute());
  useEffect(() => { setS(getInstitute()); }, []);
  return (
    <Card title="Branding" description="Primary colour applies live across the app. Leave empty to use the default theme colour.">
      <div className="flex flex-wrap items-end gap-3">
        <F label="Primary colour">
          <Input type="color" value={s.primary_color || "#4f46e5"} onChange={(e) => setS({ ...s, primary_color: e.target.value })} className="h-10 w-20 p-1" />
        </F>
        <F label="Hex value">
          <Input value={s.primary_color} onChange={(e) => setS({ ...s, primary_color: e.target.value })} placeholder="#4f46e5" className="w-32" />
        </F>
        <Button onClick={() => { saveInstitute(s); toast.success("Branding applied"); }}>Apply</Button>
        <Button variant="outline" onClick={() => { const ns = { ...s, primary_color: "" }; setS(ns); saveInstitute(ns); toast.success("Reset to default"); }}>Reset</Button>
      </div>
    </Card>
  );
}

function TemplatesPanel() {
  const [tpls, setTpls] = useState<Record<WhatsAppTemplateKey, string>>(getTemplates());
  useEffect(() => { setTpls(getTemplates()); }, []);
  const keys = Object.keys(WA_TEMPLATES) as WhatsAppTemplateKey[];
  return (
    <Card title="WhatsApp message templates" description="Placeholders like {{student_name}}, {{parent_name}}, {{batch_name}}, {{amount_due}}, {{due_date}} are auto-filled at send time.">
      <div className="space-y-4">
        {keys.map((k) => (
          <div key={k}>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</Label>
            <Textarea rows={5} value={tpls[k]} onChange={(e) => setTpls({ ...tpls, [k]: e.target.value })} className="mt-1 font-mono text-xs" />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setTpls(WA_TEMPLATES); saveTemplates(WA_TEMPLATES); toast.success("Reset to defaults"); }}>Reset</Button>
          <Button onClick={() => { saveTemplates(tpls); toast.success("Templates saved"); }}>Save</Button>
        </div>
      </div>
    </Card>
  );
}

function F({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return <div className={`space-y-1.5 ${cls ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}