import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity-logger';
import { exportToCSV } from '@/lib/csv-export';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, Eye, Pencil, Trash2, Search, Users, Loader2 } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  employee_id: string;
  status: 'active' | 'inactive' | 'on_leave';
  joining_date: string;
  salary: number | null;
  department_id: string | null;
  designation_id: string | null;
  departments: { name: string } | null;
  designations: { title: string } | null;
  role?: string;
}

interface Department { id: string; name: string; }
interface Designation { id: string; title: string; department_id: string; }

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_leave: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function EmployeesPage() {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(searchParams.get('dept') || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', employee_id: '',
    department_id: '', designation_id: '', status: 'active' as string,
    joining_date: new Date().toISOString().split('T')[0], salary: '',
    role: 'employee',
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, search, deptFilter, statusFilter]);

  const fetchOptions = async () => {
    const [deptRes, desRes] = await Promise.all([
      supabase.from('departments').select('id, name'),
      supabase.from('designations').select('id, title, department_id'),
    ]);
    setDepartments(deptRes.data || []);
    setDesignations(desRes.data || []);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }
    if (deptFilter !== 'all') {
      query = query.eq('department_id', deptFilter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as any);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      toast.error('Failed to fetch employees: ' + error.message);
    } else {
      const enrichedData = (data as any[] || []).map(emp => ({
        ...emp,
        departments: { name: departments.find(d => d.id === emp.department_id)?.name || '' },
        designations: { title: designations.find(d => d.id === emp.designation_id)?.title || '' }
      }));
      setEmployees((enrichedData as unknown as Employee[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const handleExportCSV = async () => {
    let query = supabase.from('profiles').select('*');
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
    if (deptFilter !== 'all') query = query.eq('department_id', deptFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
    
    const { data } = await query;
    if (data) {
      const exportData = (data as any[]).map(e => ({
        Name: e.full_name,
        Email: e.email,
        ID: e.employee_id,
        Department: departments.find(d => d.id === e.department_id)?.name || '',
        Designation: designations.find(d => d.id === e.designation_id)?.title || '',
        Status: e.status,
        'Joining Date': new Date(e.joining_date).toLocaleDateString()
      }));
      exportToCSV(exportData, 'employees');
    }
  };

  const totalPages = Math.ceil(totalCount / perPage);
  const filteredDesignations = designations.filter(d => !form.department_id || d.department_id === form.department_id);

  const openAdd = () => {
    setEditId(null);
    setForm({ full_name: '', email: '', phone: '', employee_id: '', department_id: '', designation_id: '', status: 'active', joining_date: new Date().toISOString().split('T')[0], salary: '', role: 'employee' });
    setFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditId(emp.id);
    setForm({
      full_name: emp.full_name, email: emp.email, phone: emp.phone, employee_id: emp.employee_id,
      department_id: emp.department_id || '', designation_id: emp.designation_id || '',
      status: emp.status, joining_date: emp.joining_date, salary: emp.salary?.toString() || '',
      role: emp.role || 'employee',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    let finalEmpId = form.employee_id;
    if (!finalEmpId) {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      finalEmpId = `EMP-${((count || 0) + 1).toString().padStart(3, '0')}`;
    }

    if (editId) {
      const payload = {
        full_name: form.full_name, email: form.email, phone: form.phone,
        employee_id: finalEmpId, department_id: form.department_id || null,
        designation_id: form.designation_id || null,
        status: form.status as 'active' | 'inactive' | 'on_leave',
        joining_date: form.joining_date,
        role: form.role,
        salary: form.salary ? parseFloat(form.salary) : null,
      };
      
      const { error } = await supabase.from('profiles').update(payload).eq('id', editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logActivity(null, 'Updated employee', 'employee', editId, { name: form.full_name });
      toast.success('Employee updated successfully');
    } else {
      const payload = {
        full_name: form.full_name, email: form.email, phone: form.phone,
        employee_id: finalEmpId, department_id: form.department_id || null,
        designation_id: form.designation_id || null,
        status: form.status as 'active' | 'inactive' | 'on_leave',
        joining_date: form.joining_date,
        role: form.role,
        salary: form.salary ? parseFloat(form.salary) : null,
      };

      const { data, error } = await supabase.from('profiles').insert([payload as any]).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (data) await logActivity(null, 'Created employee', 'employee', data.id, { name: form.full_name });
      toast.success('Employee created successfully');
    }
    setSaving(false);
    setFormOpen(false);
    fetchEmployees();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await logActivity(null, 'Deleted employee', 'employee', deleteId);
    toast.success('Employee deleted successfully');
    setSaving(false);
    setDeleteId(null);
    fetchEmployees();
  };

  const openDetail = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetailOpen(true);
  };

  return (
    <>
      <AppHeader title="Employees" breadcrumbs={[{ label: 'Home' }, { label: 'Employees' }]} />
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 w-60" />
            </div>
            <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            {(role === 'admin' || role === 'manager') && (
              <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Employee</Button>
            )}
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-10 w-10 mb-3 opacity-30" />
                        <p className="font-medium">No employees found</p>
                        <p className="text-xs">Try adjusting your filters or add a new employee</p>
                        {(role === 'admin' || role === 'manager') && (
                          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-1" /> Add Employee
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map(emp => (
                    <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(emp)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {emp.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{emp.employee_id}</TableCell>
                      <TableCell><Badge variant="outline">{emp.departments?.name || '—'}</Badge></TableCell>
                      <TableCell className="text-sm">{emp.designations?.title || '—'}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColors[emp.status]}`}>
                          {emp.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(emp.joining_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(emp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(role === 'admin' || role === 'manager') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {role === 'admin' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(emp.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {(page-1)*perPage+1}–{Math.min(page*perPage, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Prev</Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button key={i} variant={page === i+1 ? "default" : "outline"} size="sm" onClick={() => setPage(i+1)}>{i+1}</Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>Fill in the employee details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input disabled={saving} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input disabled={saving} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input disabled={saving} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input disabled={saving} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select disabled={saving} value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v, designation_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select disabled={saving} value={form.designation_id} onValueChange={v => setForm(f => ({ ...f, designation_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {filteredDesignations.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select disabled={saving} value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select disabled={saving} value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <Input disabled={saving} type="date" value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Salary</Label>
              <Input disabled={saving} type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The employee record will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          <SheetHeader>
            <SheetTitle>Employee Details</SheetTitle>
          </SheetHeader>
          {selectedEmployee && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedEmployee.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedEmployee.full_name}</h3>
                  <Badge variant="outline" className="font-mono text-xs">{selectedEmployee.employee_id}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div><p className="text-muted-foreground text-xs">Email</p><p>{selectedEmployee.email}</p></div>
                <div><p className="text-muted-foreground text-xs">Phone</p><p>{selectedEmployee.phone || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Department</p><p>{selectedEmployee.departments?.name || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Designation</p><p>{selectedEmployee.designations?.title || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColors[selectedEmployee.status]}`}>
                    {selectedEmployee.status.replace('_', ' ')}
                  </span>
                </div>
                <div><p className="text-muted-foreground text-xs">Joining Date</p><p>{new Date(selectedEmployee.joining_date).toLocaleDateString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Salary</p><p>{selectedEmployee.salary ? `$${selectedEmployee.salary.toLocaleString()}` : '—'}</p></div>
              </div>
              {(role === 'admin' || role === 'manager') && (
                <>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={() => { setDetailOpen(false); openEdit(selectedEmployee); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Employee
                  </Button>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
