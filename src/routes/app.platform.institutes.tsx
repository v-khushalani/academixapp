import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { planFor } from "@/lib/plans";
import { InstituteDetail, Usage } from "@/components/app/platform/institute-detail";
import { usePlatformInstitutes } from "@/components/app/platform/shared";

export const Route = createFileRoute("/app/platform/institutes")({
  component: PlatformInstitutes,
});

function PlatformInstitutes() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: institutes = [], isLoading } = usePlatformInstitutes();

  async function setParent(id: string, parent: string) {
    const { error } = await supabase.rpc("platform_set_parent", {
      _id: id,
      _parent_institute_id: (parent || null) as unknown as string,
    });
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["platform-institutes"] });
    toast.success(parent ? "Linked as a branch" : "Set as head office");
  }

  const open = institutes.find((i) => i.id === openId) ?? null;
  if (open) return <InstituteDetail institute={open} onBack={() => setOpenId(null)} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
              <td className="px-3 py-2">
                <p className="font-medium">{planFor(i.plan).name}</p>
                {i.status && i.status !== "active" && (
                  <Badge variant="destructive" className="mt-0.5 text-[10px]">
                    {i.status}
                  </Badge>
                )}
              </td>
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
  );
}
