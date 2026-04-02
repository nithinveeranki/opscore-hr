import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Users, Building2 } from 'lucide-react';

import { Loader2 } from 'lucide-react';

interface Dept {
  id: string; name: string; description: string; manager_id: string | null;
  headcount: number; managerName: string; activePercent: number; avgTenure: number;
}

export default function DepartmentsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', manager_id: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [deptsRes, profilesRes] = await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('profiles').select('id, full_name, department_id, status, joining_date'),
    ]);
    const depts = deptsRes.data || [];
    const profiles = profilesRes.data || [];

    const mgrs = profiles.filter(p => true); // all profiles can be managers
    setManagers(mgrs.map(p => ({ id: p.id, full_name: p.full_name })));

    const enriched = depts.map(d => {
      const deptProfiles = profiles.filter(p => p.department_id === d.id);
      const active = deptProfiles.filter(p => p.status === 'active').length;
      const now = new Date();
      const avgTenure = deptProfiles.length > 0
        ? deptProfiles.reduce((sum, p) => sum + ((now.getTime() - new Date(p.joining_date).getTime()) / (1000*60*60*24*30)), 0) / deptProfiles.length
        : 0;
      const mgr = profiles.find(p => p.id === d.manager_id);
      return {
        ...d,
        headcount: deptProfiles.length,
        managerName: mgr?.full_name || '—',
        activePercent: deptProfiles.length > 0 ? Math.round((active / deptProfiles.length) * 100) : 0,
        avgTenure: Math.round(avgTenure),
      };
    });
    setDepartments(enriched);
    setLoading(false);
  };

  const openAdd = () => { setEditId(null); setForm({ name: '', description: '', manager_id: '' }); setFormOpen(true); };
  const openEdit = (d: Dept) => { setEditId(d.id); setForm({ name: d.name, description: d.description, manager_id: d.manager_id || '' }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { name: form.name, description: form.description, manager_id: form.manager_id || null };
    if (editId) {
      const { error } = await supabase.from('departments').update(payload).eq('id', editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logActivity(null, 'Updated department', 'department', editId, { name: form.name });
      toast.success('Department updated');
    } else {
      const { error, data } = await supabase.from('departments').insert([payload]).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logActivity(null, 'Created department', 'department', data?.id, { name: form.name });
      toast.success('Department created');
    }
    setSaving(false);
    setFormOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    const { count, error: countErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('department_id', deleteId);
    if (countErr) { toast.error(countErr.message); setSaving(false); return; }
    if ((count || 0) > 0) {
      toast.error('Cannot delete department with active employees');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('departments').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await logActivity(null, 'Deleted department', 'department', deleteId);
    toast.success('Department deleted');
    setSaving(false);
    setDeleteId(null);
    fetchAll();
  };

  const DEPT_COLORS = ['hsl(168,80%,32%)', 'hsl(262,60%,55%)', 'hsl(24,80%,55%)', 'hsl(210,70%,55%)', 'hsl(340,65%,55%)'];

  if (loading) {
    return (
      <>
        <AppHeader title="Departments" />
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Departments" breadcrumbs={[{ label: 'Home' }, { label: 'Departments' }]} />
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{departments.length} Departments</h2>
          {role === 'admin' && (
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Department</Button>
          )}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d, i) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${DEPT_COLORS[i % DEPT_COLORS.length]}20` }}>
                      <Building2 className="h-5 w-5" style={{ color: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{d.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{d.description}</p>
                    </div>
                  </div>
                  {role === 'admin' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {d.managerName.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Manager: {d.managerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{d.headcount} Employees</Badge>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate(`/employees?dept=${d.id}`)}>
                    View Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance table */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Department Performance</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Headcount</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Active %</TableHead>
                    <TableHead>Avg Tenure (mo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.headcount}</TableCell>
                      <TableCell>{d.managerName}</TableCell>
                      <TableCell>{d.activePercent}%</TableCell>
                      <TableCell>{d.avgTenure}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>Fill in department details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input disabled={saving} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input disabled={saving} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Manager</Label>
              <Select disabled={saving} value={form.manager_id} onValueChange={v => setForm(f => ({ ...f, manager_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>{managers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
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
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this department and all its designations. Check empty state.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
