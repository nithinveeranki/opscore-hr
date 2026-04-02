import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';

import { Loader2 } from 'lucide-react';

const levelColors: Record<string, string> = {
  junior: 'bg-muted text-muted-foreground',
  mid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  senior: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  lead: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  executive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function DesignationsPage() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [designations, setDesignations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', department_id: '', level: 'mid' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [desRes, deptRes, profRes] = await Promise.all([
      supabase.from('designations').select('*, departments(name)'),
      supabase.from('departments').select('id, name'),
      supabase.from('profiles').select('designation_id'),
    ]);
    const des = desRes.data || [];
    const profs = profRes.data || [];
    setDesignations(des.map(d => ({
      ...d, empCount: profs.filter(p => p.designation_id === d.id).length
    })));
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditId(null); setForm({ title: '', department_id: '', level: 'mid' }); setFormOpen(true); };
  const openEdit = (d: any) => { setEditId(d.id); setForm({ title: d.title, department_id: d.department_id, level: d.level }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.title || !form.department_id) { toast.error('Title and department are required'); return; }
    setSaving(true);
    const payload = { title: form.title, department_id: form.department_id, level: form.level as any };
    if (editId) {
      const { error } = await supabase.from('designations').update(payload).eq('id', editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logActivity(null, 'Updated designation', 'designation', editId);
      toast.success('Designation updated');
    } else {
      const { error, data } = await supabase.from('designations').insert([payload]).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logActivity(null, 'Created designation', 'designation', data?.id);
      toast.success('Designation created');
    }
    setSaving(false); setFormOpen(false); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    const { error } = await supabase.from('designations').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await logActivity(null, 'Deleted designation', 'designation', deleteId);
    toast.success('Designation deleted');
    setSaving(false); setDeleteId(null); fetchAll();
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Designations" />
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Designations" breadcrumbs={[{ label: 'Home' }, { label: 'Designations' }]} />
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{designations.length} Designations</h2>
          {role === 'admin' && (
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Designation</Button>
          )}
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex flex-col items-center py-12 text-muted-foreground">
                        <Briefcase className="h-10 w-10 mb-3 opacity-30" />
                        <p>No designations yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {designations.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{d.departments?.name || '—'}</Badge></TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${levelColors[d.level] || ''}`}>{d.level}</span>
                    </TableCell>
                    <TableCell>{d.empCount}</TableCell>
                    <TableCell className="text-right">
                      {role === 'admin' && (
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Designation</DialogTitle><DialogDescription>Fill in details below.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input disabled={saving} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select disabled={saving} value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select disabled={saving} value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['junior','mid','senior','lead','manager','executive'].map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                </SelectContent>
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
          <AlertDialogHeader><AlertDialogTitle>Delete Designation</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
