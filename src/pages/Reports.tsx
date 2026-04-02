import { useEffect, useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '@/lib/csv-export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Users, DollarSign, Clock, Building2, ArrowUpDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['hsl(168,80%,32%)', 'hsl(262,60%,55%)', 'hsl(24,80%,55%)', 'hsl(210,70%,55%)', 'hsl(340,65%,55%)'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [p, d, r, des] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('designations').select('*'),
      ]);
      setProfiles(p.data || []);
      setDepartments(d.data || []);
      setRoles(r.data || []);
      setDesignations(des.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const now = new Date();

  // OVERVIEW METRICS
  const avgSalary = useMemo(() => {
    const withSalary = profiles.filter(p => p.salary);
    return withSalary.length ? Math.round(withSalary.reduce((s, p) => s + Number(p.salary), 0) / withSalary.length) : 0;
  }, [profiles]);

  const avgTenure = useMemo(() => {
    if (!profiles.length) return 0;
    return Math.round(profiles.reduce((s, p) => s + (now.getTime() - new Date(p.joining_date).getTime()) / (1000*60*60*24*30), 0) / profiles.length);
  }, [profiles]);

  const joinedByMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), count: 0, date: d };
    }).reverse();

    profiles.forEach(p => {
      if (!p.created_at) return;
      const pd = new Date(p.created_at);
      const m = months.find(m => m.date.getMonth() === pd.getMonth() && m.date.getFullYear() === pd.getFullYear());
      if (m) m.count++;
    });
    return months.map(({ month, count }) => ({ month, count }));
  }, [profiles]);

  // ROLES
  const roleCounts = useMemo(() => {
    const c: Record<string, number> = { admin: 0, manager: 0, employee: 0 };
    profiles.forEach(p => { 
      const r = p.role || 'employee';
      c[r] = (c[r] || 0) + 1; 
    });
    return Object.entries(c).map(([name, value]) => ({ name, value, pct: profiles.length ? Math.round((value/profiles.length)*100) : 0 }));
  }, [profiles]);

  // HEADCOUNT
  const headcountByDept = useMemo(() => {
    return departments.map(d => {
      const dp = profiles.filter(p => p.department_id === d.id);
      return {
        name: d.name, total: dp.length,
        active: dp.filter(p => p.status === 'active').length,
        inactive: dp.filter(p => p.status === 'inactive').length,
        on_leave: dp.filter(p => p.status === 'on_leave').length,
        pctActive: dp.length ? Math.round((dp.filter(p => p.status === 'active').length / dp.length) * 100) : 0,
      };
    });
  }, [departments, profiles]);

  // TENURE
  const tenureBuckets = useMemo(() => {
    const buckets = [
      { label: '<3 months', min: 0, max: 3, employees: [] as any[] },
      { label: '3-6 months', min: 3, max: 6, employees: [] as any[] },
      { label: '6-12 months', min: 6, max: 12, employees: [] as any[] },
      { label: '1-2 years', min: 12, max: 24, employees: [] as any[] },
      { label: '2+ years', min: 24, max: Infinity, employees: [] as any[] },
    ];
    profiles.forEach(p => {
      if (!p.joining_date) return;
      const months = (now.getTime() - new Date(p.joining_date).getTime()) / (1000*60*60*24*30);
      const bucket = buckets.find(b => months >= b.min && months < b.max);
      bucket?.employees.push(p);
    });
    return buckets.map(b => ({ label: b.label, count: b.employees.length }));
  }, [profiles]);

  // GENERIC TABLE SORTING & PAGINATION
  const useTableStats = (data: any[]) => {
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);
    const [page, setPage] = useState(1);
    const perPage = 10;

    const sortedData = useMemo(() => {
      let sortableItems = [...data];
      if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    const paginatedData = sortedData.slice((page - 1) * perPage, page * perPage);
    const totalPages = Math.ceil(data.length / perPage);

    return { paginatedData, requestSort, sortConfig, page, setPage, totalPages, sortedData };
  };

  const hrStats = useTableStats(headcountByDept);
  const roleStats = useTableStats(roleCounts);
  const tenureStats = useTableStats(tenureBuckets);

  const SortHead = ({ label, sortKey, st }: { label: string, sortKey: string, st: any }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => st.requestSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label} <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  const Pagination = ({ pg, setPg, tot }: { pg: number, setPg: any, tot: number }) => {
    if (tot <= 1) return null;
    return (
      <div className="flex justify-end items-center gap-2 mt-4 px-4">
        <Button variant="outline" size="sm" onClick={() => setPg((p:number) => Math.max(1, p-1))} disabled={pg === 1}>Prev</Button>
        <span className="text-sm">Page {pg} of {tot}</span>
        <Button variant="outline" size="sm" onClick={() => setPg((p:number) => Math.min(tot, p+1))} disabled={pg === tot}>Next</Button>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Reports" />
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Reports" breadcrumbs={[{ label: 'Home' }, { label: 'Reports' }]} />
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="headcount">Headcount</TabsTrigger>
            <TabsTrigger value="roles">Role Distribution</TabsTrigger>
            <TabsTrigger value="departments">Dept Performance</TabsTrigger>
            <TabsTrigger value="tenure">Tenure Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Employees', value: profiles.length, icon: Users, color: COLORS[0] },
                { label: 'Avg Salary', value: `$${avgSalary.toLocaleString()}`, icon: DollarSign, color: COLORS[1] },
                { label: 'Departments', value: departments.length, icon: Building2, color: COLORS[2] },
                { label: 'Avg Tenure', value: `${avgTenure} mo`, icon: Clock, color: COLORS[3] },
              ].map(k => (
                <Card key={k.label}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${k.color}20` }}>
                      <k.icon className="h-5 w-5" style={{ color: k.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{k.value}</p>
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Employee Growth (Last 12 Months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={joinedByMonth}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="New Hires" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headcount" className="space-y-6">
            <Card><CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Headcount by Department & Status</h3>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(hrStats.sortedData, 'headcount-report')}>
                  <Download className="h-4 w-4 mr-1" />Export
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={headcountByDept}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="active" stackId="a" fill={COLORS[0]} name="Active" />
                  <Bar dataKey="inactive" stackId="a" fill={COLORS[4]} name="Inactive" />
                  <Bar dataKey="on_leave" stackId="a" fill={COLORS[2]} name="On Leave" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card className="pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead label="Department" sortKey="name" st={hrStats} />
                    <SortHead label="Total" sortKey="total" st={hrStats} />
                    <SortHead label="Active" sortKey="active" st={hrStats} />
                    <SortHead label="Inactive" sortKey="inactive" st={hrStats} />
                    <SortHead label="On Leave" sortKey="on_leave" st={hrStats} />
                    <SortHead label="% Active" sortKey="pctActive" st={hrStats} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrStats.paginatedData.map(d => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.total}</TableCell><TableCell>{d.active}</TableCell>
                      <TableCell>{d.inactive}</TableCell><TableCell>{d.on_leave}</TableCell>
                      <TableCell>{d.pctActive}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination pg={hrStats.page} setPg={hrStats.setPage} tot={hrStats.totalPages} />
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardContent className="p-5">
                <h3 className="font-semibold mb-4">Role Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={roleCounts} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                      {roleCounts.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent></Card>
              <Card className="pb-4"><CardContent className="p-0">
                <div className="p-5 flex justify-between items-center pb-2">
                  <h3 className="font-semibold">Breakdown</h3>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(roleStats.sortedData, 'role-distribution')}><Download className="h-4 w-4" /></Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Role" sortKey="name" st={roleStats} />
                      <SortHead label="Count" sortKey="value" st={roleStats} />
                      <SortHead label="%" sortKey="pct" st={roleStats} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleStats.paginatedData.map(r => (
                      <TableRow key={r.name}><TableCell className="capitalize">{r.name}</TableCell><TableCell>{r.value}</TableCell><TableCell>{r.pct}%</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination pg={roleStats.page} setPg={roleStats.setPage} tot={roleStats.totalPages} />
              </CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <Card><CardContent className="p-5">
              <h3 className="font-semibold mb-4">Department Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={headcountByDept}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                  <Bar dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} name="Headcount" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="tenure" className="space-y-6">
            <Card><CardContent className="p-5">
              <h3 className="font-semibold mb-4">Tenure Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tenureBuckets}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                  <Bar dataKey="count" fill={COLORS[3]} radius={[4,4,0,0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card className="pb-4"><CardContent className="p-0">
              <div className="p-5 flex justify-between items-center pb-2">
                <h3 className="font-semibold">Breakdown</h3>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(tenureStats.sortedData, 'tenure-distribution')}><Download className="h-4 w-4" /></Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead label="Bucket" sortKey="label" st={tenureStats} />
                    <SortHead label="Count" sortKey="count" st={tenureStats} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenureStats.paginatedData.map(b => (
                    <TableRow key={b.label}><TableCell>{b.label}</TableCell><TableCell>{b.count}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination pg={tenureStats.page} setPg={tenureStats.setPage} tot={tenureStats.totalPages} />
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
