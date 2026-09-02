import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { planFor } from "@/lib/plans";
import { InstituteDetail, Usage } from "@/components/app/platform/institute-detail";
import { usePlatformInstitutes } from "@/components/app/platform/shared";

export const Route = createFileRoute("/app/platform/institutes")({
  component: PlatformInstitutes,
});

function PlatformInstitutes() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { data: institutes = [], isLoading } = usePlatformInstitutes();

  const nameOf = (id: string | null) =>
    id ? (institutes.find((o) => o.id === id)?.name ?? "another institute") : null;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return institutes;
    return institutes.filter(
      (i) => i.name.toLowerCase().includes(term) || (i.slug ?? "").toLowerCase().includes(term),
    );
  }, [institutes, q]);

  const open = institutes.find((i) => i.id === openId) ?? null;
  if (open) return <InstituteDetail institute={open} onBack={() => setOpenId(null)} />;

  return (
    <>
      <div className="relative mb-3 w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find an institute…"
          className="h-9 pl-8"
        />
      </div>

      {/* Mobile: one card per institute — tables do not survive small screens. */}
      <div className="space-y-3 md:hidden">
        {rows.map((i) => (
          <div key={i.id} className="rounded-lg border border-border bg-card p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{i.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /{i.slug} · {planFor(i.plan).name}
                  {i.parent_institute_id ? ` · branch of ${nameOf(i.parent_institute_id)}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpenId(i.id)}>
                Open
              </Button>
            </div>
            {i.status && i.status !== "active" && (
              <Badge variant="destructive" className="mt-2 text-[10px]">
                {i.status}
              </Badge>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Students</p>
                <Usage used={Number(i.students)} limit={i.student_limit} />
              </div>
              <div>
                <p className="text-muted-foreground">Teachers</p>
                <Usage used={Number(i.faculty)} limit={i.faculty_limit} />
              </div>
              <div>
                <p className="text-muted-foreground">Batches</p>
                <Usage used={Number(i.batches)} limit={i.batch_limit} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {Number(i.staff_logins)} office · {Number(i.teacher_logins)} teacher logins
            </p>
          </div>
        ))}
        {!isLoading && rows.length === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No institutes yet.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Institute</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Students</th>
              <th className="px-3 py-2">Teachers</th>
              <th className="px-3 py-2">Batches</th>
              <th className="px-3 py-2">Logins</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /{i.slug}
                    {i.parent_institute_id ? ` · branch of ${nameOf(i.parent_institute_id)}` : ""}
                  </p>
                </td>
                <td className="px-3 py-2">
                  {i.status && i.status !== "active" ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {planFor(i.plan).name} · {i.status}
                    </Badge>
                  ) : (
                    <span className="font-medium">{planFor(i.plan).name}</span>
                  )}
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
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No institutes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
