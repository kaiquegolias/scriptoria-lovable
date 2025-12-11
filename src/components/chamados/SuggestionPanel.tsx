import React, { useEffect, useState } from 'react';
import { Lightbulb, FileCode, Ticket, ThumbsUp, ThumbsDown, ExternalLink, RefreshCw, Sparkles, Copy, Check, ChevronDown, ChevronUp, FileText, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTicketSuggestions, Suggestion } from '@/hooks/useTicketSuggestions';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SuggestionPanelProps {
  ticketId: string;
  onApplyScript?: (scriptId: string) => void;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ ticketId, onApplyScript }) => {
  const { suggestions, loading, getSuggestionsForTicket, provideFeedback } = useTicketSuggestions();
  const { suggestion: aiSuggestion, loading: aiLoading, getAISuggestions } = useAISuggestions();
  const navigate = useNavigate();
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedAI, setExpandedAI] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

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

  const handleCopyResponse = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Resposta copiada!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
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

  const getRelevanciaColor = (relevancia: string) => {
    switch (relevancia?.toLowerCase()) {
      case 'alta': return 'bg-green-500 text-white';
      case 'média': return 'bg-yellow-500 text-white';
      default: return 'bg-orange-500 text-white';
    }
  };

  const getConfidenceColor = (value: number) => {
    if (value >= 70) return 'bg-green-500/20 text-green-700 border-green-500/30';
    if (value >= 40) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    return 'bg-red-500/20 text-red-700 border-red-500/30';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Soluções Sugeridas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="similarity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="similarity" className="text-xs">
              <FileCode className="h-3 w-3 mr-1" />
              Por Similaridade
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              IA (Gemini)
            </TabsTrigger>
          </TabsList>

          {/* Similarity Tab */}
          <TabsContent value="similarity" className="mt-3">
            {loading ? (
              <div className="py-6 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span className="text-muted-foreground">Buscando sugestões...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center">
                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma sugestão encontrada.
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
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="secondary" className="mb-2">
                  {suggestions.length} encontrada{suggestions.length !== 1 ? 's' : ''}
                </Badge>
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
                          onClick={() => navigate(`/chamados-encerrados`)}
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
              </div>
            )}
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-3">
            {!aiSuggestion && !aiLoading && (
              <div className="py-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Use a IA para gerar sugestões inteligentes com base no contexto completo do chamado.
                </p>
                <Button 
                  onClick={() => getAISuggestions(ticketId)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar com IA
                </Button>
              </div>
            )}

            {aiLoading && (
              <div className="py-6 flex flex-col items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
                <span className="text-muted-foreground text-sm">Analisando chamado com Gemini...</span>
                <span className="text-muted-foreground text-xs mt-1">Isso pode levar alguns segundos</span>
              </div>
            )}

            {aiSuggestion && !aiLoading && (
              <div className="space-y-4">
                {/* Confiança Estimada */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resultado da Análise</span>
                  <Badge className={getConfidenceColor(aiSuggestion.confiancaEstimada || 50)}>
                    📊 Confiança: {aiSuggestion.confiancaEstimada || 50}%
                  </Badge>
                </div>

                {/* Análise Interna - Collapsible */}
                {aiSuggestion.analiseInterna && (
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="w-full p-3 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          🔍 Análise Interna
                        </span>
                      </div>
                      {showAnalysis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    
                    {showAnalysis && (
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                        {aiSuggestion.analiseInterna.fontesEncontradas?.length > 0 ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Fontes encontradas:</p>
                            <div className="flex flex-wrap gap-1">
                              {aiSuggestion.analiseInterna.fontesEncontradas.map((fonte, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {fonte}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-xs">
                              Não encontrei conteúdo relevante nas fontes internas.
                            </p>
                          </div>
                        )}

                        {aiSuggestion.analiseInterna.trechosRelevantes?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Trechos relevantes:</p>
                            {aiSuggestion.analiseInterna.trechosRelevantes.map((trecho, i) => (
                              <div key={i} className="text-xs p-2 bg-white dark:bg-background rounded border-l-2 border-blue-500 mb-1 italic">
                                "{trecho}"
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Explicação Técnica */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      🛠️ Explicação Técnica
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setExpandedAI(!expandedAI)}
                    >
                      {expandedAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className={`text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap ${!expandedAI ? 'line-clamp-3' : ''}`}>
                    {aiSuggestion.explicacaoTecnica}
                  </p>
                </div>

                {/* 3 Respostas Formais */}
                {aiSuggestion.respostasFormais?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      📨 3 Respostas Formais Sugeridas
                    </h4>
                    {aiSuggestion.respostasFormais.map((resposta, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-secondary/50 border border-border/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className="mb-2 bg-primary/10">
                            🟦 Modelo {index + 1}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleCopyResponse(resposta, index)}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copiar
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {resposta}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scripts Relacionados */}
                {aiSuggestion.scriptsRelacionados?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Scripts Relacionados
                    </h4>
                    {aiSuggestion.scriptsRelacionados.map((script, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-primary" />
                          <span className="text-sm">{script.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getRelevanciaColor(script.relevancia)}`}>
                            {script.relevancia}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chamados Similares */}
                {aiSuggestion.chamadosSimilares?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Chamados Similares Resolvidos
                    </h4>
                    {aiSuggestion.chamadosSimilares.map((chamado, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-secondary/30 border border-border/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">{chamado.titulo}</span>
                          </div>
                          <Badge className={`text-xs ${getRelevanciaColor(chamado.similaridade)}`}>
                            {chamado.similaridade}
                          </Badge>
                        </div>
                        {chamado.solucaoAplicada && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <strong>Solução:</strong> {chamado.solucaoAplicada}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Refresh button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => getAISuggestions(ticketId)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Gerar novamente
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SuggestionPanel;
