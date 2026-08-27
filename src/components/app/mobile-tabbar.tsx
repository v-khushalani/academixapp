import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { nav, platformNav, type NavItem } from "@/components/app/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, isSuperAdmin } from "@/lib/rbac";
import { MODULE_FEATURE } from "@/lib/features";
import { useFeatures } from "@/hooks/use-features";

/**
 * Phones get a thumb-reach tab bar instead of hunting inside the drawer.
 * Four most-used modules plus "More", which opens the full rail.
 */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { roles } = useAuth();
  const { isOn } = useFeatures();
  const { setOpenMobile } = useSidebar();
  const superadmin = isSuperAdmin(roles);

  const items: NavItem[] = superadmin
    ? platformNav
    : nav
        .filter((n) => roles.length === 0 || canAccess(n.key, roles))
        .filter((n) => {
          const f = MODULE_FEATURE[n.key];
          return !f || isOn(f);
        })
        .slice(0, 4);

  if (items.length === 0) return null;

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
      aria-label="Quick navigation"
    >
      {items.map((item) => {
        const active = isActive(item.url, item.exact);
        return (
          <Link
            key={item.url}
            to={item.url}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="w-full truncate px-1 text-center">{item.title}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground"
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
