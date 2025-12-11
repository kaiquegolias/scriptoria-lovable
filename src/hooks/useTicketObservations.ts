import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Observation {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  userEmail?: string;
}

export function useTicketObservations(ticketId: string) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchObservations = useCallback(async () => {
    if (!ticketId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_followups')
        .select('id, content, created_at, created_by')
        .eq('ticket_id', ticketId)
        .eq('type', 'observation')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails for display
      const userIds = [...new Set((data || []).map(d => d.created_by).filter(Boolean))];
      
      let userEmails: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nome')
          .in('user_id', userIds);
        
        userEmails = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.nome || 'Usuário';
          return acc;
        }, {} as Record<string, string>);
      }

      setObservations((data || []).map(d => ({
        id: d.id,
        content: d.content || '',
        createdAt: d.created_at,
        createdBy: d.created_by || '',
        userEmail: userEmails[d.created_by || ''] || 'Usuário',
      })));
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const addObservation = useCallback(async (content: string) => {
    if (!user || !ticketId || !content.trim()) return false;

    try {
      const { data, error } = await supabase
        .from('ticket_followups')
        .insert({
          ticket_id: ticketId,
          type: 'observation',
          content: content.trim(),
          created_by: user.id,
        })
        .select('id, content, created_at, created_by')
        .single();

      if (error) throw error;

      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('user_id', user.id)
        .maybeSingle();

      const newObservation: Observation = {
        id: data.id,
        content: data.content || '',
        createdAt: data.created_at,
        createdBy: data.created_by || '',
        userEmail: profile?.nome || user.email || 'Usuário',
      };

      setObservations(prev => [newObservation, ...prev]);
      toast.success('Observação adicionada!');
      return true;
    } catch (error) {
      console.error('Error adding observation:', error);
      toast.error('Erro ao adicionar observação');
      return false;
    }
  }, [user, ticketId]);

  return {
    observations,
    loading,
    fetchObservations,
    addObservation,
  };
}
