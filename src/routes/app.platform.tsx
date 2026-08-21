import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type InstituteRow = {
  id: string;
  name: string;
  plan: string | null;
  status: string | null;
  room_limit: number;
  parent_institute_id: string | null;
  academic_year: string | null;
  created_at: string;
};

function PlatformPage() {
  const { roles, loading } = useAuth();
  const allowed = isSuperAdmin(roles);
  const [q, setQ] = useState("");
  const qc = useQueryClient();

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

  const { data: institutes = [] } = useQuery({
    queryKey: ["platform-institutes"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select("id,name,plan,status,room_limit,parent_institute_id,academic_year,created_at")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as InstituteRow[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["platform-students"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,class,phone,institute_id,approval_status,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["platform-fees"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("institute_id,amount,amount_paid")
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const perInstitute = useMemo(() => {
    const m = new Map<string, { students: number; billed: number; collected: number }>();
    institutes.forEach((i) => m.set(i.id, { students: 0, billed: 0, collected: 0 }));
    students.forEach((s) => {
      const row = m.get(s.institute_id) ?? { students: 0, billed: 0, collected: 0 };
      row.students += 1;
      m.set(s.institute_id, row);
    });
    fees.forEach((f) => {
      const row = m.get(f.institute_id) ?? { students: 0, billed: 0, collected: 0 };
      row.billed += Number(f.amount ?? 0);
      row.collected += Number(f.amount_paid ?? 0);
      m.set(f.institute_id, row);
    });
    return m;
  }, [institutes, students, fees]);

  const filteredStudents = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return students
      .filter(
        (s) =>
          s.full_name.toLowerCase().includes(term) || (s.phone ?? "").toLowerCase().includes(term),
      )
      .slice(0, 50);
  }, [students, q]);

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
        description="Team Academix only — every institute on the network, support lookup and pricing control."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Super admin
          </Badge>
        }
      />
      <PageBody>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="overview">Institutes</TabsTrigger>
            <TabsTrigger value="support">Support lookup</TabsTrigger>
            <TabsTrigger value="pricing">Plans &amp; pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Institutes" value={institutes.length} />
          <Stat label="Students on platform" value={students.length} />
          <Stat
            label="Fees collected"
            value={`₹${fees.reduce((a, f) => a + Number(f.amount_paid ?? 0), 0).toLocaleString("en-IN")}`}
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Institute</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Branch of</th>
                <th className="px-3 py-2">Rooms allowed</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Collected / Billed</th>
              </tr>
            </thead>
            <tbody>
              {institutes.map((i) => {
                const agg = perInstitute.get(i.id);
                return (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.academic_year ?? "—"}</p>
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
                    <td className="px-3 py-2">{i.room_limit}</td>
                    <td className="px-3 py-2">{agg?.students ?? 0}</td>
                    <td className="px-3 py-2">
                      ₹{(agg?.collected ?? 0).toLocaleString("en-IN")} / ₹
                      {(agg?.billed ?? 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          </TabsContent>

          <TabsContent value="support">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Student lookup (all institutes)
          </p>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or phone…"
            className="mt-2 h-9"
          />
          <ul className="mt-2 divide-y divide-border">
            {filteredStudents.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="font-medium">{s.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.class ?? "—"} · {s.phone ?? "no phone"} · {nameOf(s.institute_id)}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {s.approval_status}
                </Badge>
              </li>
            ))}
            {q && filteredStudents.length === 0 && (
              <li className="py-2 text-xs text-muted-foreground">No match.</li>
            )}
          </ul>
        </div>
          </TabsContent>

          <TabsContent value="pricing">
        <div>
          <h2 className="text-sm font-semibold">Pricing control</h2>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Prices, limits and the tick/cross comparison table on the public pricing page. Changes
            go live immediately.
          </p>
          <PricingAdmin />
        </div>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
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