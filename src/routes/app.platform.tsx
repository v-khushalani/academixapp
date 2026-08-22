import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShieldCheck, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdmin } from "@/lib/rbac";
import { planFor } from "@/lib/plans";
import { PricingAdmin } from "@/components/app/pricing-admin";

export const Route = createFileRoute("/app/platform")({
  head: () => ({
    meta: [
      { title: "Platform Console — Academix" },
      {
        name: "description",
        content: "Internal Academix console for institute-wide oversight and support.",
      },
      { property: "og:title", content: "Platform Console — Academix" },
      { property: "og:description", content: "Internal console for Team Academix." },
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
  batch_limit: number;
  faculty_limit: number;
  staff_login_limit: number;
  teacher_login_limit: number;
  students: number;
  batches: number;
  rooms: number;
  faculty: number;
  staff_logins: number;
  teacher_logins: number;
};

type DetailRow = {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  extra: string | null;
};

function PlatformPage() {
  const { roles, loading } = useAuth();
  const allowed = isSuperAdmin(roles);
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: institutes = [], isLoading } = useQuery({
    queryKey: ["platform-institutes"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_institutes");
      if (error) throw error;
      return (data ?? []) as PlatformInstitute[];
    },
  });

  async function setParent(id: string, parent: string) {
    const { error } = await supabase.rpc("platform_set_parent", {
      _id: id,
      _parent_institute_id: (parent || null) as unknown as string,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["platform-institutes"] });
    toast.success(parent ? "Linked as a branch" : "Set as head office");
  }

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

  const open = institutes.find((i) => i.id === openId) ?? null;

  const totals = institutes.reduce(
    (a, i) => ({
      students: a.students + Number(i.students),
      faculty: a.faculty + Number(i.faculty),
      batches: a.batches + Number(i.batches),
    }),
    { students: 0, faculty: 0, batches: 0 },
  );

  return (
    <>
      <PageHeader
        title="Academix platform console"
        description="Team Academix only — every institute on the network, their usage and plan control. Money stays with the institute."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Super admin
          </Badge>
        }
      />
      <PageBody>
        {open ? (
          <InstituteDetail institute={open} onBack={() => setOpenId(null)} />
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="overview">Institutes</TabsTrigger>
              <TabsTrigger value="pricing">Plans &amp; pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Institutes" value={institutes.length} />
                <Stat label="Students" value={totals.students} />
                <Stat label="Teachers" value={totals.faculty} />
                <Stat label="Batches" value={totals.batches} />
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Institute</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Branch of</th>
                      <th className="px-3 py-2">Students</th>
                      <th className="px-3 py-2">Teachers</th>
                      <th className="px-3 py-2">Batches</th>
                      <th className="px-3 py-2">Logins</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {institutes.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p className="font-medium">{i.name}</p>
                          <p className="text-xs text-muted-foreground">/{i.slug}</p>
                        </td>
                        <td className="px-3 py-2">{planFor(i.plan).name}</td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`Parent institute for ${i.name}`}
                            value={i.parent_institute_id ?? ""}
                            onChange={(e) => void setParent(i.id, e.target.value)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                          >
                            <option value="">Head office (none)</option>
                            {institutes
                              .filter((o) => o.id !== i.id)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Usage used={Number(i.students)} limit={i.student_limit} />
                        </td>
                        <td className="px-3 py-2">
                          <Usage used={Number(i.faculty)} limit={i.faculty_limit} />
                        </td>
                        <td className="px-3 py-2">
                          <Usage used={Number(i.batches)} limit={i.batch_limit} />
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {Number(i.staff_logins)} office · {Number(i.teacher_logins)} teacher
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="outline" onClick={() => setOpenId(i.id)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!isLoading && institutes.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          No institutes yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="pricing">
              <div>
                <h2 className="text-sm font-semibold">Pricing control</h2>
                <p className="mb-3 mt-1 text-xs text-muted-foreground">
                  Prices, limits and the comparison table on the public pricing page. Changes go
                  live immediately.
                </p>
                <PricingAdmin />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </PageBody>
    </>
  );
}

function InstituteDetail({
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

function Usage({ used, limit }: { used: number; limit: number }) {
  const unlimited = !limit;
  const near = !unlimited && used / limit >= 0.8;
  return (
    <span className={near ? "font-semibold text-destructive" : ""}>
      {used}
      <span className="text-xs text-muted-foreground">/{unlimited ? "∞" : limit}</span>
    </span>
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
