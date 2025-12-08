import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SystemLog, LogSeverity, LogEventType } from '@/hooks/useSystemLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogsTableProps {
  logs: SystemLog[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const severityConfig: Record<LogSeverity, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  info: { 
    label: 'Info', 
    variant: 'secondary',
    icon: <Info className="h-3 w-3" />
  },
  warning: { 
    label: 'Aviso', 
    variant: 'outline',
    icon: <AlertTriangle className="h-3 w-3 text-yellow-500" />
  },
  error: { 
    label: 'Erro', 
    variant: 'destructive',
    icon: <AlertCircle className="h-3 w-3" />
  },
  critical: { 
    label: 'Crítico', 
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />
  },
};

const eventTypeLabels: Record<LogEventType, string> = {
  chamado_created: 'Chamado Criado',
  chamado_updated: 'Chamado Atualizado',
  chamado_deleted: 'Chamado Excluído',
  chamado_status_changed: 'Status Alterado',
  script_created: 'Script Criado',
  script_updated: 'Script Atualizado',
  script_deleted: 'Script Excluído',
  script_executed: 'Script Executado',
  user_login: 'Login',
  user_logout: 'Logout',
  user_signup: 'Cadastro',
  error: 'Erro',
  system: 'Sistema',
  custom: 'Personalizado',
};

const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  loading,
  totalCount,
  page,
  pageSize,
  onPageChange,
}) => {
  const [selectedLog, setSelectedLog] = React.useState<SystemLog | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum log encontrado.</p>
        <p className="text-sm">Os logs aparecerão aqui conforme as ações forem executadas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[100px]">Severidade</TableHead>
              <TableHead className="w-[150px]">Tipo</TableHead>
              <TableHead className="w-[150px]">Usuário</TableHead>
              <TableHead className="w-[100px]">Origem</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const severity = severityConfig[log.severity];
              return (
                <TableRow 
                  key={log.id}
                  className={
                    log.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20' :
                    log.severity === 'error' ? 'bg-red-50/50 dark:bg-red-950/10' :
                    ''
                  }
                >
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={severity.variant} className="flex items-center gap-1 w-fit">
                      {severity.icon}
                      {severity.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {eventTypeLabels[log.event_type] || log.event_type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={log.user_email || '-'}>
                    {log.user_email || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.origin}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate" title={log.message}>
                    {log.message}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount} registros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="font-mono text-sm">
                      {format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Severidade</label>
                    <div className="mt-1">
                      <Badge variant={severityConfig[selectedLog.severity].variant}>
                        {severityConfig[selectedLog.severity].label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Evento</label>
                    <p className="text-sm">{eventTypeLabels[selectedLog.event_type] || selectedLog.event_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Origem</label>
                    <p className="text-sm">{selectedLog.origin}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Usuário</label>
                    <p className="text-sm">{selectedLog.user_email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="font-mono text-xs">{selectedLog.user_id || '-'}</p>
                  </div>
                  {selectedLog.entity_type && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Entidade</label>
                      <p className="text-sm">{selectedLog.entity_type}</p>
                    </div>
                  )}
                  {selectedLog.entity_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID da Entidade</label>
                      <p className="font-mono text-xs">{selectedLog.entity_id}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mensagem</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedLog.message}</p>
                </div>

                {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payload</label>
                    <pre className="text-xs mt-1 p-3 bg-muted rounded-md overflow-auto">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {(selectedLog.ip_address || selectedLog.user_agent) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.ip_address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">IP</label>
                        <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                      </div>
                    )}
                    {selectedLog.user_agent && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                        <p className="text-xs truncate" title={selectedLog.user_agent}>
                          {selectedLog.user_agent}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LogsTable;
