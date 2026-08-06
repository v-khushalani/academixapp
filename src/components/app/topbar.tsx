import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { formatDate } from "@/lib/dates";

function today() {
  const d = new Date();
  return `${d.toLocaleDateString("en-IN", { weekday: "short" })}, ${formatDate(d)}`;
}

export function TopBar() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="shrink-0" />

      <div className="min-w-0 flex-1" />

      <span className="hidden shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground sm:block">
        {today()}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Account menu"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {roles.join(", ") || "no role"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
