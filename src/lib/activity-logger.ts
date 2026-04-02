import { supabase } from '@/integrations/supabase/client';

export const logActivity = async (
  actorId: string | null,
  action: string,
  targetType: 'employee' | 'department' | 'designation',
  targetId: string,
  metadata?: object
) => {
  let finalActorId = actorId;
  if (!finalActorId) {
    const { data: { user } } = await supabase.auth.getUser();
    finalActorId = user?.id || null;
  }
  
  if (!finalActorId) return;

  await supabase.from('activity_logs').insert({
    actor_id: finalActorId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: (metadata as any) || {}
  });
}
