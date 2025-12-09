import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  RefreshCw,
  Bell,
  Clock
} from 'lucide-react';
import { useSystemAlerts, SystemAlert } from '@/hooks/useSystemAlerts';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const SystemAlertsPanel: React.FC = () => {
  const { alerts, loading, refreshAlerts } = useSystemAlerts();

  const getAlertIcon = (alert: SystemAlert) => {
    switch (alert.type) {
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const deletedCount = alerts.filter(a => a.type === 'deleted').length;
  const closedCount = alerts.filter(a => a.type === 'closed').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas do Sistema
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={refreshAlerts}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex gap-2 mb-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-destructive" />
            {deletedCount} excluído{deletedCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {closedCount} finalizado{closedCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum alerta recente.</p>
            <p className="text-sm">Alertas de exclusão e finalização de chamados aparecerão aqui.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getAlertIcon(alert)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{alert.title}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getSeverityColor(alert.severity)}`}
                        >
                          {alert.severity === 'warning' ? 'Alerta' : 
                           alert.severity === 'info' ? 'Info' : 
                           alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.timestamp), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                        {alert.userEmail && (
                          <span className="truncate">por {alert.userEmail}</span>
                        )}
                      </div>
                      {alert.payload?.justification && (
                        <div className="mt-2 p-2 bg-secondary/50 rounded text-xs">
                          <span className="font-medium">Justificativa:</span> {alert.payload.justification}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemAlertsPanel;
