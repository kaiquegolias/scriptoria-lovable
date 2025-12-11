import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useSupervisorAI, DashboardAnalysis, AnalysisType } from '@/hooks/useSupervisorAI';
import { SupervisorMetrics } from '@/hooks/useSupervisorMetrics';

interface AIInsightsPanelProps {
  metrics: SupervisorMetrics | null;
  analysisType?: AnalysisType;
}

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
    alta: 'destructive',
    media: 'default',
    baixa: 'secondary'
  };
  
  return (
    <Badge variant={variants[priority] || 'secondary'} className="text-xs">
      {priority}
    </Badge>
  );
};

const HealthScoreGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`text-2xl font-bold ${getColor(score)}`}>{score}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
};

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ metrics, analysisType = 'dashboard' }) => {
  const { analysis, loading, error, isCached, getAnalysis } = useSupervisorAI();

  const handleAnalyze = () => {
    getAnalysis(analysisType, metrics);
  };

  const dashboardAnalysis = analysis as DashboardAnalysis | null;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise com IA (Gemini)
            {isCached && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Cache
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={loading || !metrics}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {loading ? 'Analisando...' : 'Analisar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : !dashboardAnalysis ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Clique em "Analisar" para obter insights da IA</p>
            <p className="text-xs mt-1">A análise considera métricas, logs e documentação WikiPEN</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Health Scores */}
              {dashboardAnalysis.scoresSaude && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Score de Saúde do Sistema
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <HealthScoreGauge score={dashboardAnalysis.scoresSaude.geral} label="Geral" />
                    <HealthScoreGauge score={dashboardAnalysis.scoresSaude.chamados} label="Chamados" />
                    <HealthScoreGauge score={dashboardAnalysis.scoresSaude.scripts} label="Scripts" />
                    <HealthScoreGauge score={dashboardAnalysis.scoresSaude.erros} label="Erros" />
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              {dashboardAnalysis.resumoExecutivo && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Resumo Executivo
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    {dashboardAnalysis.resumoExecutivo}
                  </p>
                </div>
              )}

              {/* Attention Points */}
              {dashboardAnalysis.pontosAtencao && dashboardAnalysis.pontosAtencao.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Pontos de Atenção
                  </h4>
                  <div className="space-y-2">
                    {dashboardAnalysis.pontosAtencao.map((ponto, index) => (
                      <div key={index} className="bg-muted/30 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{ponto.titulo}</span>
                          <PriorityBadge priority={ponto.prioridade} />
                        </div>
                        <p className="text-xs text-muted-foreground">{ponto.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends */}
              {dashboardAnalysis.tendencias && dashboardAnalysis.tendencias.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Tendências Identificadas
                  </h4>
                  <div className="space-y-2">
                    {dashboardAnalysis.tendencias.map((tendencia, index) => (
                      <div key={index} className="bg-muted/30 p-3 rounded-lg">
                        <span className="font-medium text-sm">{tendencia.titulo}</span>
                        <p className="text-xs text-muted-foreground mt-1">{tendencia.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {dashboardAnalysis.recomendacoes && dashboardAnalysis.recomendacoes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Recomendações
                  </h4>
                  <div className="space-y-2">
                    {dashboardAnalysis.recomendacoes.map((rec, index) => (
                      <div key={index} className="bg-muted/30 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{rec.acao}</span>
                          <Badge variant="outline" className="text-xs">
                            Esforço: {rec.esforco}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Impacto: {rec.impacto}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsPanel;
