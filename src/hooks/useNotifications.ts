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

export interface SystemAlert {
  id: string;
  type: 'deleted' | 'closed' | 'created';
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  entityId?: string;
  userEmail?: string;
}

export function useNotifications() {
  const [overdueTickets, setOverdueTickets] = useState<OverdueTicket[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOverdueTickets = useCallback(async () => {
    if (!user) return [];

    try {
      const now = new Date().toISOString();

      const { data: tickets, error: ticketsError } = await supabase
        .from('chamados')
        .select('id, titulo, data_limite, nivel, estruturante')
        .lt('data_limite', now)
        .neq('status', 'resolvido')
        .not('data_limite', 'is', null)
        .order('data_limite', { ascending: true })
        .limit(50);

      if (ticketsError) throw ticketsError;

      return (tickets || []).map(ticket => ({
        id: ticket.id,
        titulo: ticket.titulo,
        dataLimite: ticket.data_limite!,
        nivel: ticket.nivel,
        estruturante: ticket.estruturante,
        diasAtraso: differenceInDays(new Date(), new Date(ticket.data_limite!)),
      }));
    } catch (error) {
      console.error('Error fetching overdue tickets:', error);
      return [];
    }
  }, [user]);

  const fetchSystemAlerts = useCallback(async () => {
    if (!user) return [];

    try {
      // Fetch deleted chamados
      const { data: deletedLogs, error: deletedError } = await supabase
        .from('system_logs')
        .select('*')
        .eq('event_type', 'chamado_deleted')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (deletedError) throw deletedError;

      // Fetch closed/finalized chamados
      const { data: closedLogs, error: closedError } = await supabase
        .from('system_logs')
        .select('*')
        .eq('event_type', 'chamado_status_changed')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (closedError) throw closedError;

      const deletedAlerts: SystemAlert[] = (deletedLogs || []).map(log => ({
        id: log.id,
        type: 'deleted' as const,
        title: 'Chamado Excluído',
        message: log.message,
        timestamp: log.timestamp,
        severity: 'warning' as const,
        entityId: log.entity_id || undefined,
        userEmail: log.user_email || undefined,
      }));

      const closedAlerts: SystemAlert[] = (closedLogs || [])
        .filter(log => log.message?.includes('encerrado'))
        .map(log => ({
          id: log.id,
          type: 'closed' as const,
          title: 'Chamado Finalizado',
          message: log.message,
          timestamp: log.timestamp,
          severity: 'info' as const,
          entityId: log.entity_id || undefined,
          userEmail: log.user_email || undefined,
        }));

      return [...deletedAlerts, ...closedAlerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }, [user]);

  const fetchDismissedIds = useCallback(async () => {
    if (!user) return new Set<string>();

    try {
      const { data: dismissed, error } = await supabase
        .from('dismissed_notifications')
        .select('ticket_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return new Set(dismissed?.map(d => d.ticket_id) || []);
    } catch (error) {
      console.error('Error fetching dismissed ids:', error);
      return new Set<string>();
    }
  }, [user]);

  const fetchAllNotifications = useCallback(async () => {
    if (!user) {
      setOverdueTickets([]);
      setSystemAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [overdue, alerts, dismissed] = await Promise.all([
        fetchOverdueTickets(),
        fetchSystemAlerts(),
        fetchDismissedIds(),
      ]);

      setOverdueTickets(overdue);
      setSystemAlerts(alerts);
      setDismissedIds(dismissed);
    } finally {
      setLoading(false);
    }
  }, [user, fetchOverdueTickets, fetchSystemAlerts, fetchDismissedIds]);

  const dismissNotification = useCallback(async (ticketId: string) => {
    if (!user) return;

    try {
      await supabase.from('notifications_log').insert({
        user_id: user.id,
        ticket_id: ticketId,
        action: 'dismissed',
      });

      await supabase.from('dismissed_notifications').insert({
        user_id: user.id,
        ticket_id: ticketId,
      });

      setDismissedIds(prev => new Set([...prev, ticketId]));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, [user]);

  const dismissAllNotifications = useCallback(async () => {
    if (!user) return;

    try {
      // Dismiss all overdue tickets
      const ticketIds = overdueTickets.map(t => t.id);
      
      for (const ticketId of ticketIds) {
        await supabase.from('dismissed_notifications').upsert({
          user_id: user.id,
          ticket_id: ticketId,
        }, { onConflict: 'user_id,ticket_id' });
      }

      // Log the bulk dismiss action
      await supabase.from('notifications_log').insert({
        user_id: user.id,
        ticket_id: null,
        action: 'dismissed_all',
      });

      // Clear system alerts from local state
      setSystemAlerts([]);
      setDismissedIds(new Set(ticketIds));
    } catch (error) {
      console.error('Error dismissing all notifications:', error);
    }
  }, [user, overdueTickets]);

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

  // Subscribe to realtime changes for system alerts
  useEffect(() => {
    if (!user) return;

    fetchAllNotifications();

    const channel = supabase
      .channel('notifications-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs',
        },
        (payload) => {
          const newLog = payload.new as any;
          
          if (newLog.event_type === 'chamado_deleted') {
            const newAlert: SystemAlert = {
              id: newLog.id,
              type: 'deleted',
              title: 'Chamado Excluído',
              message: newLog.message,
              timestamp: newLog.timestamp,
              severity: 'warning',
              entityId: newLog.entity_id,
              userEmail: newLog.user_email,
            };
            setSystemAlerts(prev => [newAlert, ...prev].slice(0, 30));
          } else if (newLog.event_type === 'chamado_status_changed' && newLog.message?.includes('encerrado')) {
            const newAlert: SystemAlert = {
              id: newLog.id,
              type: 'closed',
              title: 'Chamado Finalizado',
              message: newLog.message,
              timestamp: newLog.timestamp,
              severity: 'info',
              entityId: newLog.entity_id,
              userEmail: newLog.user_email,
            };
            setSystemAlerts(prev => [newAlert, ...prev].slice(0, 30));
          }
        }
      )
      .subscribe();

    // Refresh every 5 minutes
    const interval = setInterval(fetchAllNotifications, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchAllNotifications]);

  const activeOverdueTickets = overdueTickets.filter(t => !dismissedIds.has(t.id));
  const overdueCount = activeOverdueTickets.length;
  const alertsCount = systemAlerts.length;
  const totalCount = overdueCount + alertsCount;
  const displayCount = totalCount > 99 ? '99+' : totalCount.toString();

  return {
    overdueTickets,
    activeOverdueTickets,
    systemAlerts,
    overdueCount,
    alertsCount,
    totalCount,
    displayCount,
    loading,
    dismissNotification,
    dismissAllNotifications,
    logNotificationClick,
    logBellClick,
    refreshNotifications: fetchAllNotifications,
  };
}
