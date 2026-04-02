import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Building2, UserPlus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['hsl(168,80%,32%)', 'hsl(262,60%,55%)', 'hsl(24,80%,55%)', 'hsl(210,70%,55%)', 'hsl(340,65%,55%)'];

interface KPI {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [deptData, setDeptData] = useState<{ name: string; count: number }[]>([]);
  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Parallel efficient queries
      const [
        totalRes, activeRes, deptsCountRes, newHiresRes, 
        recentEmpRes, deptsRes, rolesRes, allProfilesRes, desigRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('departments').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('joining_date', firstDayOfMonth),
        
        supabase.from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
          
        supabase.from('departments').select('*'),
        supabase.from('user_roles').select('role, user_id'),
        supabase.from('profiles').select('id, department_id, full_name, role'), // Needed for dept counts and managers
        supabase.from('designations').select('id, title'),
      ]);

      setKpis([
        { label: 'Total Employees', value: totalRes.count || 0, icon: Users, color: 'hsl(210,70%,55%)' },
        { label: 'Active Employees', value: activeRes.count || 0, icon: UserCheck, color: 'hsl(150,60%,45%)' },
        { label: 'Departments', value: deptsCountRes.count || 0, icon: Building2, color: 'hsl(262,60%,55%)' },
        { label: 'New Hires This Month', value: newHiresRes.count || 0, icon: UserPlus, color: 'hsl(24,80%,55%)' },
      ]);

      const depts = deptsRes.data || [];
      const allProfiles = (allProfilesRes.data as any[]) || [];
      const desigs = desigRes.data || [];

      // Dept Headcount
      const deptCounts = depts.map(d => ({
        name: d.name,
        count: allProfiles.filter(p => p.department_id === d.id).length
      }));
      setDeptData(deptCounts);

      // Roles
      const roleCountsObj: Record<string, number> = { admin: 0, manager: 0, employee: 0 };
      allProfiles.forEach(p => { 
        const r = (p as any).role || 'employee';
        roleCountsObj[r] = (roleCountsObj[r] || 0) + 1; 
      });
      setRoleData(Object.entries(roleCountsObj).map(([name, value]) => ({ name, value })));

      // Recent
      const enrichedRecent = (recentEmpRes.data || []).map(emp => ({
        ...emp,
        departments: { name: depts.find(d => d.id === emp.department_id)?.name || '' },
        designations: { title: desigs.find(d => d.id === emp.designation_id)?.title || '' }
      }));
      setRecentEmployees(enrichedRecent);

      // Dept Overview
      const deptsWithManager = depts.map(d => {
        const mgr = allProfiles.find(p => p.id === d.manager_id);
        const headcount = allProfiles.filter(p => p.department_id === d.id).length;
        return { ...d, headcount, managerName: mgr?.full_name || '—' };
      });
      setDepartments(deptsWithManager);

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Dashboard" />
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Dashboard" breadcrumbs={[{ label: 'Home' }]} />
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${kpi.color}20` }}>
                  <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Headcount by Department</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(168,80%,32%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Role Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent employees & department overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Recent Employees</h3>
              <div className="space-y-3">
                {recentEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{(emp.designations as any)?.title || '—'}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{(emp.departments as any)?.name || '—'}</Badge>
                  </div>
                ))}
                {recentEmployees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No employees yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Department Overview</h3>
              <div className="space-y-3">
                {departments.map(dept => (
                  <div key={dept.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">Manager: {dept.managerName}</p>
                    </div>
                    <Badge>{dept.headcount} employees</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
