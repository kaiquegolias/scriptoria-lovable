import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertTriangle, ExternalLink, Trash2, CheckCircle, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const {
    activeOverdueTickets,
    systemAlerts,
    displayCount,
    totalCount,
    overdueCount,
    alertsCount,
    loading,
    dismissNotification,
    dismissAllNotifications,
    logNotificationClick,
    logBellClick,
  } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      await logBellClick();
    }
  };

  const handleGoToTicket = async (ticketId: string) => {
    await logNotificationClick(ticketId);
    setIsOpen(false);
    navigate(`/chamados?highlight=${ticketId}`);
  };

  const handleDismiss = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    await dismissNotification(ticketId);
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'N3': return 'bg-destructive text-destructive-foreground';
      case 'N2': return 'bg-yellow-500 text-white';
      case 'N1': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'deleted': return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'closed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case 'deleted': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'closed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1"
          >
            {displayCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[420px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-50"
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Notificações</h3>
                <Badge variant="outline" className="ml-auto">
                  {totalCount}
                </Badge>
                {totalCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      await dismissAllNotifications();
                      toast.success('Todas as notificações foram limpas!');
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Limpar tudo
                  </Button>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 m-2 h-auto">
                <TabsTrigger value="all" className="text-xs py-1.5">
                  Todos ({totalCount})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs py-1.5">
                  Vencidos ({overdueCount})
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs py-1.5">
                  Alertas ({alertsCount})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] overflow-y-auto">
                <TabsContent value="all" className="m-0">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Carregando...
                    </div>
                  ) : totalCount === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* System Alerts */}
                      {systemAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${getAlertBadgeColor(alert.type)}`}>
                                  {alert.type === 'deleted' ? 'Excluído' : 'Finalizado'}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1 line-clamp-2">{alert.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(alert.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                {alert.userEmail && ` • ${alert.userEmail}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Overdue Tickets */}
                      {activeOverdueTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleGoToTicket(ticket.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{ticket.titulo}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={getNivelColor(ticket.nivel)}>
                                    {ticket.nivel}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {ticket.estruturante}
                                  </span>
                                </div>
                                <p className="text-xs text-destructive mt-1">
                                  Vencido há {ticket.diasAtraso} dia{ticket.diasAtraso !== 1 ? 's' : ''} 
                                  {' '}• {format(new Date(ticket.dataLimite), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGoToTicket(ticket.id);
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={(e) => handleDismiss(e, ticket.id)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Ocultar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="overdue" className="m-0">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Carregando...
                    </div>
                  ) : activeOverdueTickets.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum chamado vencido</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activeOverdueTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleGoToTicket(ticket.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{ticket.titulo}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getNivelColor(ticket.nivel)}>
                                  {ticket.nivel}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {ticket.estruturante}
                                </span>
                              </div>
                              <p className="text-xs text-destructive mt-1">
                                Vencido há {ticket.diasAtraso} dia{ticket.diasAtraso !== 1 ? 's' : ''} 
                                {' '}• {format(new Date(ticket.dataLimite), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGoToTicket(ticket.id);
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={(e) => handleDismiss(e, ticket.id)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Ocultar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="alerts" className="m-0">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Carregando...
                    </div>
                  ) : systemAlerts.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum alerta do sistema</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {systemAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${getAlertBadgeColor(alert.type)}`}>
                                  {alert.type === 'deleted' ? 'Excluído' : 'Finalizado'}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1 line-clamp-2">{alert.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(alert.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                {alert.userEmail && ` • ${alert.userEmail}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {activeOverdueTickets.length > 0 && (
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/chamados?filter=overdue');
                  }}
                >
                  Ver todos os chamados vencidos
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
