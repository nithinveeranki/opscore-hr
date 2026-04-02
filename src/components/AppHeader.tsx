import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; path?: string }[];
}

export function AppHeader({ title, breadcrumbs }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, role, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-2 pl-10 lg:pl-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-2">
            {breadcrumbs.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1">/</span>}
                {b.label}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">{profile?.full_name}</span>
              <Badge variant="outline" className="hidden sm:inline text-[10px] capitalize">{role}</Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs text-muted-foreground">{profile?.email}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
