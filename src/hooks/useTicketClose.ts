import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Classifications that don't require ultimo_acompanhamento
const EXCEPTION_CLASSIFICATIONS = [
  'Falta de comunicação',
  'Não pertinentes ao PEN/PNCP'
];

export interface CloseTicketInput {
  ticketId: string;
  ultimoAcompanhamento?: string;
  classificacao: string;
}

export function useTicketClose() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const validateClose = useCallback((input: CloseTicketInput): { valid: boolean; error?: string } => {
    const isException = EXCEPTION_CLASSIFICATIONS.includes(input.classificacao);

    if (!isException && (!input.ultimoAcompanhamento || input.ultimoAcompanhamento.trim() === '')) {
      return {
        valid: false,
        error: 'O campo "Último acompanhamento" é obrigatório para encerrar este chamado.',
      };
    }

    return { valid: true };
  }, []);

  const closeTicket = useCallback(async (input: CloseTicketInput): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return false;
    }

    // Validate
    const validation = validateClose(input);
    if (!validation.valid) {
      toast.error(validation.error);
      return false;
    }

    try {
      setLoading(true);

      // Check if ticket exists and belongs to user
      const { data: ticket, error: ticketError } = await supabase
        .from('chamados')
        .select('id, user_id, titulo, acompanhamento')
        .eq('id', input.ticketId)
        .single();

      if (ticketError || !ticket) {
        toast.error('Chamado não encontrado.');
        return false;
      }

      if (ticket.user_id !== user.id) {
        toast.error('Você não tem permissão para encerrar este chamado.');
        return false;
      }

      // Save ultimo_acompanhamento to ticket_followups if provided
      if (input.ultimoAcompanhamento && input.ultimoAcompanhamento.trim()) {
        const { error: followupError } = await supabase
          .from('ticket_followups')
          .insert({
            ticket_id: input.ticketId,
            type: 'ultimo_acompanhamento',
            content: input.ultimoAcompanhamento,
            created_by: user.id,
          });

        if (followupError) {
          console.error('Error saving followup:', followupError);
          throw followupError;
        }
      }

      // Update chamado status and classificacao
      const { error: updateError } = await supabase
        .from('chamados')
        .update({
          status: 'resolvido',
          classificacao: input.classificacao,
          data_atualizacao: new Date().toISOString(),
          data_limite: null,
        })
        .eq('id', input.ticketId);

      if (updateError) throw updateError;

      // Log to audit_log
      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'ticket_closed',
        entity_type: 'chamado',
        entity_id: input.ticketId,
        new_data: {
          classificacao: input.classificacao,
          ultimo_acompanhamento: input.ultimoAcompanhamento,
        },
        metadata: {
          is_exception: EXCEPTION_CLASSIFICATIONS.includes(input.classificacao),
        },
      });

      // Log to system_logs
      await supabase.from('system_logs').insert({
        user_id: user.id,
        user_email: user.email,
        event_type: 'chamado_status_changed',
        severity: 'info',
        message: `Chamado "${ticket.titulo}" encerrado com classificação "${input.classificacao}"`,
        origin: 'ticket_close',
        entity_type: 'chamado',
        entity_id: input.ticketId,
        payload: {
          classificacao: input.classificacao,
          has_ultimo_acompanhamento: !!input.ultimoAcompanhamento,
        },
      });

      // Index the closed ticket for future suggestions
      if (input.ultimoAcompanhamento) {
        await indexClosedTicket(input.ticketId, ticket.titulo, input.ultimoAcompanhamento);
      }

      toast.success('Chamado encerrado com sucesso!');
      return true;
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Erro ao encerrar chamado.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, validateClose]);

  return {
    closeTicket,
    validateClose,
    loading,
    exceptionClassifications: EXCEPTION_CLASSIFICATIONS,
  };
}

// Helper function to index closed ticket for KB
async function indexClosedTicket(ticketId: string, titulo: string, ultimoAcompanhamento: string) {
  try {
    const text = `${titulo} ${ultimoAcompanhamento}`;
    const tokens = generateTokens(text);

    await supabase
      .from('kb_vectors')
      .upsert({
        source_type: 'ticket',
        source_id: ticketId,
        title: titulo,
        content_preview: ultimoAcompanhamento.substring(0, 200),
        tokens,
        keywords: [],
      }, { onConflict: 'source_id' });
  } catch (error) {
    console.error('Error indexing closed ticket:', error);
  }
}

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
