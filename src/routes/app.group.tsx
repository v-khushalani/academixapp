import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/group")({
  head: () => ({
    meta: [
      { title: "Group overview — Academix" },
      {
        name: "description",
        content: "Students, batches and fee collection across every branch of your institute.",
      },
      { property: "og:title", content: "Group overview — Academix" },
      {
        property: "og:description",
        content: "Branch-wise students, batches and collection in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupPage,
});

type Row = {
  institute_id: string;
  name: string;
  is_branch: boolean;
  students: number;
  batches: number;
  billed: number;
  collected: number;
};

const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

function GroupPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["group-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("group_overview");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const total = rows.reduce(
    (a, r) => ({
      students: a.students + Number(r.students ?? 0),
      batches: a.batches + Number(r.batches ?? 0),
      billed: a.billed + Number(r.billed ?? 0),
      collected: a.collected + Number(r.collected ?? 0),
    }),
    { students: 0, batches: 0, billed: 0, collected: 0 },
  );

  return (
    <>
      <PageHeader
        title="Group overview"
        description="Head office and every branch, side by side."
      />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Students" value={total.students} />
          <Stat label="Active batches" value={total.batches} />
          <Stat label="Collected" value={inr(total.collected)} />
          <Stat label="Pending" value={inr(Math.max(total.billed - total.collected, 0))} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Batches</th>
                <th className="px-3 py-2">Collected</th>
                <th className="px-3 py-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.institute_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.is_branch ? "Branch" : "Head office"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.students}</td>
                  <td className="px-3 py-2">{r.batches}</td>
                  <td className="px-3 py-2">{inr(r.collected)}</td>
                  <td className="px-3 py-2">
                    {inr(Math.max(Number(r.billed ?? 0) - Number(r.collected ?? 0), 0))}
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No institutes linked to this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Branches are set up by Team Academix on the Chain plan. Each branch keeps its own
          students, batches, fees and staff — this page only rolls the numbers up.
        </p>
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
