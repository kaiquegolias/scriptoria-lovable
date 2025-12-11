import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTicketObservations } from '@/hooks/useTicketObservations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketObservationsProps {
  ticketId: string;
}

const TicketObservations: React.FC<TicketObservationsProps> = ({ ticketId }) => {
  const [newObservation, setNewObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { observations, loading, fetchObservations, addObservation } = useTicketObservations(ticketId);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  const handleSubmit = async () => {
    if (!newObservation.trim() || submitting) return;

    setSubmitting(true);
    const success = await addObservation(newObservation);
    if (success) {
      setNewObservation('');
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Observações do Chamado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input for new observation */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Adicione uma observação..."
            value={newObservation}
            onChange={(e) => setNewObservation(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
            disabled={submitting}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newObservation.trim() || submitting}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Observations history */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Carregando observações...
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhuma observação registrada.
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3 pr-4">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1"
                >
                  <p className="text-sm whitespace-pre-wrap">{obs.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {obs.userEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(obs.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
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

export default TicketObservations;
