import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Layers,
  CalendarCheck,
  Wallet,
  FileText,
  BookOpen,
  FolderOpen,
  Calendar,
  GraduationCap,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, type ModuleKey } from "@/lib/rbac";

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
  { title: "Tests", url: "/app/tests", icon: FileText, key: "tests" },
  { title: "Homework", url: "/app/homework", icon: BookOpen, key: "homework" },
  { title: "Study Material", url: "/app/study-material", icon: FolderOpen, key: "study-material" },
  { title: "Timetable", url: "/app/timetable", icon: Calendar, key: "timetable" },
  { title: "Faculty", url: "/app/faculty", icon: GraduationCap, key: "faculty" },
  { title: "Reports", url: "/app/reports", icon: BarChart3, key: "reports" },
  { title: "Notifications", url: "/app/notifications", icon: Bell, key: "notifications" },
  { title: "Settings", url: "/app/settings", icon: Settings, key: "settings" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { roles, signOut } = useAuth();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const items = nav.filter((n) => roles.length === 0 || canAccess(n.key, roles));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold tracking-tight">VK</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                VK Academy
              </p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                Institute OS
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Profile">
              <User className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Profile</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
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
