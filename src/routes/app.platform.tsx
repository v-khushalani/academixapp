import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdmin } from "@/lib/rbac";
import { PricingAdmin } from "@/components/app/pricing-admin";
import { InstallmentPlanEditor } from "@/components/app/installment-plan-editor";
import { normalisePlan, type Installment } from "@/lib/installments";
import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from "@/lib/institute-controls";

export const Route = createFileRoute("/app/platform")({
  head: () => ({
    meta: [
      { title: "Platform Console — Academix" },
      {
        name: "description",
        content: "Internal Academix console for institute-wide oversight and support.",
      },
      { property: "og:title", content: "Platform Console — Academix" },
      {
        property: "og:description",
        content: "Internal console for Team Academix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformPage,
});

type PlatformInstitute = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  parent_institute_id: string | null;
  student_limit: number;
  room_limit: number;
  batch_limit: number;
  faculty_limit: number;
  staff_login_limit: number;
  teacher_login_limit: number;
  features: Partial<Record<FeatureKey, boolean>> | null;
  installment_plan: Installment[] | null;
  receipt_template: string | null;
  students: number;
  batches: number;
  rooms: number;
  faculty: number;
  staff_logins: number;
  teacher_logins: number;
};

function PlatformPage() {
  const { roles, loading } = useAuth();
  const allowed = isSuperAdmin(roles);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: institutes = [] } = useQuery({
    queryKey: ["platform-institutes"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_institutes");
      if (error) throw error;
      return (data ?? []) as unknown as PlatformInstitute[];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["platform-plan-keys"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_catalog").select("key,name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return institutes;
    return institutes.filter(
      (i) => i.name.toLowerCase().includes(term) || (i.slug ?? "").toLowerCase().includes(term),
    );
  }, [institutes, q]);

  const current = institutes.find((i) => i.id === selected) ?? null;

  if (loading) return null;

  if (!allowed) {
    return (
      <PageBody>
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Page not found.
        </div>
      </PageBody>
    );
  }

  const nameOf = (id: string) => institutes.find((i) => i.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Academix platform console"
        description="Team Academix only — allocate plans, limits, modules and branches for every institute on the network."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Super admin
          </Badge>
        }
      />
      <PageBody>
        <Tabs defaultValue="institutes" className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="institutes">Institutes</TabsTrigger>
            <TabsTrigger value="pricing">Plans &amp; pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="institutes">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Institutes" value={institutes.filter((i) => !i.parent_institute_id).length} />
              <Stat label="Branches" value={institutes.filter((i) => i.parent_institute_id).length} />
              <Stat
                label="Students on platform"
                value={institutes.reduce((a, i) => a + Number(i.students ?? 0), 0)}
              />
            </div>

            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search institutes…"
              className="mt-4 h-9 max-w-sm"
            />

            <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Institute</th>
                      <th className="px-3 py-2">Students</th>
                      <th className="px-3 py-2">Batches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((i) => (
                      <tr
                        key={i.id}
                        onClick={() => setSelected(i.id)}
                        className={
                          "cursor-pointer border-t border-border hover:bg-muted/40 " +
                          (selected === i.id ? "bg-muted/60" : "")
                        }
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium">
                            {i.parent_institute_id ? "↳ " : ""}
                            {i.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {i.plan ?? "no plan"} · {i.status ?? "active"}
                          </p>
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {i.students}
                          {i.student_limit > 0 ? ` / ${i.student_limit}` : ""}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {i.batches}
                          {i.batch_limit > 0 ? ` / ${i.batch_limit}` : ""}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-xs text-muted-foreground">
                          No institutes match.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {current ? (
                <InstituteEditor
                  key={current.id}
                  institute={current}
                  all={institutes}
                  planKeys={plans}
                />
              ) : (
                <div className="grid place-items-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Pick an institute to set its plan, limits, modules, fee structure and branch.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <h2 className="text-sm font-semibold">Pricing control</h2>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Plan names and the tick/cross comparison table on the public pricing page. Changes go
              live immediately.
            </p>
            <PricingAdmin />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function InstituteEditor({
  institute,
  all,
  planKeys,
}: {
  institute: PlatformInstitute;
  all: PlatformInstitute[];
  planKeys: { key: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [plan, setPlan] = useState(institute.plan ?? "free");
  const [parent, setParent] = useState(institute.parent_institute_id ?? "none");
  const [limits, setLimits] = useState({
    students: institute.student_limit,
    rooms: institute.room_limit,
    batches: institute.batch_limit,
    faculty: institute.faculty_limit,
    staff: institute.staff_login_limit,
    teachers: institute.teacher_login_limit,
  });
  const [features, setFeatures] = useState<Partial<Record<FeatureKey, boolean>>>(
    institute.features ?? {},
  );
  const [installments, setInstallments] = useState<Installment[]>(
    normalisePlan(institute.installment_plan ?? []),
  );

  const { data: detail = [] } = useQuery({
    queryKey: ["platform-institute-detail", institute.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_institute_detail", {
        _institute_id: institute.id,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("platform_update_institute", {
        _id: institute.id,
        _plan: plan,
        _student_limit: limits.students,
        _room_limit: limits.rooms,
        _batch_limit: limits.batches,
        _faculty_limit: limits.faculty,
        _staff_login_limit: limits.staff,
        _teacher_login_limit: limits.teachers,
        _features: features as never,
        _installment_plan: installments as never,
        _receipt_template: institute.receipt_template, // We'll add this to the update RPC logic if needed, or just set it via settings
        _parent_institute_id: parent === "none" ? undefined : parent,
        _clear_parent: parent === "none",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Institute updated");
      qc.invalidateQueries({ queryKey: ["platform-institutes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const num = (k: keyof typeof limits) => (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{LIMIT_LABELS[k]}</Label>
      <Input
        type="number"
        min={0}
        className="h-8"
        value={limits[k]}
        onChange={(e) => setLimits({ ...limits, [k]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </div>
  );

  const batches = detail.filter((d) => d.kind === "batch");
  const students = detail.filter((d) => d.kind === "student");

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">{institute.name}</h2>
        <p className="text-xs text-muted-foreground">
          {institute.students} students · {institute.batches} batches · {institute.staff_logins}{" "}
          office logins · {institute.teacher_logins} teacher logins
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Plan</Label>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {planKeys.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Branch of</Label>
          <Select value={parent} onValueChange={setParent}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Independent institute</SelectItem>
              {all
                .filter((i) => i.id !== institute.id && !i.parent_institute_id)
                .map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Limits — 0 means unlimited
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {num("students")}
          {num("batches")}
          {num("rooms")}
          {num("faculty")}
          {num("staff")}
          {num("teachers")}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Modules
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURE_KEYS.map((k) => (
            <label
              key={k}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
            >
              {FEATURE_LABELS[k]}
              <Switch
                checked={features[k] !== false}
                onCheckedChange={(v) => setFeatures({ ...features, [k]: v })}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Default fee installments for this institute
        </p>
        <InstallmentPlanEditor plan={installments} onChange={setInstallments} />
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full sm:w-auto">
        {save.isPending ? "Saving…" : "Save institute settings"}
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <ListCard title={`Batches (${batches.length})`} rows={batches} />
        <ListCard title={`Students (${students.length})`} rows={students} />
      </div>
    </div>
  );
}

const LIMIT_LABELS: Record<string, string> = {
  students: "Students",
  rooms: "Classrooms",
  batches: "Batches",
  faculty: "Faculty",
  staff: "Office logins",
  teachers: "Teacher logins",
};

function ListCard({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; title: string; subtitle: string | null; extra: string | null }[];
}) {
  return (
    <div className="rounded-md border border-border">
      <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="max-h-64 divide-y divide-border overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="truncate">{r.title}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {r.subtitle || r.extra || ""}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-3 text-xs text-muted-foreground">None yet.</li>}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}