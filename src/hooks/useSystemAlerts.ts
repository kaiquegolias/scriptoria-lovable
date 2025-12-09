import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SystemAlert {
  id: string;
  type: 'deleted' | 'closed' | 'created' | 'error';
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  entityId?: string;
  entityType?: string;
  userEmail?: string;
  payload?: any;
}

export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRecentAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch chamados deleted (warning alerts)
      const { data: deletedLogs, error: deletedError } = await supabase
        .from('system_logs')
        .select('*')
        .eq('event_type', 'chamado_deleted')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (deletedError) throw deletedError;

      // Fetch chamados closed/finalized
      const { data: closedLogs, error: closedError } = await supabase
        .from('system_logs')
        .select('*')
        .eq('event_type', 'chamado_status_changed')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (closedError) throw closedError;

      // Transform logs to alerts
      const deletedAlerts: SystemAlert[] = (deletedLogs || []).map(log => ({
        id: log.id,
        type: 'deleted' as const,
        title: 'Chamado Excluído',
        message: log.message,
        timestamp: log.timestamp,
        severity: 'warning' as const,
        entityId: log.entity_id || undefined,
        entityType: log.entity_type || undefined,
        userEmail: log.user_email || undefined,
        payload: log.payload,
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
          entityType: log.entity_type || undefined,
          userEmail: log.user_email || undefined,
          payload: log.payload,
        }));

      // Combine and sort by timestamp
      const allAlerts = [...deletedAlerts, ...closedAlerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error fetching system alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    fetchRecentAlerts();

    const channel = supabase
      .channel('system-alerts')
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
              entityType: newLog.entity_type,
              userEmail: newLog.user_email,
              payload: newLog.payload,
            };
            setAlerts(prev => [newAlert, ...prev].slice(0, 50));
          } else if (newLog.event_type === 'chamado_status_changed' && newLog.message?.includes('encerrado')) {
            const newAlert: SystemAlert = {
              id: newLog.id,
              type: 'closed',
              title: 'Chamado Finalizado',
              message: newLog.message,
              timestamp: newLog.timestamp,
              severity: 'info',
              entityId: newLog.entity_id,
              entityType: newLog.entity_type,
              userEmail: newLog.user_email,
              payload: newLog.payload,
            };
            setAlerts(prev => [newAlert, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRecentAlerts]);

  return {
    alerts,
    loading,
    refreshAlerts: fetchRecentAlerts,
  };
}
