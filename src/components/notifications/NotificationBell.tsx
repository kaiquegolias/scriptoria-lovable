import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOverdueNotifications } from '@/hooks/useOverdueNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const {
    activeOverdueTickets,
    displayCount,
    overdueCount,
    loading,
    dismissNotification,
    logNotificationClick,
    logBellClick,
  } = useOverdueNotifications();

  // Close dropdown when clicking outside
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
        aria-label="Notificações de chamados vencidos"
      >
        <Bell className="h-5 w-5" />
        {overdueCount > 0 && (
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
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-50"
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-sm">Chamados Vencidos</h3>
                <Badge variant="destructive" className="ml-auto">
                  {overdueCount}
                </Badge>
              </div>
            </div>

            <ScrollArea className="max-h-[400px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : activeOverdueTickets.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
            </ScrollArea>

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
