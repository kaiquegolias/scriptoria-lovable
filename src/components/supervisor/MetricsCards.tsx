import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingUp,
  XCircle,
  Bell,
  Zap
} from 'lucide-react';
import { SupervisorMetrics } from '@/hooks/useSupervisorMetrics';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsCardsProps {
  metrics: SupervisorMetrics | null;
  loading: boolean;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'border-border',
    success: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
    error: 'border-l-4 border-l-red-500',
    info: 'border-l-4 border-l-blue-500',
  };

  return (
    <Card className={`${variantStyles[variant]} hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-muted">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className={`flex items-center mt-2 text-xs ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} />
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Não foi possível carregar as métricas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chamados Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Chamados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Chamados Abertos"
            value={metrics.chamadosAbertos}
            subtitle="Aguardando atendimento"
            icon={<Clock className="h-4 w-4 text-yellow-500" />}
            variant="warning"
          />
          <MetricCard
            title="Em Andamento"
            value={metrics.chamadosEmAndamento}
            subtitle="Sendo processados"
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            variant="info"
          />
          <MetricCard
            title="Resolvidos"
            value={metrics.chamadosResolvidos}
            subtitle="Finalizados com sucesso"
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            variant="success"
          />
          <MetricCard
            title="Total"
            value={metrics.totalChamados}
            subtitle="Todos os chamados"
            icon={<FileText className="h-4 w-4 text-primary" />}
          />
        </div>
      </div>

      {/* Scripts Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Scripts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Execuções (24h)"
            value={metrics.scriptsExecutados24h}
            subtitle="Últimas 24 horas"
            icon={<Activity className="h-4 w-4 text-primary" />}
          />
          <MetricCard
            title="Execuções (Semana)"
            value={metrics.scriptsExecutadosSemana}
            subtitle="Últimos 7 dias"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
          />
          <MetricCard
            title="Sucessos"
            value={metrics.scriptsSuccesso}
            subtitle="Execuções bem-sucedidas"
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            variant="success"
          />
          <MetricCard
            title="Total de Scripts"
            value={metrics.totalScripts}
            subtitle="Cadastrados no sistema"
            icon={<FileText className="h-4 w-4 text-primary" />}
          />
        </div>
      </div>

      {/* Logs & Errors Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Logs & Erros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Logs (24h)"
            value={metrics.logsUltimas24h}
            subtitle="Eventos registrados"
            icon={<Activity className="h-4 w-4 text-primary" />}
          />
          <MetricCard
            title="Erros (24h)"
            value={metrics.errosUltimas24h}
            subtitle="Erros detectados"
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            variant="error"
          />
          <MetricCard
            title="Críticos"
            value={metrics.errosCriticos}
            subtitle="Erros críticos"
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            variant="error"
          />
          <MetricCard
            title="Total de Logs"
            value={metrics.totalLogs}
            subtitle="Todos os registros"
            icon={<FileText className="h-4 w-4 text-primary" />}
          />
        </div>
      </div>

      {/* Alerts Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alertas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Alertas Ativos"
            value={metrics.alertasAtivos}
            subtitle="Monitorando eventos"
            icon={<Bell className="h-4 w-4 text-primary" />}
            variant="info"
          />
          <MetricCard
            title="Disparados"
            value={metrics.alertasDisparados}
            subtitle="Total de notificações enviadas"
            icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
            variant="warning"
          />
        </div>
      </div>
    </div>
  );
};

export default MetricsCards;
