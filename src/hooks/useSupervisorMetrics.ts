import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { startOfDay, subDays, subHours, format } from 'date-fns';

export interface SupervisorMetrics {
  totalChamados: number;
  chamadosAbertos: number;
  chamadosEmAndamento: number;
  chamadosResolvidos: number;
  chamadosComErro: number;
  
  totalScripts: number;
  scriptsExecutados24h: number;
  scriptsExecutadosSemana: number;
  scriptsFalha: number;
  scriptsSuccesso: number;
  
  totalLogs: number;
  logsUltimas24h: number;
  errosUltimas24h: number;
  errosCriticos: number;
  
  alertasAtivos: number;
  alertasDisparados: number;
  
  timelineData: TimelinePoint[];
  severityDistribution: { name: string; value: number; color: string }[];
  eventTypeDistribution: { name: string; value: number }[];
}

export interface TimelinePoint {
  timestamp: string;
  label: string;
  info: number;
  warning: number;
  error: number;
  critical: number;
}

export function useSupervisorMetrics() {
  const [metrics, setMetrics] = useState<SupervisorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const last24h = subHours(now, 24);
      const lastWeek = subDays(now, 7);

      // Fetch chamados counts
      const { data: chamados } = await supabase
        .from('chamados')
        .select('status');

      const totalChamados = chamados?.length || 0;
      const chamadosAbertos = chamados?.filter(c => 
        ['agendados', 'agendados_planner', 'agendados_aguardando'].includes(c.status)
      ).length || 0;
      const chamadosEmAndamento = chamados?.filter(c => c.status === 'em_andamento').length || 0;
      const chamadosResolvidos = chamados?.filter(c => c.status === 'resolvido').length || 0;

      // Fetch scripts counts
      const { data: scripts } = await supabase
        .from('scripts')
        .select('situacao, created_at');

      const totalScripts = scripts?.length || 0;

      // Fetch logs metrics
      const { data: allLogs, count: totalLogs } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact' });

      const { data: logs24h } = await supabase
        .from('system_logs')
        .select('severity, event_type, timestamp')
        .gte('timestamp', last24h.toISOString());

      const logsUltimas24h = logs24h?.length || 0;
      const errosUltimas24h = logs24h?.filter(l => l.severity === 'error' || l.severity === 'critical').length || 0;
      const errosCriticos = logs24h?.filter(l => l.severity === 'critical').length || 0;

      // Fetch alerts counts
      const { data: alerts } = await supabase
        .from('alerts')
        .select('status, trigger_count');

      const alertasAtivos = alerts?.filter(a => a.status === 'active').length || 0;
      const alertasDisparados = alerts?.reduce((sum, a) => sum + (a.trigger_count || 0), 0) || 0;

      // Build timeline data (last 24 hours, hourly)
      const timelineData: TimelinePoint[] = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = subHours(now, i + 1);
        const hourEnd = subHours(now, i);
        const label = format(hourEnd, 'HH:mm');

        const hourLogs = logs24h?.filter(l => {
          const logTime = new Date(l.timestamp);
          return logTime >= hourStart && logTime < hourEnd;
        }) || [];

        timelineData.push({
          timestamp: hourEnd.toISOString(),
          label,
          info: hourLogs.filter(l => l.severity === 'info').length,
          warning: hourLogs.filter(l => l.severity === 'warning').length,
          error: hourLogs.filter(l => l.severity === 'error').length,
          critical: hourLogs.filter(l => l.severity === 'critical').length,
        });
      }

      // Severity distribution
      const severityDistribution = [
        { name: 'Info', value: logs24h?.filter(l => l.severity === 'info').length || 0, color: 'hsl(var(--primary))' },
        { name: 'Warning', value: logs24h?.filter(l => l.severity === 'warning').length || 0, color: 'hsl(45, 93%, 47%)' },
        { name: 'Error', value: logs24h?.filter(l => l.severity === 'error').length || 0, color: 'hsl(var(--destructive))' },
        { name: 'Critical', value: logs24h?.filter(l => l.severity === 'critical').length || 0, color: 'hsl(0, 84%, 40%)' },
      ];

      // Event type distribution
      const eventTypeCounts: Record<string, number> = {};
      logs24h?.forEach(log => {
        eventTypeCounts[log.event_type] = (eventTypeCounts[log.event_type] || 0) + 1;
      });

      const eventTypeDistribution = Object.entries(eventTypeCounts)
        .map(([name, value]) => ({ name: formatEventType(name), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Script execution metrics from logs
      const scriptLogs = allLogs?.filter(l => 
        l.event_type === 'script_executed' || 
        l.event_type === 'script_created' ||
        l.event_type === 'script_updated'
      ) || [];

      const scriptsExecutados24h = scriptLogs.filter(l => 
        new Date(l.timestamp) >= last24h
      ).length;

      const scriptsExecutadosSemana = scriptLogs.filter(l => 
        new Date(l.timestamp) >= lastWeek
      ).length;

      const scriptsFalha = allLogs?.filter(l => 
        l.event_type === 'script_executed' && 
        l.severity === 'error'
      ).length || 0;

      const scriptsSuccesso = allLogs?.filter(l => 
        l.event_type === 'script_executed' && 
        l.severity === 'info'
      ).length || 0;

      const chamadosComErro = allLogs?.filter(l => 
        l.entity_type === 'chamado' && 
        l.severity === 'error'
      ).length || 0;

      setMetrics({
        totalChamados,
        chamadosAbertos,
        chamadosEmAndamento,
        chamadosResolvidos,
        chamadosComErro,
        totalScripts,
        scriptsExecutados24h,
        scriptsExecutadosSemana,
        scriptsFalha,
        scriptsSuccesso,
        totalLogs: totalLogs || 0,
        logsUltimas24h,
        errosUltimas24h,
        errosCriticos,
        alertasAtivos,
        alertasDisparados,
        timelineData,
        severityDistribution,
        eventTypeDistribution,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    refreshMetrics: fetchMetrics,
  };
}

function formatEventType(eventType: string): string {
  const mappings: Record<string, string> = {
    'chamado_created': 'Chamado Criado',
    'chamado_updated': 'Chamado Atualizado',
    'chamado_deleted': 'Chamado Excluído',
    'chamado_status_changed': 'Status Chamado',
    'script_created': 'Script Criado',
    'script_updated': 'Script Atualizado',
    'script_deleted': 'Script Excluído',
    'script_executed': 'Script Executado',
    'user_login': 'Login',
    'user_logout': 'Logout',
    'user_signup': 'Cadastro',
    'error': 'Erro',
    'system': 'Sistema',
    'custom': 'Personalizado',
  };
  return mappings[eventType] || eventType;
}
