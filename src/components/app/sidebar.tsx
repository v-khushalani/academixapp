import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Layers,
  CalendarCheck,
  Wallet,
  FileText,
  Calendar,
  BookOpen,
  GraduationCap,
  BarChart3,
  MessageSquare,
  IndianRupee,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, isSuperAdmin, type ModuleKey } from "@/lib/rbac";
import { useEffect, useState } from "react";
import { getInstitute } from "@/lib/academy-settings";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  key: ModuleKey;
  exact?: boolean;
};
const nav: NavItem[] = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, key: "dashboard", exact: true },
  { title: "Students", url: "/app/students", icon: Users, key: "students" },
  { title: "Admissions", url: "/app/admissions", icon: UserPlus, key: "admissions" },
  { title: "Batches", url: "/app/batches", icon: Layers, key: "batches" },
  { title: "Attendance", url: "/app/attendance", icon: CalendarCheck, key: "attendance" },
  { title: "Fees", url: "/app/fees", icon: Wallet, key: "fees" },
  { title: "Messages", url: "/app/messages", icon: MessageSquare, key: "messages" },
  { title: "Tests", url: "/app/tests", icon: FileText, key: "tests" },
  { title: "Syllabus", url: "/app/syllabus", icon: BookOpen, key: "syllabus" },
  { title: "Timetable", url: "/app/timetable", icon: Calendar, key: "timetable" },
  { title: "Faculty", url: "/app/faculty", icon: GraduationCap, key: "faculty" },
  { title: "Salaries", url: "/app/salaries", icon: IndianRupee, key: "salaries" },
  { title: "Reports", url: "/app/reports", icon: BarChart3, key: "reports" },
  { title: "Settings", url: "/app/settings", icon: Settings, key: "settings" },
];

const platformNav: NavItem = {
  title: "Platform console",
  url: "/app/platform",
  icon: ShieldCheck,
  key: "platform",
};

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { roles, signOut } = useAuth();
  const superadmin = isSuperAdmin(roles);
  const [instituteName, setInstituteName] = useState("Academix");
  const [logo, setLogo] = useState("");
  useEffect(() => {
    // Team Academix never wears an institute's branding.
    if (superadmin) {
      setInstituteName("Academix");
      setLogo("");
      return;
    }
    const sync = () => {
      const inst = getInstitute();
      setInstituteName(inst.name || "Academix");
      setLogo(inst.logo_url || "");
    };
    sync();
    window.addEventListener("vk-institute-changed", sync);
    return () => window.removeEventListener("vk-institute-changed", sync);
  }, [superadmin]);
  const initials = superadmin
    ? "Ax"
    : (instituteName.match(/\b\w/g) || ["A"]).slice(0, 2).join("").toUpperCase();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  // Super admin runs the platform, not an institute — no institute modules in the rail.
  const base = superadmin ? [] : nav.filter((n) => roles.length === 0 || canAccess(n.key, roles));


  const renderItem = (item: NavItem) => {
    const active = isActive(item.url, item.exact);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
          <Link
            to={item.url}
            onClick={() => isMobile && setOpenMobile(false)}
            className="flex items-center gap-2"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {logo ? (
            <img
              src={logo}
              alt={instituteName}
              className="h-8 w-8 shrink-0 rounded-md object-contain"
            />
          ) : (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold tracking-tight">{initials}</span>
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {instituteName}
              </p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {superadmin ? "Platform team" : "Powered by Academix"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Team Academix work lives in its own section, above the institute it is viewing. */}
        {superadmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Team Academix</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItem(platformNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {base.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{base.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
