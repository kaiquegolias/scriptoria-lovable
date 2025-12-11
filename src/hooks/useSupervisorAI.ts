import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SupervisorMetrics } from './useSupervisorMetrics';

export interface DashboardAnalysis {
  resumoExecutivo: string;
  pontosAtencao: Array<{
    titulo: string;
    descricao: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
  tendencias: Array<{
    titulo: string;
    descricao: string;
  }>;
  recomendacoes: Array<{
    acao: string;
    impacto: string;
    esforco: 'baixo' | 'medio' | 'alto';
  }>;
  scoresSaude: {
    geral: number;
    chamados: number;
    scripts: number;
    erros: number;
  };
}

export interface LogsAnalysis {
  padroesErro: Array<{
    tipo: string;
    frequencia: string;
    descricao: string;
  }>;
  eventosCriticos: Array<{
    evento: string;
    impacto: string;
    acao: string;
  }>;
  correlacoes: Array<{
    eventos: string[];
    analise: string;
  }>;
  sugestoesInvestigacao: Array<{
    area: string;
    motivo: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
}

export interface AlertsAnalysis {
  statusGeral: string;
  alertasCriticos: Array<{
    nome: string;
    urgencia: string;
    acaoRecomendada: string;
  }>;
  sugestoesConfiguracao: Array<{
    alerta: string;
    sugestao: string;
  }>;
  prevencao: Array<{
    cenario: string;
    acao: string;
  }>;
}

export type AnalysisType = 'dashboard' | 'logs' | 'alerts';
export type AnalysisResult = DashboardAnalysis | LogsAnalysis | AlertsAnalysis;

export function useSupervisorAI() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const getAnalysis = useCallback(async (
    analysisType: AnalysisType,
    metrics: SupervisorMetrics | null
  ) => {
    if (!metrics) {
      toast.error('Métricas não disponíveis para análise');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('supervisor-ai-analysis', {
        body: { analysisType, metrics }
      });

      if (fnError) throw fnError;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (data.error.includes('Payment')) {
          toast.error('Créditos insuficientes. Adicione créditos ao seu workspace.');
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      setAnalysis(data.analysis);
      setIsCached(data.cached || false);
      
      if (data.cached) {
        toast.info('Análise recuperada do cache (válida por 1 hora)');
      }
      
      return data.analysis;
    } catch (err) {
      console.error('Error getting AI analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter análise da IA';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setIsCached(false);
  }, []);

  return {
    analysis,
    loading,
    error,
    isCached,
    getAnalysis,
    clearAnalysis,
  };
}
