import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { differenceInDays } from 'date-fns';

export interface OverdueTicket {
  id: string;
  titulo: string;
  dataLimite: string;
  nivel: string;
  estruturante: string;
  diasAtraso: number;
}

export function useOverdueNotifications() {
  const [overdueTickets, setOverdueTickets] = useState<OverdueTicket[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOverdueTickets = useCallback(async () => {
    if (!user) {
      setOverdueTickets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();

      // Fetch overdue tickets (data_limite < now AND status != resolvido)
      const { data: tickets, error: ticketsError } = await supabase
        .from('chamados')
        .select('id, titulo, data_limite, nivel, estruturante')
        .lt('data_limite', now)
        .neq('status', 'resolvido')
        .not('data_limite', 'is', null)
        .order('data_limite', { ascending: true })
        .limit(50);

      if (ticketsError) throw ticketsError;

      // Fetch dismissed notifications for this user
      const { data: dismissed, error: dismissedError } = await supabase
        .from('dismissed_notifications')
        .select('ticket_id')
        .eq('user_id', user.id);

      if (dismissedError) throw dismissedError;

      const dismissedSet = new Set(dismissed?.map(d => d.ticket_id) || []);
      setDismissedIds(dismissedSet);

      const overdueList: OverdueTicket[] = (tickets || []).map(ticket => ({
        id: ticket.id,
        titulo: ticket.titulo,
        dataLimite: ticket.data_limite!,
        nivel: ticket.nivel,
        estruturante: ticket.estruturante,
        diasAtraso: differenceInDays(new Date(), new Date(ticket.data_limite!)),
      }));

      setOverdueTickets(overdueList);
    } catch (error) {
      console.error('Error fetching overdue tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const dismissNotification = useCallback(async (ticketId: string) => {
    if (!user) return;

    try {
      // Log the action
      await supabase.from('notifications_log').insert({
        user_id: user.id,
        ticket_id: ticketId,
        action: 'dismissed',
      });

      // Add to dismissed notifications
      await supabase.from('dismissed_notifications').insert({
        user_id: user.id,
        ticket_id: ticketId,
      });

      setDismissedIds(prev => new Set([...prev, ticketId]));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, [user]);

  const logNotificationClick = useCallback(async (ticketId: string) => {
    if (!user) return;

    try {
      await supabase.from('notifications_log').insert({
        user_id: user.id,
        ticket_id: ticketId,
        action: 'clicked',
      });
    } catch (error) {
      console.error('Error logging notification click:', error);
    }
  }, [user]);

  const logBellClick = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.from('notifications_log').insert({
        user_id: user.id,
        ticket_id: null,
        action: 'viewed',
      });
    } catch (error) {
      console.error('Error logging bell click:', error);
    }
  }, [user]);

  // Get only non-dismissed tickets for count
  const activeOverdueTickets = overdueTickets.filter(t => !dismissedIds.has(t.id));
  const overdueCount = activeOverdueTickets.length;
  const displayCount = overdueCount > 99 ? '99+' : overdueCount.toString();

  useEffect(() => {
    fetchOverdueTickets();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchOverdueTickets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchOverdueTickets]);

  return {
    overdueTickets,
    activeOverdueTickets,
    overdueCount,
    displayCount,
    loading,
    dismissNotification,
    logNotificationClick,
    logBellClick,
    refreshNotifications: fetchOverdueTickets,
  };
}
