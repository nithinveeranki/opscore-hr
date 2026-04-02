import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Briefcase, BarChart3,
  ClipboardList, Settings, LogOut, ChevronLeft, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Employees', path: '/employees', icon: Users },
  { label: 'Departments', path: '/departments', icon: Building2 },
  { label: 'Designations', path: '/designations', icon: Briefcase },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Activity Log', path: '/activity', icon: ClipboardList, adminOnly: true },
  { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const filteredItems = navItems.filter(item => !item.adminOnly || role === 'admin');

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-2 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">O</span>
        </div>
        {!collapsed && <span className="font-bold text-lg text-foreground">OpsCore HR</span>}
      </div>
      <Separator />
      <nav className="flex-1 py-4 space-y-1 px-2">
        {filteredItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onNavigate?.(); }}
              className={cn(
                "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <Separator />
      <div className={cn("p-4 flex items-center gap-3", collapsed && "justify-center p-2")}>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <Badge variant="outline" className="text-[10px] capitalize">{role}</Badge>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 h-8 w-8">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-50 h-6 w-6 rounded-full border bg-background shadow-sm"
          style={{ left: collapsed ? '52px' : '228px' }}
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent collapsed={false} onNavigate={() => {}} />
        </SheetContent>
      </Sheet>
    </>
  );
}
