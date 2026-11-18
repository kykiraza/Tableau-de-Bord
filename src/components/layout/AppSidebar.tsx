import { Link, useRouterState } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { footerNav, navGroups, type NavItem } from "./nav";
import { useTheme } from "./theme";
import { useAlerts } from "@/data/DataProvider";
import { Logo } from "@/components/brand/Logo";
import avatar from "@/assets/philippe.jpg";

const itemClass = "h-9 rounded-xl font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-transparent data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary [&>svg]:size-[18px] data-[active=true]:[&>svg]:text-sidebar-primary";

function NavLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number | undefined }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label} className={itemClass}>
        <Link to={item.to}><item.icon /><span>{item.label}</span></Link>
      </SidebarMenuButton>
      {!!badge && <SidebarMenuBadge className="rounded-full bg-amber font-semibold text-amber-foreground">{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const alertCount = (useAlerts().data ?? []).filter((a) => !a.resolved).length;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { dark, setDark } = useTheme();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  return (
    <Sidebar collapsible="icon" className="no-print border-r border-sidebar-border">
      <SidebarHeader className="gap-6 px-4 pt-6 group-data-[collapsible=icon]:px-2">
        <Logo />
        <div className="flex flex-col items-center text-center">
          <img src={avatar} alt="Philippe Razafitsalama" width={816} height={816} className="size-16 rounded-full object-cover ring-4 ring-sidebar-accent group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:ring-2" />
          <div className="mt-2.5 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold text-sidebar-primary">Philippe Razafitsalama</div>
            <div className="text-xs text-sidebar-foreground">Gérant</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {navGroups.map((g) => (
          <SidebarGroup key={g.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {g.items.map((item) => <NavLink key={item.to} item={item} active={isActive(item.to)} badge={item.to === "/alertes" ? alertCount : undefined} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-4 pb-5 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="gap-0.5">
          {footerNav.map((item) => <NavLink key={item.to} item={item} active={isActive(item.to)} />)}
        </SidebarMenu>
        <label className="mt-2 flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          <span className="flex items-center gap-2"><Moon className="size-[18px]" /> Thème sombre</span>
          <Switch checked={dark} onCheckedChange={setDark} aria-label="Thème sombre" />
        </label>
      </SidebarFooter>
    </Sidebar>
  );
}
