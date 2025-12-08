import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SystemLog, LogSeverity } from '@/hooks/useSystemLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const RealtimeIndicator: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastEvent, setLastEvent] = useState<SystemLog | null>(null);
  const [recentCritical, setRecentCritical] = useState<SystemLog | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-indicator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs'
        },
        (payload) => {
          const newLog = payload.new as SystemLog;
          setLastEvent(newLog);
          
          if (newLog.severity === 'critical' || newLog.severity === 'error') {
            setRecentCritical(newLog);
            // Clear critical alert after 10 seconds
            setTimeout(() => setRecentCritical(null), 10000);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const severityColors: Record<LogSeverity, string> = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    critical: 'bg-red-700',
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Connection Status */}
      <Card className="flex-1">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isConnected ? 'Monitoramento em Tempo Real' : 'Desconectado'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Recebendo eventos automaticamente' : 'Tentando reconectar...'}
            </p>
          </div>
          <div className="ml-auto">
            <motion.div
              animate={{ opacity: isConnected ? [1, 0.5, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Last Event */}
      <Card className="flex-1">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 rounded-full bg-muted">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Último Evento</p>
            {lastEvent ? (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${severityColors[lastEvent.severity]}`} />
                <p className="text-xs text-muted-foreground truncate">
                  {lastEvent.message}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aguardando eventos...</p>
            )}
          </div>
          {lastEvent && (
            <Badge variant="outline" className="shrink-0">
              {format(new Date(lastEvent.timestamp), 'HH:mm:ss', { locale: ptBR })}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Critical Alert */}
      <AnimatePresence>
        {recentCritical && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card className="border-red-500 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Evento Crítico Detectado!
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 truncate">
                    {recentCritical.message}
                  </p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-red-500"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealtimeIndicator;
