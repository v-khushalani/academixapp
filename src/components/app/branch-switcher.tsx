import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronDown, Network } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { hydrateInstitute } from "@/lib/academy-settings";

type Row = {
  id: string;
  name: string;
  parent_institute_id: string | null;
  is_active: boolean;
};

/** Shown only for groups: lets an owner move between the head office and branches. */
export function BranchSwitcher() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["my-institutes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_institutes");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  if (rows.length < 2) return null;
  const active = rows.find((r) => r.is_active) ?? rows[0];

  async function switchTo(id: string) {
    const { error } = await supabase.rpc("set_active_institute", { _institute_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    await hydrateInstitute();
    await qc.invalidateQueries();
    toast.success("Switched branch");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-[9rem] truncate">{active?.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Head office &amp; branches
        </DropdownMenuLabel>
        {rows.map((r) => (
          <DropdownMenuItem key={r.id} onClick={() => void switchTo(r.id)} className="gap-2">
            <span className="min-w-0 flex-1 truncate">
              {r.name}
              {r.parent_institute_id ? (
                <span className="ml-1 text-xs text-muted-foreground">branch</span>
              ) : null}
            </span>
            {r.is_active && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/group" className="gap-2">
            <Network className="h-4 w-4" />
            Group overview
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
