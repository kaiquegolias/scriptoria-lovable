import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Suggestion {
  id: string;
  scriptId: string | null;
  suggestedTicketId: string | null;
  score: number;
  title: string;
  snippet: string;
  reason: string;
  type: 'script' | 'ticket';
}

export function useTicketSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const getSuggestionsForTicket = useCallback(async (ticketId: string) => {
    if (!user) return [];

    try {
      setLoading(true);

      // Get the ticket content
      const { data: ticket, error: ticketError } = await supabase
        .from('chamados')
        .select('titulo, acompanhamento, estruturante, nivel')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      // Generate tokens for the ticket
      const ticketText = `${ticket.titulo} ${ticket.acompanhamento}`;
      const ticketTokens = generateTokens(ticketText);

      // Get all vectors from kb_vectors
      const { data: vectors, error: vectorsError } = await supabase
        .from('kb_vectors')
        .select('*');

      if (vectorsError) throw vectorsError;

      // Also get scripts directly from scripts table for more complete suggestions
      const { data: scripts, error: scriptsError } = await supabase
        .from('scripts')
        .select('id, nome, situacao, modelo, estruturante, nivel')
        .eq('user_id', user.id);

      if (scriptsError) throw scriptsError;

      // Calculate similarity scores from vectors
      const scoredItems: Array<{
        sourceType: string;
        sourceId: string;
        title: string;
        contentPreview: string;
        score: number;
      }> = [];

      for (const vector of vectors || []) {
        const vectorTokens = (vector.tokens as Record<string, number>) || {};
        const score = cosineSimilarity(ticketTokens, vectorTokens);

        if (score > 0.1) {
          scoredItems.push({
            sourceType: vector.source_type,
            sourceId: vector.source_id,
            title: vector.title || 'Sem título',
            contentPreview: vector.content_preview || '',
            score,
          });
        }
      }

      // Also calculate similarity from scripts directly
      for (const script of scripts || []) {
        const scriptText = `${script.nome} ${script.situacao} ${script.modelo} ${script.estruturante}`;
        const scriptTokens = generateTokens(scriptText);
        const score = cosineSimilarity(ticketTokens, scriptTokens);

        // Boost score if estruturante/nivel match
        let boostedScore = score;
        if (script.estruturante === ticket.estruturante) boostedScore += 0.15;
        if (script.nivel === ticket.nivel) boostedScore += 0.1;

        if (boostedScore > 0.1) {
          // Check if script is not already in scored items
          const existingIndex = scoredItems.findIndex(
            item => item.sourceType === 'script' && item.sourceId === script.id
          );
          
          if (existingIndex === -1) {
            scoredItems.push({
              sourceType: 'script',
              sourceId: script.id,
              title: script.nome,
              contentPreview: `${script.situacao}\n\nModelo: ${script.modelo}`,
              score: Math.min(boostedScore, 1),
            });
          } else if (boostedScore > scoredItems[existingIndex].score) {
            scoredItems[existingIndex].score = Math.min(boostedScore, 1);
          }
        }
      }

      // Sort by score and take top 5
      scoredItems.sort((a, b) => b.score - a.score);
      const topItems = scoredItems.slice(0, 5);

      // Convert to suggestions format
      const suggestionsList: Suggestion[] = topItems.map((item, index) => ({
        id: `suggestion-${index}`,
        scriptId: item.sourceType === 'script' ? item.sourceId : null,
        suggestedTicketId: item.sourceType === 'ticket' ? item.sourceId : null,
        score: item.score,
        title: item.title,
        snippet: item.contentPreview,
        reason: item.score > 0.7 ? 'Alta similaridade no conteúdo' 
              : item.score > 0.4 ? 'Correspondência moderada'
              : 'Possível relação',
        type: item.sourceType as 'script' | 'ticket',
      }));

      setSuggestions(suggestionsList);

      // Save suggestions to database for tracking
      for (const suggestion of suggestionsList) {
        await supabase.from('ticket_suggestions').insert({
          ticket_id: ticketId,
          script_id: suggestion.scriptId,
          suggested_ticket_id: suggestion.suggestedTicketId,
          score: suggestion.score,
        });
      }

      return suggestionsList;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const provideFeedback = useCallback(async (
    ticketId: string,
    scriptId: string | null,
    suggestedTicketId: string | null,
    feedback: 'accepted' | 'rejected'
  ) => {
    if (!user) return;

    try {
      // Find the suggestion record
      let query = supabase
        .from('ticket_suggestions')
        .update({
          feedback,
          feedback_at: new Date().toISOString(),
          applied: feedback === 'accepted',
        })
        .eq('ticket_id', ticketId);

      if (scriptId) {
        query = query.eq('script_id', scriptId);
      } else if (suggestedTicketId) {
        query = query.eq('suggested_ticket_id', suggestedTicketId);
      }

      await query;

      // Update UI
      setSuggestions(prev => prev.filter(s => 
        s.scriptId !== scriptId && s.suggestedTicketId !== suggestedTicketId
      ));

      if (feedback === 'accepted') {
        toast.success('Sugestão marcada como útil!');
        
        // Increment script usage if applicable
        if (scriptId) {
          await supabase
            .from('scripts_library')
            .update({ usage_count: supabase.rpc('increment_usage', { script_id: scriptId }) })
            .eq('id', scriptId);
        }
      } else {
        toast.info('Sugestão marcada como não relevante.');
      }
    } catch (error) {
      console.error('Error providing feedback:', error);
      toast.error('Erro ao salvar feedback.');
    }
  }, [user]);

  return {
    suggestions,
    loading,
    getSuggestionsForTicket,
    provideFeedback,
  };
}

// Helper functions for TF-IDF similarity
function generateTokens(text: string): Record<string, number> {
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúàèìòùãõâêîôûç]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  const total = words.length;
  const tokens: Record<string, number> = {};
  Object.entries(frequency).forEach(([word, count]) => {
    tokens[word] = count / total;
  });

  return tokens;
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const key of allKeys) {
    const valueA = a[key] || 0;
    const valueB = b[key] || 0;
    
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}
