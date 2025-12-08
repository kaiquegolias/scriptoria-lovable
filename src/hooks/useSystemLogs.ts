import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { parseQuery, ParsedQuery } from '@/utils/queryParser';

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';
export type LogEventType = 
  | 'chamado_created' | 'chamado_updated' | 'chamado_deleted' | 'chamado_status_changed'
  | 'script_created' | 'script_updated' | 'script_deleted' | 'script_executed'
  | 'user_login' | 'user_logout' | 'user_signup'
  | 'error' | 'system' | 'custom';

export interface SystemLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email: string | null;
  event_type: LogEventType;
  severity: LogSeverity;
  message: string;
  origin: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
}

export interface LogFilters {
  eventType?: LogEventType;
  severity?: LogSeverity;
  origin?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export function useSystemLogs(initialFilters?: LogFilters) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>(initialFilters || {});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply filters
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.origin) {
        query = query.eq('origin', filters.origin);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      // Parse and apply search query
      if (filters.searchQuery) {
        const parsed = parseQuery(filters.searchQuery);
        
        // Apply text search
        if (parsed.textSearch) {
          query = query.ilike('message', `%${parsed.textSearch}%`);
        }

        // Apply date range from query
        if (parsed.dateRange?.start) {
          query = query.gte('timestamp', parsed.dateRange.start.toISOString());
        }
        if (parsed.dateRange?.end) {
          query = query.lte('timestamp', parsed.dateRange.end.toISOString());
        }

        // Apply parsed filters
        for (const filter of parsed.filters) {
          switch (filter.operator) {
            case 'equals':
              query = query.eq(filter.field, filter.value);
              break;
            case 'not_equals':
              query = query.neq(filter.field, filter.value);
              break;
            case 'contains':
              query = query.ilike(filter.field, `%${filter.value}%`);
              break;
            case 'gt':
              query = query.gt(filter.field, filter.value);
              break;
            case 'lt':
              query = query.lt(filter.field, filter.value);
              break;
            case 'gte':
              query = query.gte(filter.field, filter.value);
              break;
            case 'lte':
              query = query.lte(filter.field, filter.value);
              break;
          }
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data as SystemLog[] || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Erro ao buscar logs.');
    } finally {
      setLoading(false);
    }
  }, [user, filters, page, pageSize]);

  // Create a new log entry
  const createLog = useCallback(async (
    eventType: LogEventType,
    message: string,
    options: {
      severity?: LogSeverity;
      origin?: string;
      entityType?: string;
      entityId?: string;
      payload?: Record<string, any>;
    } = {}
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('system_logs')
        .insert({
          user_id: user.id,
          user_email: user.email,
          event_type: eventType,
          severity: options.severity || 'info',
          message,
          origin: options.origin || 'system',
          entity_type: options.entityType,
          entity_id: options.entityId,
          payload: options.payload || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as SystemLog;
    } catch (error) {
      console.error('Error creating log:', error);
      return null;
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('system-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs'
        },
        (payload) => {
          const newLog = payload.new as SystemLog;
          setLogs(prev => [newLog, ...prev.slice(0, pageSize - 1)]);
          setTotalCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pageSize]);

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    totalCount,
    page,
    setPage,
    pageSize,
    filters,
    setFilters,
    createLog,
    refreshLogs: fetchLogs,
  };
}

// Helper hook for logging from anywhere in the app
export function useLogAction() {
  const { user } = useAuth();

  const logAction = useCallback(async (
    eventType: LogEventType,
    message: string,
    options: {
      severity?: LogSeverity;
      origin?: string;
      entityType?: string;
      entityId?: string;
      payload?: Record<string, any>;
    } = {}
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('system_logs')
        .insert({
          user_id: user.id,
          user_email: user.email,
          event_type: eventType,
          severity: options.severity || 'info',
          message,
          origin: options.origin || 'system',
          entity_type: options.entityType,
          entity_id: options.entityId,
          payload: options.payload || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging action:', error);
      return null;
    }
  }, [user]);

  return { logAction };
}
