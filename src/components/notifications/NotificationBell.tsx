import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertTriangle, ExternalLink, Trash2, CheckCircle, CheckCheck, Calendar, Clock } from 'lucide-react';
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
    overdueDiaryEntries,
    systemAlerts,
    displayCount,
    totalCount,
    overdueCount,
    diaryCount,
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
    if (!isOpen) await logBellClick();
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
      case 'N3': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'N2': return 'bg-warning/10 text-warning border-warning/20';
      case 'N1': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'deleted': return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'closed': return <CheckCircle className="h-4 w-4 text-success" />;
      default: return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
  };

  const renderDiaryEntries = () => (
    overdueDiaryEntries.map(entry => (
      <div
        key={entry.id}
        className="p-3.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/30 last:border-0"
        onClick={() => { setIsOpen(false); navigate('/diario'); }}
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg ${entry.isDueToday ? 'bg-warning/10' : 'bg-destructive/10'}`}>
            <Clock className={`h-4 w-4 ${entry.isDueToday ? 'text-warning' : 'text-destructive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{entry.title}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className={`text-[10px] ${entry.isDueToday ? 'border-warning/30 text-warning' : 'border-destructive/30 text-destructive'}`}>
                {entry.isDueToday ? 'Vence hoje' : `Vencido há ${entry.diasAtraso} dia${entry.diasAtraso !== 1 ? 's' : ''}`}
              </Badge>
              {entry.dueTime && (
                <span className="text-xs text-muted-foreground">às {entry.dueTime}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    ))
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2.5 rounded-xl hover:bg-accent transition-all duration-200"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1 shadow-sm"
          >
            {displayCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[440px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 bg-accent/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Notificações</h3>
                <Badge variant="outline" className="ml-auto text-xs">
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
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 p-1 mx-3 mt-2 h-auto" style={{ width: 'calc(100% - 24px)' }}>
                <TabsTrigger value="all" className="text-xs py-1.5">
                  Todos ({totalCount})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs py-1.5">
                  Vencidos ({overdueCount})
                </TabsTrigger>
                <TabsTrigger value="diary" className="text-xs py-1.5">
                  Diário ({diaryCount})
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs py-1.5">
                  Alertas ({alertsCount})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[380px] overflow-y-auto">
                <TabsContent value="all" className="m-0">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary mx-auto mb-2" />
                      <p className="text-sm">Carregando...</p>
                    </div>
                  ) : totalCount === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                      <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Tudo em dia!</p>
                      <p className="text-xs mt-1 text-muted-foreground/70">Nenhuma notificação pendente</p>
                    </div>
                  ) : (
                    <div>
                      {renderDiaryEntries()}
                      {systemAlerts.map((alert) => (
                        <div key={alert.id} className="p-3.5 hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0">
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-[10px] mb-1">
                                {alert.type === 'deleted' ? 'Excluído' : 'Finalizado'}
                              </Badge>
                              <p className="text-sm line-clamp-2">{alert.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(alert.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {activeOverdueTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/30 last:border-0"
                          onClick={() => handleGoToTicket(ticket.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-1.5 rounded-lg bg-destructive/10">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{ticket.titulo}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className={`text-[10px] ${getNivelColor(ticket.nivel)}`}>
                                    {ticket.nivel}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{ticket.estruturante}</span>
                                </div>
                                <p className="text-xs text-destructive mt-1">
                                  Vencido há {ticket.diasAtraso} dia{ticket.diasAtraso !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs shrink-0"
                              onClick={(e) => handleDismiss(e, ticket.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="overdue" className="m-0">
                  {activeOverdueTickets.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Nenhum chamado vencido</p>
                    </div>
                  ) : (
                    <div>
                      {activeOverdueTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/30 last:border-0"
                          onClick={() => handleGoToTicket(ticket.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{ticket.titulo}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className={`text-[10px] ${getNivelColor(ticket.nivel)}`}>
                                  {ticket.nivel}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{ticket.estruturante}</span>
                              </div>
                              <p className="text-xs text-destructive mt-1">
                                Vencido há {ticket.diasAtraso} dia{ticket.diasAtraso !== 1 ? 's' : ''}
                                {' '}• {format(new Date(ticket.dataLimite), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => handleDismiss(e, ticket.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="diary" className="m-0">
                  {overdueDiaryEntries.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Nenhum lembrete vencido</p>
                    </div>
                  ) : (
                    <div>{renderDiaryEntries()}</div>
                  )}
                </TabsContent>

                <TabsContent value="alerts" className="m-0">
                  {systemAlerts.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                      <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Nenhum alerta</p>
                    </div>
                  ) : (
                    <div>
                      {systemAlerts.map((alert) => (
                        <div key={alert.id} className="p-3.5 hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0">
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-[10px] mb-1">
                                {alert.type === 'deleted' ? 'Excluído' : 'Finalizado'}
                              </Badge>
                              <p className="text-sm line-clamp-2">{alert.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(alert.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
