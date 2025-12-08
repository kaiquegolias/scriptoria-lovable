import React, { useEffect, useState } from 'react';
import { Lightbulb, FileCode, Ticket, ThumbsUp, ThumbsDown, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTicketSuggestions, Suggestion } from '@/hooks/useTicketSuggestions';
import { useNavigate } from 'react-router-dom';

interface SuggestionPanelProps {
  ticketId: string;
  onApplyScript?: (scriptId: string) => void;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ ticketId, onApplyScript }) => {
  const { suggestions, loading, getSuggestionsForTicket, provideFeedback } = useTicketSuggestions();
  const navigate = useNavigate();
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ticketId) {
      getSuggestionsForTicket(ticketId);
    }
  }, [ticketId, getSuggestionsForTicket]);

  const handleFeedback = async (suggestion: Suggestion, feedback: 'accepted' | 'rejected') => {
    await provideFeedback(
      ticketId,
      suggestion.scriptId,
      suggestion.suggestedTicketId,
      feedback
    );
    setFeedbackGiven(prev => new Set([...prev, suggestion.id]));
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.7) return 'Alta';
    if (score >= 0.4) return 'Média';
    return 'Baixa';
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin mr-2 text-primary" />
          <span className="text-muted-foreground">Buscando sugestões...</span>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma sugestão encontrada para este chamado.
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2"
            onClick={() => getSuggestionsForTicket(ticketId)}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Soluções Sugeridas
          <Badge variant="secondary" className="ml-auto">
            {suggestions.length} encontrada{suggestions.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {suggestion.type === 'script' ? (
                  <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <Ticket className="h-4 w-4 text-blue-500 flex-shrink-0" />
                )}
                <span className="font-medium text-sm line-clamp-1">
                  {suggestion.title}
                </span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs text-white ${getScoreColor(suggestion.score)}`}
              >
                {getScoreLabel(suggestion.score)} ({Math.round(suggestion.score * 100)}%)
              </Badge>
            </div>

            {suggestion.snippet && (
              <p className="text-xs text-muted-foreground line-clamp-2 bg-background/50 p-2 rounded">
                {suggestion.snippet}
              </p>
            )}

            <p className="text-xs text-muted-foreground italic">
              {suggestion.reason}
            </p>

            <div className="flex items-center gap-2 pt-1">
              {suggestion.type === 'script' && suggestion.scriptId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => navigate('/biblioteca')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver Script
                </Button>
              )}
              
              {suggestion.type === 'ticket' && suggestion.suggestedTicketId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {/* Could navigate to ticket */}}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver Chamado
                </Button>
              )}

              {!feedbackGiven.has(suggestion.id) && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleFeedback(suggestion, 'accepted')}
                  >
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    Útil
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleFeedback(suggestion, 'rejected')}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Não relevante
                  </Button>
                </>
              )}

              {feedbackGiven.has(suggestion.id) && (
                <span className="text-xs text-muted-foreground italic">
                  Feedback registrado
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SuggestionPanel;
