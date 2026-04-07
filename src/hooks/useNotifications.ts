import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { differenceInDays, isToday, isPast, parseISO } from 'date-fns';

export interface OverdueTicket {
  id: string;
  titulo: string;
  dataLimite: string;
  nivel: string;
  estruturante: string;
  diasAtraso: number;
}

export interface OverdueDiaryEntry {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string | null;
  diasAtraso: number;
  isDueToday: boolean;
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
  const [overdueDiaryEntries, setOverdueDiaryEntries] = useState<OverdueDiaryEntry[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const clearingRef = useRef(false);

  const fetchOverdueTickets = useCallback(async () => {
    if (!user) return [];
    try {
      const now = new Date().toISOString();
      const { data: tickets, error } = await supabase
        .from('chamados')
        .select('id, titulo, data_limite, nivel, estruturante')
        .lt('data_limite', now)
        .neq('status', 'resolvido')
        .neq('status', 'excluido')
        .not('data_limite', 'is', null)
        .order('data_limite', { ascending: true })
        .limit(50);
      if (error) throw error;
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

  const fetchOverdueDiaryEntries = useCallback(async () => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, title, due_date, due_time, completed')
        .eq('completed', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });
      if (error) throw error;

      const now = new Date();
      const entries: OverdueDiaryEntry[] = [];
      for (const entry of data || []) {
        const dueDate = parseISO(entry.due_date!);
        const dueDateWithTime = entry.due_time
          ? parseISO(`${entry.due_date}T${entry.due_time}`)
          : dueDate;
        const dueToday = isToday(dueDate);
        const overdue = isPast(dueDateWithTime) && !dueToday;
        if (overdue || dueToday) {
          entries.push({
            id: entry.id,
            title: entry.title,
            dueDate: entry.due_date!,
            dueTime: entry.due_time,
            diasAtraso: overdue ? differenceInDays(now, dueDate) : 0,
            isDueToday: dueToday,
          });
        }
      }
      return entries;
    } catch (error) {
      console.error('Error fetching overdue diary entries:', error);
      return [];
    }
  }, [user]);

  const fetchSystemAlerts = useCallback(async () => {
    if (!user) return [];
    try {
      const [{ data: deletedLogs, error: deletedError }, { data: closedLogs, error: closedError }] = await Promise.all([
        supabase
          .from('system_logs')
          .select('*')
          .eq('event_type', 'chamado_deleted')
          .order('timestamp', { ascending: false })
          .limit(20),
        supabase
          .from('system_logs')
          .select('*')
          .eq('event_type', 'chamado_status_changed')
          .order('timestamp', { ascending: false })
          .limit(20),
      ]);

      if (deletedError) throw deletedError;
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
    if (!user) return { tickets: new Set<string>(), alerts: new Set<string>() };
    try {
      const [{ data: dismissedTickets, error: ticketsError }, { data: dismissedAlerts, error: alertsError }] = await Promise.all([
        supabase.from('dismissed_notifications').select('ticket_id').eq('user_id', user.id),
        supabase.from('dismissed_alerts').select('alert_id').eq('user_id', user.id),
      ]);
      if (ticketsError) throw ticketsError;
      if (alertsError) throw alertsError;
      return {
        tickets: new Set(dismissedTickets?.map(d => d.ticket_id) || []),
        alerts: new Set(dismissedAlerts?.map(d => d.alert_id) || []),
      };
    } catch (error) {
      console.error('Error fetching dismissed ids:', error);
      return { tickets: new Set<string>(), alerts: new Set<string>() };
    }
  }, [user]);

  const fetchAllNotifications = useCallback(async () => {
    if (!user) {
      setOverdueTickets([]);
      setOverdueDiaryEntries([]);
      setSystemAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [overdue, diary, alerts, dismissed] = await Promise.all([
        fetchOverdueTickets(),
        fetchOverdueDiaryEntries(),
        fetchSystemAlerts(),
        fetchDismissedIds(),
      ]);
      setOverdueTickets(overdue);
      setOverdueDiaryEntries(diary);
      setSystemAlerts(alerts);
      setDismissedIds(dismissed.tickets);
      setDismissedAlertIds(dismissed.alerts);
    } finally {
      setLoading(false);
    }
  }, [user, fetchOverdueTickets, fetchOverdueDiaryEntries, fetchSystemAlerts, fetchDismissedIds]);

  const dismissNotification = useCallback(async (ticketId: string) => {
    if (!user) return;
    // Optimistic update
    setDismissedIds(prev => new Set([...prev, ticketId]));
    try {
      await Promise.all([
        supabase.from('notifications_log').insert({ user_id: user.id, ticket_id: ticketId, action: 'dismissed' }),
        supabase.from('dismissed_notifications').insert({ user_id: user.id, ticket_id: ticketId }),
      ]);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, [user]);

  const dismissAllNotifications = useCallback(async () => {
    if (!user || clearingRef.current) return;
    clearingRef.current = true;

    // Optimistic: clear everything immediately in the UI
    const ticketIds = overdueTickets.map(t => t.id);
    const alertIds = systemAlerts.filter(a => !dismissedAlertIds.has(a.id)).map(a => a.id);

    setDismissedIds(prev => new Set([...prev, ...ticketIds]));
    setDismissedAlertIds(prev => new Set([...prev, ...alertIds]));
    setOverdueDiaryEntries([]);

    try {
      // Batch insert tickets
      if (ticketIds.length > 0) {
        const ticketRows = ticketIds.map(id => ({ user_id: user.id, ticket_id: id }));
        await supabase.from('dismissed_notifications').upsert(ticketRows, { onConflict: 'user_id,ticket_id' });
      }

      // Batch insert alerts
      if (alertIds.length > 0) {
        const alertRows = alertIds.map(id => ({ user_id: user.id, alert_id: id }));
        await supabase.from('dismissed_alerts').upsert(alertRows, { onConflict: 'user_id,alert_id' });
      }

      // Mark diary entries as completed
      const diaryIds = overdueDiaryEntries.map(e => e.id);
      if (diaryIds.length > 0) {
        await supabase.from('diary_entries').update({ completed: true }).in('id', diaryIds);
      }

      await supabase.from('notifications_log').insert({ user_id: user.id, ticket_id: null, action: 'dismissed_all' });
    } catch (error) {
      console.error('Error dismissing all notifications:', error);
    } finally {
      clearingRef.current = false;
    }
  }, [user, overdueTickets, systemAlerts, overdueDiaryEntries, dismissedAlertIds]);

  const logNotificationClick = useCallback(async (ticketId: string) => {
    if (!user) return;
    try {
      await supabase.from('notifications_log').insert({ user_id: user.id, ticket_id: ticketId, action: 'clicked' });
    } catch (error) {
      console.error('Error logging notification click:', error);
    }
  }, [user]);

  const logBellClick = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from('notifications_log').insert({ user_id: user.id, ticket_id: null, action: 'viewed' });
    } catch (error) {
      console.error('Error logging bell click:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAllNotifications();

    const channel = supabase
      .channel('notifications-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (payload) => {
        const newLog = payload.new as any;
        if (newLog.event_type === 'chamado_deleted') {
          setSystemAlerts(prev => [{
            id: newLog.id, type: 'deleted', title: 'Chamado Excluído',
            message: newLog.message, timestamp: newLog.timestamp,
            severity: 'warning', entityId: newLog.entity_id, userEmail: newLog.user_email,
          }, ...prev].slice(0, 30));
        } else if (newLog.event_type === 'chamado_status_changed' && newLog.message?.includes('encerrado')) {
          setSystemAlerts(prev => [{
            id: newLog.id, type: 'closed', title: 'Chamado Finalizado',
            message: newLog.message, timestamp: newLog.timestamp,
            severity: 'info', entityId: newLog.entity_id, userEmail: newLog.user_email,
          }, ...prev].slice(0, 30));
        }
      })
      .subscribe();

    const interval = setInterval(fetchAllNotifications, 5 * 60 * 1000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchAllNotifications]);

  const activeOverdueTickets = overdueTickets.filter(t => !dismissedIds.has(t.id));
  const activeSystemAlerts = systemAlerts.filter(a => !dismissedAlertIds.has(a.id));
  const overdueCount = activeOverdueTickets.length;
  const diaryCount = overdueDiaryEntries.length;
  const alertsCount = activeSystemAlerts.length;
  const totalCount = overdueCount + alertsCount + diaryCount;
  const displayCount = totalCount > 99 ? '99+' : totalCount.toString();

  return {
    overdueTickets,
    activeOverdueTickets,
    overdueDiaryEntries,
    systemAlerts: activeSystemAlerts,
    overdueCount,
    diaryCount,
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
