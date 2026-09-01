import { createFileRoute, Link } from "@tanstack/react-router";
import { useFeatures } from "@/hooks/use-features";
import { ALWAYS_ON, FEATURE_GROUPS, FEATURES, isFeatureOn } from "@/lib/features";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { PlanUsageCard, LoginsHelpCard } from "@/components/app/plan-usage";
import { DevicesPanel } from "@/components/app/devices-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { batchesApi, instituteApi, roomsApi, userRolesApi, type AppRole } from "@/lib/api";
import { planFor } from "@/lib/plans";
import {
  getInstitute,
  saveInstitute,
  getTemplates,
  saveTemplates,
  DEFAULT_SHIFTS,
  RECEIPT_TEMPLATES,
  canUseOwnBranding,
  type InstituteSettings,
  type ReceiptTemplate,
  type ReceiptPaper,
  type Shifts,
} from "@/lib/academy-settings";
import { receiptPreviewUrl } from "@/lib/receipt";
import { WA_TEMPLATES, type WhatsAppTemplateKey } from "@/lib/whatsapp";
import { InstallmentPlanEditor } from "@/components/app/installment-plan-editor";
import { DEFAULT_PLAN, type Installment } from "@/lib/installments";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your academy — everything here is live."
      />
      <PageBody>
        <Tabs defaultValue="institute" className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="institute">Institute</TabsTrigger>
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="team">Team &amp; access</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="brand-print">Brand &amp; print</TabsTrigger>
          </TabsList>
          <TabsContent value="institute">
            <InstitutePanel />
            <ModulesPanel />
          </TabsContent>
          <TabsContent value="academics">
            <div className="space-y-4">
              <RoomsPanel />
              <ShiftTimingsPanel />
              <FeesPanel />
            </div>
          </TabsContent>
          <TabsContent value="team">
            <div className="space-y-4">
              <UsersPanel />
              <PlanUsageCard />
              <LoginsHelpCard />
              {getInstitute().attendance_devices ? (
                <DevicesPanel />
              ) : (
                <Card
                  title="Attendance machines"
                  description="RFID and biometric attendance is available on paid plans."
                >
                  <Button asChild variant="outline">
                    <Link to="/pricing">View plans</Link>
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="communication">
            <TemplatesPanel />
          </TabsContent>
          <TabsContent value="brand-print">
            <div className="space-y-4">
              <BrandingPanel />
              <ReceiptsPanel />
            </div>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
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
  useEffect(() => {
    setS(getInstitute());
  }, []);

  /** Logos are downscaled to a 256px PNG and stored inline, so they work offline and in PDFs. */
  function pickLogo(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const scale = Math.min(size / img.width, size / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setS((prev) => ({ ...prev, logo_url: canvas.toDataURL("image/png") }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await saveInstitute(s);
      toast.success("Institute details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save institute details");
    }
  }
  return (
    <Card
      title="Institute details"
      description="Used across receipts, WhatsApp messages, and printed reports."
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        {!canUseOwnBranding(s.plan) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground sm:col-span-2">
            <strong className="font-medium text-foreground">Free plan:</strong> receipts, payment
            QRs and portals carry Academix branding. Upgrade to Growth or Campus to show your own
            logo and institute name on everything parents see.
          </div>
        )}
        <div className="flex flex-col gap-4 rounded-lg border border-border p-3 sm:col-span-2 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {s.logo_url ? (
              <img src={s.logo_url} alt="Institute logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Institute logo</p>
            <p className="text-xs text-muted-foreground">
              Shown in the sidebar, receipts and shared reports. PNG or JPG, square works best.
            </p>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="h-9 w-full sm:max-w-[220px] text-xs"
                onChange={(e) => pickLogo(e.target.files?.[0])}
              />
              {s.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setS({ ...s, logo_url: "" })}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
        <F label="Institute name">
          <Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required />
        </F>
        <F label="Tagline">
          <Input
            value={s.tagline}
            onChange={(e) => setS({ ...s, tagline: e.target.value })}
            placeholder="Learn. Grow. Excel."
          />
        </F>
        <F label="Contact phone">
          <Input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} />
        </F>
        <F label="Contact email">
          <Input
            type="email"
            value={s.email}
            onChange={(e) => setS({ ...s, email: e.target.value })}
          />
        </F>
        <F label="Academic year">
          <Input
            value={s.academic_year}
            onChange={(e) => setS({ ...s, academic_year: e.target.value })}
            placeholder="2026-27"
          />
        </F>
        <F label="UPI ID (for fee QR)">
          <Input
            value={s.upi_id}
            onChange={(e) => setS({ ...s, upi_id: e.target.value })}
            placeholder="institute@okhdfcbank"
          />
        </F>
        <F label="UPI payee name">
          <Input
            value={s.upi_name}
            onChange={(e) => setS({ ...s, upi_name: e.target.value })}
            placeholder="Shown inside the payer's UPI app"
          />
        </F>
        <F label="Address" cls="sm:col-span-2">
          <Textarea
            rows={2}
            value={s.address}
            onChange={(e) => setS({ ...s, address: e.target.value })}
          />
        </F>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Card>
  );
}

function RoomsPanel() {
  const qc = useQueryClient();
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-all"],
    queryFn: () => roomsApi.list({ includeInactive: true }),
  });
  const { data: institute } = useQuery({
    queryKey: ["institute"],
    queryFn: () => instituteApi.get(),
  });
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("30");

  const plan = planFor(institute?.plan);
  const limit = institute?.room_limit ?? plan.rooms;
  const used = rooms.length;
  const atLimit = used >= limit;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["rooms-all"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
    qc.invalidateQueries({ queryKey: ["timetable"] });
  }

  const add = useMutation({
    mutationFn: async () => {
      if (atLimit)
        throw new Error(`Your ${plan.name} plan allows ${limit} classrooms. Upgrade to add more.`);
      return roomsApi.create({ name: name.trim(), capacity: Math.max(1, Number(capacity) || 30) });
    },
    onSuccess: () => {
      toast.success("Classroom added");
      setName("");
      setCapacity("30");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { name?: string; capacity?: number; is_active?: boolean };
    }) => roomsApi.update(id, patch),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => roomsApi.remove(id),
    onSuccess: () => {
      toast.success("Classroom removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card
      title="Classrooms"
      description="Parallel batches run in separate rooms. Rooms are never tied to a teacher — you attach them per class in the timetable."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
        <div className="text-sm">
          <span className="font-medium">{plan.name} plan</span>{" "}
          <span className="text-muted-foreground">
            — {used} of {limit} classrooms used
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to="/pricing">Plan details</Link>
        </Button>
      </div>
      {atLimit && (
        <p className="mb-2 text-xs text-destructive">
          Classroom limit reached — contact Team Academix to change your plan.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          placeholder="Room name (e.g. Room 101 / Physics Lab)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full sm:min-w-[180px] sm:flex-1"
        />
        <Input
          type="number"
          min={1}
          placeholder="Seats"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-24"
        />
        <Button type="submit" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>
      <ul className="mt-3 divide-y divide-border">
        {rooms.length === 0 && (
          <li className="py-3 text-xs text-muted-foreground">
            No classrooms yet — add one to start planning parallel batches.
          </li>
        )}
        {rooms.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <Input
              defaultValue={r.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.name) update.mutate({ id: r.id, patch: { name: v } });
              }}
              className="h-8 w-full sm:min-w-[140px] sm:flex-1"
            />
            <Input
              type="number"
              min={1}
              defaultValue={r.capacity}
              onBlur={(e) => {
                const v = Math.max(1, Number(e.target.value) || r.capacity);
                if (v !== r.capacity) update.mutate({ id: r.id, patch: { capacity: v } });
              }}
              className="h-8 w-20"
            />
            <Button
              type="button"
              size="sm"
              variant={r.is_active ? "outline" : "secondary"}
              className="h-8"
              onClick={() => update.mutate({ id: r.id, patch: { is_active: !r.is_active } })}
            >
              {r.is_active ? "Active" : "Inactive"}
            </Button>
            <button
              type="button"
              onClick={() => remove.mutate(r.id)}
              className="text-destructive hover:opacity-80"
              title="Delete classroom"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FeesPanel() {
  return (
    <>
      <InstallmentDefaultsPanel />
      <FeesPanelInner />
    </>
  );
}

/** Institute-wide default installment schedule; batches can override it. */
function InstallmentDefaultsPanel() {
  const [plan, setPlan] = useState<Installment[]>(() => getInstitute().installment_plan);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveInstitute({ ...getInstitute(), installment_plan: plan });
      toast.success("Installment plan saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Installment plan (default)"
      description="How every batch fee is split and when each part falls due. A batch can override this from its own edit dialog."
    >
      <InstallmentPlanEditor plan={plan} onChange={setPlan} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save plan"}
        </Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => setPlan(DEFAULT_PLAN)}>
          Reset to 50 / 50
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        New admissions get one bill per installment with the due date calculated automatically.
      </p>
    </Card>
  );
}

/** Default class timings for the timetable — set once, tweak whenever. */
function ShiftTimingsPanel() {
  const [shifts, setShifts] = useState<Shifts>(() => getInstitute().shifts ?? DEFAULT_SHIFTS);
  const [saving, setSaving] = useState(false);

  function patch(key: keyof Shifts, p: Partial<Shifts["morning"]>) {
    setShifts((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));
  }

  async function save(next: Shifts = shifts) {
    setSaving(true);
    try {
      await saveInstitute({ ...getInstitute(), shifts: next });
      setShifts(next);
      toast.success("Class timings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Class timings"
      description="Default morning and evening windows used by the timetable. Change them any time — existing classes are untouched."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(["morning", "evening"] as const).map((k) => (
          <div key={k} className="space-y-2 rounded-md border border-border p-3">
            <p className="text-sm font-medium capitalize">{k} shift</p>
            <div className="flex flex-wrap gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={shifts[k].start}
                  onChange={(e) => patch(k, { start: e.target.value })}
                  className="h-8 w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={shifts[k].end}
                  onChange={(e) => patch(k, { end: e.target.value })}
                  className="h-8 w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period length</Label>
                <Select
                  value={String(shifts[k].period)}
                  onValueChange={(v) => patch(k, { period: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[45, 60, 90].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m === 60 ? "1 hour" : m === 90 ? "1.5 hours" : `${m} min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={saving} onClick={() => save()}>
          Save timings
        </Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => save(DEFAULT_SHIFTS)}>
          Reset to default
        </Button>
      </div>
    </Card>
  );
}

function FeesPanelInner() {
  const qc = useQueryClient();
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.list(),
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: async (rows: { id: string; fee: number }[]) => {
      for (const r of rows) await batchesApi.update(r.id, { default_fee: r.fee });
      return rows.length;
    },
    onSuccess: (n) => {
      setDraft({});
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["fees"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success(`${n} batch fee(s) updated — students in those batches are re-synced`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = batches
    .filter((b) => draft[b.id] !== undefined && Number(draft[b.id]) !== Number(b.default_fee ?? 0))
    .map((b) => ({ id: b.id, fee: Number(draft[b.id]) || 0 }));

  return (
    <Card
      title="Fee structures"
      description="Set every batch's fee right here. Each student in the batch inherits it automatically; scholarship % and flat discount stay per student."
    >
      {isLoading && <p className="text-xs text-muted-foreground">Loading batches…</p>}
      {!isLoading && batches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No batches yet — create one on the{" "}
          <Link to="/app/batches" className="font-medium text-primary underline">
            Batches
          </Link>{" "}
          page.
        </p>
      )}
      {batches.length > 0 && (
        <>
          <ul className="divide-y divide-border">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.class_level ? `Class ${b.class_level}` : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-32"
                    value={draft[b.id] ?? String(b.default_fee ?? 0)}
                    onChange={(e) => setDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={dirty.length === 0 || saveMut.isPending}
              onClick={() => saveMut.mutate(dirty)}
            >
              {saveMut.isPending ? "Saving…" : `Save ${dirty.length || ""} change(s)`}
            </Button>
            {dirty.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setDraft({})}>
                Reset
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Per-student scholarship / discount lives on the student profile.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

const ALL_ROLES: AppRole[] = [
  "owner",
  "admin",
  "faculty",
  "receptionist",
  "counsellor",
  "accountant",
  "student",
  "parent",
];

function UsersPanel() {
  const qc = useQueryClient();
  const { roles: myRoles, user } = useAuth();
  const canManage = myRoles.includes("owner") || myRoles.includes("admin");
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: () => userRolesApi.listAll(),
  });

  const addRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: AppRole }) => userRolesApi.addRole(uid, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-with-roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const removeRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: AppRole }) =>
      userRolesApi.removeRole(uid, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-with-roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card
      title="Users & roles"
      description={
        canManage
          ? "Assign one or more roles per user. Owners can never lose their last owner role."
          : "Only owners/admins can edit roles."
      }
    >
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      <ul className="divide-y divide-border">
        {users.length === 0 && !isLoading && (
          <li className="py-3 text-xs text-muted-foreground">No users yet.</li>
        )}
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {u.full_name || "(no name)"}
                {u.id === user?.id ? (
                  <span className="ml-1 text-xs text-muted-foreground">· you</span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.phone || u.id}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {u.roles.length === 0 && (
                  <span className="text-xs text-muted-foreground">no roles</span>
                )}
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1 text-[10px]">
                    {r}
                    {canManage && (
                      <button
                        onClick={() => removeRole.mutate({ uid: u.id, role: r })}
                        className="ml-1 opacity-60 hover:opacity-100"
                        aria-label={`Remove ${r}`}
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
            {canManage && (
              <Select
                value=""
                onValueChange={(v) => addRole.mutate({ uid: u.id, role: v as AppRole })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Add role" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
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
  useEffect(() => {
    setS(getInstitute());
  }, []);
  return (
    <Card
      title="Branding"
      description="Primary colour applies live across the app. Leave empty to use the default theme colour."
    >
      <div className="flex flex-wrap items-end gap-3">
        <F label="Primary colour">
          <Input
            type="color"
            value={s.primary_color || "#4f46e5"}
            onChange={(e) => setS({ ...s, primary_color: e.target.value })}
            className="h-10 w-20 p-1"
          />
        </F>
        <F label="Hex value">
          <Input
            value={s.primary_color}
            onChange={(e) => setS({ ...s, primary_color: e.target.value })}
            placeholder="#4f46e5"
            className="w-32"
          />
        </F>
        <Button
          onClick={async () => {
            try {
              await saveInstitute(s);
              toast.success("Branding applied");
            } catch {
              toast.error("Could not save branding");
            }
          }}
        >
          Apply
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const ns = { ...s, primary_color: "" };
            setS(ns);
            try {
              await saveInstitute(ns);
              toast.success("Reset to default");
            } catch {
              toast.error("Could not reset branding");
            }
          }}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}

function ReceiptsPanel() {
  const [tpl, setTpl] = useState<ReceiptTemplate>(getInstitute().receipt_template ?? "classic");
  const [paper, setPaper] = useState<ReceiptPaper>(getInstitute().receipt_paper ?? "a5");
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setPreview("");
    receiptPreviewUrl(tpl, paper)
      .then((url) => {
        if (alive) setPreview(url);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tpl, paper]);

  async function save() {
    setSaving(true);
    try {
      await saveInstitute({ ...getInstitute(), receipt_template: tpl, receipt_paper: paper });
      toast.success("Receipt template saved");
    } catch {
      toast.error("Could not save the template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Fee receipt template"
      description="Pick a layout — the preview below uses sample data. Every download and WhatsApp share uses the saved template."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="space-y-2">
          {RECEIPT_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTpl(t.key)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                tpl === t.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.blurb}</p>
            </button>
          ))}
          <div className="space-y-1.5 pt-2">
            <Label>Paper format</Label>
            <Select value={paper} onValueChange={(value) => setPaper(value as ReceiptPaper)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a5">A5 — one receipt</SelectItem>
                <SelectItem value="a4-two-up">A4 — full page</SelectItem>
                <SelectItem value="thermal-80">80 mm thermal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Use this template"}
          </Button>
        </div>
        <div className="min-h-[26rem] overflow-hidden rounded-lg border border-border bg-muted/30">
          {preview ? (
            <iframe title="Receipt preview" src={preview} className="h-[30rem] w-full" />
          ) : (
            <div className="grid h-[30rem] place-items-center text-xs text-muted-foreground">
              Building preview…
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function TemplatesPanel() {
  const [tpls, setTpls] = useState<Record<WhatsAppTemplateKey, string>>(getTemplates());
  useEffect(() => {
    setTpls(getTemplates());
  }, []);
  const keys = Object.keys(WA_TEMPLATES) as WhatsAppTemplateKey[];
  return (
    <Card
      title="WhatsApp message templates"
      description="Placeholders like {{student_name}}, {{parent_name}}, {{batch_name}}, {{amount_due}}, {{due_date}} are auto-filled at send time."
    >
      <div className="space-y-4">
        {keys.map((k) => (
          <div key={k}>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {k.replace(/_/g, " ")}
            </Label>
            <Textarea
              rows={5}
              value={tpls[k]}
              onChange={(e) => setTpls({ ...tpls, [k]: e.target.value })}
              className="mt-1 font-mono text-xs"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTpls(WA_TEMPLATES);
              saveTemplates(WA_TEMPLATES);
              toast.success("Reset to defaults");
            }}
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              saveTemplates(tpls);
              toast.success("Templates saved");
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}

function F({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return (
    <div className={`space-y-1.5 ${cls ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/** Read-only: which modules this institute currently has. */
function ModulesPanel() {
  const { map } = useFeatures();
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Your modules
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Included with your plan. Need something switched on? Call Team Academix on 70666 70222.
      </p>
      {FEATURE_GROUPS.map((g) => (
        <div key={g} className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {g}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FEATURES.filter((f) => f.group === g).map((f) => (
              <span
                key={f.key}
                title={f.hint}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  isFeatureOn(map, f.key)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground line-through"
                }`}
              >
                {f.label}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2">
        {ALWAYS_ON.map((f) => (
          <span
            key={f.label}
            title={f.hint}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground"
          >
            {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}
