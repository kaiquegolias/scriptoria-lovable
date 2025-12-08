import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export type AlertStatus = 'active' | 'paused' | 'triggered';

export interface Alert {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  description: string | null;
  condition_query: string;
  threshold: number;
  time_window_minutes: number;
  status: AlertStatus;
  notify_email: boolean;
  notify_internal: boolean;
  email_recipients: string[];
  custom_message: string | null;
  last_triggered_at: string | null;
  trigger_count: number;
}

export interface AlertHistory {
  id: string;
  alert_id: string;
  triggered_at: string;
  matched_logs_count: number;
  notification_sent: boolean;
  notification_error: string | null;
  sample_logs: any[];
}

export interface CreateAlertInput {
  name: string;
  description?: string;
  condition_query: string;
  threshold: number;
  time_window_minutes: number;
  notify_email: boolean;
  notify_internal: boolean;
  email_recipients: string[];
  custom_message?: string;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlerts(data as Alert[] || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Erro ao buscar alertas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createAlert = useCallback(async (input: CreateAlertInput) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description,
          condition_query: input.condition_query,
          threshold: input.threshold,
          time_window_minutes: input.time_window_minutes,
          notify_email: input.notify_email,
          notify_internal: input.notify_internal,
          email_recipients: input.email_recipients,
          custom_message: input.custom_message,
        })
        .select()
        .single();

      if (error) throw error;

      const newAlert = data as Alert;
      setAlerts(prev => [newAlert, ...prev]);
      toast.success('Alerta criado com sucesso!');
      return newAlert;
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Erro ao criar alerta.');
      return null;
    }
  }, [user]);

  const updateAlert = useCallback(async (id: string, updates: Partial<CreateAlertInput & { status: AlertStatus }>) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedAlert = data as Alert;
      setAlerts(prev => prev.map(a => a.id === id ? updatedAlert : a));
      toast.success('Alerta atualizado com sucesso!');
      return updatedAlert;
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Erro ao atualizar alerta.');
      return null;
    }
  }, [user]);

  const deleteAlert = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Alerta excluído com sucesso!');
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Erro ao excluir alerta.');
      return false;
    }
  }, [user]);

  const toggleAlertStatus = useCallback(async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return null;

    const newStatus: AlertStatus = alert.status === 'active' ? 'paused' : 'active';
    return updateAlert(id, { status: newStatus });
  }, [alerts, updateAlert]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlertStatus,
    refreshAlerts: fetchAlerts,
  };
}

export function useAlertHistory(alertId?: string) {
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('alert_history')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(100);

      if (alertId) {
        query = query.eq('alert_id', alertId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setHistory(data as AlertHistory[] || []);
    } catch (error) {
      console.error('Error fetching alert history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, alertId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    refreshHistory: fetchHistory,
  };
}
