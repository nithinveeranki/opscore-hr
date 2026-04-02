import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityLogPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
    // Realtime subscription
    const channel = supabase
      .channel('activity_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
        setLogs(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('*, profiles:actor_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLoading(false);
  };

  const targetTypeColor: Record<string, string> = {
    employee: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    department: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    designation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Activity Log" />
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Activity Log" breadcrumbs={[{ label: 'Home' }, { label: 'Activity Log' }]} />
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center py-12 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                        <p>No activity recorded yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {((log.profiles as any)?.full_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{(log.profiles as any)?.full_name || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${targetTypeColor[log.target_type] || 'bg-muted text-muted-foreground'}`}>
                        {log.target_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" title={new Date(log.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}
