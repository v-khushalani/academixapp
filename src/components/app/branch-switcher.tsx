import { Building2, Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_BRANCHES, useBranches } from "@/lib/branch";

/** Only rendered for accounts that can see more than one campus. */
export function BranchSwitcher() {
  const { branches, activeId, select, multi } = useBranches();
  if (!multi) return null;

  const current = branches.find((b) => b.id === activeId);
  const label = current ? current.name : "All branches";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 max-w-[190px] shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Viewing</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => select(ALL_BRANCHES)} className="gap-2">
          {activeId === ALL_BRANCHES ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <span className="w-3.5" />
          )}
          All branches (combined)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => select(b.id)} className="gap-2">
            {activeId === b.id ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
            <span className="truncate">{b.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
