import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupervisorMetrics } from '@/hooks/useSupervisorMetrics';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import MetricsCards from '@/components/supervisor/MetricsCards';
import SupervisorCharts from '@/components/supervisor/SupervisorCharts';
import LogsTable from '@/components/supervisor/LogsTable';
import QueryConsole from '@/components/supervisor/QueryConsole';
import AlertsConfig from '@/components/supervisor/AlertsConfig';
import RealtimeIndicator from '@/components/supervisor/RealtimeIndicator';
import SystemAlertsPanel from '@/components/supervisor/SystemAlertsPanel';
import AIInsightsPanel from '@/components/supervisor/AIInsightsPanel';
import WikiPENImporter from '@/components/supervisor/WikiPENImporter';
import { LayoutDashboard, FileText, Bell, Search, History, RefreshCw, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Supervisor: React.FC = () => {
  const { user } = useAuth();
  const { metrics, loading: metricsLoading, refreshMetrics } = useSupervisorMetrics();
  const { 
    logs, 
    loading: logsLoading, 
    totalCount, 
    page, 
    setPage, 
    pageSize,
    filters,
    setFilters,
    refreshLogs 
  } = useSystemLogs();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSearch = (query: string) => {
    setFilters({ ...filters, searchQuery: query });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supervisor</h1>
          <p className="text-muted-foreground">Monitoramento e observabilidade do sistema</p>
        </div>
        <Button variant="outline" onClick={() => { refreshMetrics(); refreshLogs(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <RealtimeIndicator />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="queries" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Consultas</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Auditoria</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <MetricsCards metrics={metrics} loading={metricsLoading} />
          <SupervisorCharts metrics={metrics} loading={metricsLoading} />
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInsightsPanel metrics={metrics} analysisType="dashboard" />
            <div className="space-y-6">
              <WikiPENImporter />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <QueryConsole onSearch={handleSearch} currentQuery={filters.searchQuery || ''} />
          <LogsTable
            logs={logs}
            loading={logsLoading}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="queries" className="space-y-6">
          <QueryConsole onSearch={handleSearch} currentQuery={filters.searchQuery || ''} />
          <LogsTable
            logs={logs}
            loading={logsLoading}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemAlertsPanel />
            <AlertsConfig />
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <QueryConsole onSearch={handleSearch} currentQuery={filters.searchQuery || ''} />
          <LogsTable
            logs={logs}
            loading={logsLoading}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Supervisor;
