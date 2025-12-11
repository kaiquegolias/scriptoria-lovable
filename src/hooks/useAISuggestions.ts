import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface AnaliseInterna {
  fontesEncontradas: string[];
  trechosRelevantes: string[];
}

export interface AISuggestion {
  analiseInterna?: AnaliseInterna;
  explicacaoTecnica: string;
  respostasFormais: string[];
  confiancaEstimada: number;
  scriptsRelacionados: Array<{
    nome: string;
    relevancia: string;
    motivo: string;
  }>;
  chamadosSimilares: Array<{
    titulo: string;
    similaridade: string;
    solucaoAplicada: string;
  }>;
}

export function useAISuggestions() {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const getAISuggestions = useCallback(async (ticketId: string) => {
    if (!user || !ticketId) return null;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('ai-suggestions', {
        body: { ticketId, userId: user.id }
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

      setSuggestion(data.suggestions);
      return data.suggestions;
    } catch (err) {
      console.error('Error getting AI suggestions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter sugestões da IA';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearSuggestions = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return {
    suggestion,
    loading,
    error,
    getAISuggestions,
    clearSuggestions,
  };
}
