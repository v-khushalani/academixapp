import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { planFor } from "@/lib/plans";
import { formatDate } from "@/lib/dates";
import { fetchPlans } from "@/lib/pricing-catalog";
import { FeatureMatrix } from "@/components/app/platform-features";
import type { FeatureMap } from "@/lib/features";
import type { DetailRow, PlatformInstitute } from "./shared";

export function InstituteDetail({
  institute,
  onBack,
}: {
  institute: PlatformInstitute;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["platform-institute-detail", institute.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_institute_detail", {
        _institute_id: institute.id,
      });
      if (error) throw error;
      return (data ?? []) as DetailRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(term) || (r.subtitle ?? "").toLowerCase().includes(term),
    );
  }, [rows, q]);

  const group = (kind: string) => filtered.filter((r) => r.kind === kind);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          All institutes
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{institute.name}</h2>
          <p className="text-xs text-muted-foreground">
            {planFor(institute.plan).name} plan · {institute.status ?? "active"} ·{" "}
            {institute.parent_institute_id ? "Branch" : "Head office"}
          </p>
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a student, teacher or batch…"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <PlanControl institute={institute} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <DetailList title="Teachers" rows={group("faculty")} />
          <DetailList title="Batches" rows={group("batch")} />
          <DetailList title="Students" rows={group("student")} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Fees, expenses and salaries stay inside the institute&rsquo;s own account — Team Academix
        does not see or manage their money.
      </p>
    </div>
  );
}

type PlanForm = {
  plan: string;
  status: string;
  student_limit: number;
  room_limit: number;
  batch_limit: number;
  faculty_limit: number;
  staff_login_limit: number;
  teacher_login_limit: number;
  custom_branding: boolean;
  attendance_devices: boolean;
  features: FeatureMap;
  note: string;
};

const LIMIT_FIELDS = [
  ["Students", "student_limit", "students"],
  ["Classrooms", "room_limit", "rooms"],
  ["Batches", "batch_limit", "batches"],
  ["Teachers", "faculty_limit", "faculty"],
  ["Office logins", "staff_login_limit", "staff_logins"],
  ["Teacher logins", "teacher_login_limit", "teacher_logins"],
] as const;

export function PlanControl({ institute }: { institute: PlatformInstitute }) {
  const qc = useQueryClient();
  const { data: catalog = [] } = useQuery({ queryKey: ["pricing-plans"], queryFn: fetchPlans });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlanForm>(() => ({
    plan: institute.plan ?? "free",
    status: institute.status ?? "active",
    student_limit: institute.student_limit,
    room_limit: institute.room_limit,
    batch_limit: institute.batch_limit,
    faculty_limit: institute.faculty_limit,
    staff_login_limit: institute.staff_login_limit,
    teacher_login_limit: institute.teacher_login_limit,
    custom_branding: institute.custom_branding,
    attendance_devices: institute.attendance_devices,
    features: (institute.features ?? {}) as FeatureMap,
    note: "",
  }));

  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const planDefaults = catalog.find((c) => c.key === form.plan)?.features as FeatureMap | undefined;

  function pickPlan(key: string) {
    const p = catalog.find((c) => c.key === key);
    setForm((f) => ({
      ...f,
      plan: key,
      ...(p
        ? {
            student_limit: p.student_limit,
            room_limit: p.room_limit,
            batch_limit: p.batch_limit,
            faculty_limit: p.faculty_limit ?? f.faculty_limit,
            staff_login_limit: p.staff_login_limit,
            teacher_login_limit: p.teacher_login_limit,
            custom_branding: p.custom_branding,
            attendance_devices: p.attendance_devices,
            features: (p.features ?? {}) as FeatureMap,
          }
        : {}),
    }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.rpc("platform_set_plan", {
      _id: institute.id,
      _plan: form.plan,
      _status: form.status,
      _student_limit: form.student_limit,
      _room_limit: form.room_limit,
      _batch_limit: form.batch_limit,
      _faculty_limit: form.faculty_limit,
      _staff_login_limit: form.staff_login_limit,
      _teacher_login_limit: form.teacher_login_limit,
      _custom_branding: form.custom_branding,
      _attendance_devices: form.attendance_devices,
      _features: form.features,
      _note: form.note.trim() || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["platform-institutes"] });
    await qc.invalidateQueries({ queryKey: ["plan-changes", institute.id] });
    await qc.invalidateQueries({ queryKey: ["resolved-features"] });
    toast.success("Saved");
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plan &amp; limits
            </p>
            <span className="text-[11px] text-muted-foreground">0 means unlimited</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Plan</span>
              <select
                value={form.plan}
                onChange={(e) => pickPlan(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                {catalog.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
                {!catalog.some((c) => c.key === form.plan) && (
                  <option value={form.plan}>{form.plan}</option>
                )}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Account status</span>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            {LIMIT_FIELDS.map(([label, key, usageKey]) => (
              <label key={key} className="space-y-1 text-xs text-muted-foreground">
                <span>
                  {label}{" "}
                  <span className="text-[10px]">
                    (used {Number(institute[usageKey as keyof PlatformInstitute] ?? 0)})
                  </span>
                </span>
                <Input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => set(key, Math.max(0, Number(e.target.value)))}
                  className="h-9"
                />
              </label>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 rounded-md border border-border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Modules for this institute
          </p>
          {planDefaults && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-[11px]"
              onClick={() => set("features", { ...planDefaults })}
            >
              Reset to {planFor(form.plan).name} defaults
            </Button>
          )}
        </div>
        <div className="mt-2">
          <FeatureMatrix
            value={form.features}
            defaults={planDefaults}
            onChange={(next) => set("features", next)}
          />
        </div>
      </div>

      <label className="mt-3 block space-y-1 text-xs text-muted-foreground">
        <span>Note (why this changed)</span>
        <Input
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="e.g. Upgraded to Growth, paid till Aug 2027"
          className="h-9"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={form.custom_branding ? "default" : "outline"}
          onClick={() => set("custom_branding", !form.custom_branding)}
        >
          Custom branding: {form.custom_branding ? "On" : "Off"}
        </Button>
        <Button
          size="sm"
          variant={form.attendance_devices ? "default" : "outline"}
          onClick={() => set("attendance_devices", !form.attendance_devices)}
        >
          Attendance machines: {form.attendance_devices ? "On" : "Off"}
        </Button>
        <Button size="sm" onClick={() => void save()} disabled={saving} className="ml-auto">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {!featuresOnly && <PlanHistory instituteId={institute.id} />}
    </div>
  );
}

type PlanChange = {
  id: string;
  from_plan: string | null;
  to_plan: string | null;
  note: string | null;
  created_at: string;
};

export function PlanHistory({ instituteId }: { instituteId: string }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["plan-changes", instituteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_change_log")
        .select("id, from_plan, to_plan, note, created_at")
        .eq("institute_id", instituteId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as PlanChange[];
    },
  });
  if (rows.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
      {rows.map((r) => (
        <li key={r.id}>
          {formatDate(r.created_at)} · {planFor(r.from_plan).name} → {planFor(r.to_plan).name}
          {r.note ? ` · ${r.note}` : ""}
        </li>
      ))}
    </ul>
  );
}

function DetailList({ title, rows }: { title: string; rows: DetailRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <span className="text-xs text-muted-foreground">{rows.length}</span>
      </div>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{r.title}</span>
            {r.subtitle && (
              <span className="shrink-0 text-xs text-muted-foreground">{r.subtitle}</span>
            )}
            {r.extra && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {r.extra}
              </Badge>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">Nothing here yet.</li>
        )}
      </ul>
    </div>
  );
}

export function Usage({ used, limit }: { used: number; limit: number }) {
  const unlimited = !limit;
  const near = !unlimited && used / limit >= 0.8;
  return (
    <span className={near ? "font-semibold text-destructive" : ""}>
      {used}
      <span className="text-xs text-muted-foreground">/{unlimited ? "∞" : limit}</span>
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
