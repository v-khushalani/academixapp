import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdmin } from "@/lib/rbac";
import { InstallmentPlanEditor } from "@/components/app/installment-plan-editor";
import { normalisePlan, type Installment } from "@/lib/installments";
import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from "@/lib/institute-controls";

export const Route = createFileRoute("/app/platform/$id")({
  head: () => ({
    meta: [{ title: "Institute Console — Academix" }],
  }),
  component: InstituteDetailPage,
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

function InstituteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { roles, loading } = useAuth();
  const allowed = isSuperAdmin(roles);
  const qc = useQueryClient();

  const { data: detail = [] } = useQuery({
    queryKey: ["platform-institute-detail", id],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_institute_detail", {
        _institute_id: id,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

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

  const institute = institutes.find((i) => i.id === id);

  if (loading) return null;

  if (!allowed || !institute) {
    return (
      <PageBody>
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Institute not found or unauthorized.
        </div>
      </PageBody>
    );
  }

  return (
    <>
      <PageHeader
        title={institute.name}
        description={`Internal console for ${institute.name} · ${institute.slug}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/app/platform" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Console
            </Button>
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Super admin
            </Badge>
          </div>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-5xl">
          <InstituteEditorDetail
            institute={institute}
            all={institutes}
            planKeys={plans}
            detail={detail}
          />
        </div>
      </PageBody>
    </>
  );
}

function InstituteEditorDetail({
  institute,
  all,
  planKeys,
  detail,
}: {
  institute: PlatformInstitute;
  all: PlatformInstitute[];
  planKeys: { key: string; name: string }[];
  detail: any[];
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
        _receipt_template: institute.receipt_template,
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Configuration */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold border-b pb-2">Plan & Branch Configuration</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Subscription Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="h-9">
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
                <Label className="text-[10px] uppercase text-muted-foreground">Branch Assignment</Label>
                <Select value={parent} onValueChange={setParent}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Independent / Main Center</SelectItem>
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
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold border-b pb-2">Usage Limits (0 = Unlimited)</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {num("students")}
              {num("batches")}
              {num("rooms")}
              {num("faculty")}
              {num("staff")}
              {num("teachers")}
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold border-b pb-2">Module Access</h3>
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
          </section>
        </div>

        {/* Right: Payments & Stats */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold border-b pb-2">Default Fee Installments</h3>
            <InstallmentPlanEditor plan={installments} onChange={setInstallments} />
          </section>

          <section className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <ListCard title={`Recent Batches (${batches.length})`} rows={batches} />
              <ListCard title={`Recent Students (${students.length})`} rows={students} />
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t sticky bottom-0 bg-background/80 backdrop-blur pb-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg" className="w-full sm:w-auto">
          {save.isPending ? "Saving..." : "Save Institute Settings"}
        </Button>
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
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="max-h-48 divide-y divide-border overflow-y-auto">
        {rows.slice(0, 10).map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="truncate">{r.title}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {r.subtitle || r.extra || ""}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-3 text-xs text-muted-foreground text-center">None yet.</li>}
      </ul>
    </div>
  );
}
