import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// TF-IDF token generation
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

// Extract keywords from text
function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const tokens = generateTokens(text);
  return Object.entries(tokens)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

export function useKBIndexer() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const indexScript = useCallback(async (script: {
    id: string;
    title: string;
    description?: string | null;
    content: string;
    tags?: string[] | null;
  }) => {
    const fullText = `${script.title} ${script.description || ''} ${script.content} ${(script.tags || []).join(' ')}`;
    const tokens = generateTokens(fullText);
    const keywords = extractKeywords(fullText);
    const contentPreview = script.content.substring(0, 200);

    // Delete existing entry first to avoid conflicts
    await supabase
      .from('kb_vectors')
      .delete()
      .eq('source_id', script.id)
      .eq('source_type', 'script');

    // Insert new entry
    const { error } = await supabase
      .from('kb_vectors')
      .insert({
        source_id: script.id,
        source_type: 'script',
        title: script.title,
        content_preview: contentPreview,
        tokens,
        keywords,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error indexing script:', error);
      throw error;
    }
  }, []);

  const indexTicket = useCallback(async (ticket: {
    id: string;
    titulo: string;
    acompanhamento: string;
  }) => {
    const fullText = `${ticket.titulo} ${ticket.acompanhamento}`;
    const tokens = generateTokens(fullText);
    const keywords = extractKeywords(fullText);
    const contentPreview = ticket.acompanhamento.substring(0, 200);

    // Delete existing and insert new
    await supabase
      .from('kb_vectors')
      .delete()
      .eq('source_id', ticket.id)
      .eq('source_type', 'ticket');

    await supabase
      .from('kb_vectors')
      .insert({
        source_id: ticket.id,
        source_type: 'ticket',
        title: ticket.titulo,
        content_preview: contentPreview,
        tokens,
        keywords,
      });
  }, []);

  const indexAllScripts = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: scripts, error } = await supabase
        .from('scripts_library')
        .select('id, title, description, content, tags');

      if (error) throw error;

      const total = scripts?.length || 0;
      setProgress({ current: 0, total });

      for (let i = 0; i < (scripts?.length || 0); i++) {
        const script = scripts![i];
        await indexScript(script);
        setProgress({ current: i + 1, total });
      }

      toast.success(`${total} scripts indexados com sucesso!`);
    } catch (error) {
      console.error('Error indexing scripts:', error);
      toast.error('Erro ao indexar scripts.');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [indexScript]);

  const indexAllTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      // Only index resolved tickets with content
      const { data: tickets, error } = await supabase
        .from('chamados')
        .select('id, titulo, acompanhamento')
        .eq('status', 'resolvido');

      if (error) throw error;

      const total = tickets?.length || 0;
      setProgress({ current: 0, total });

      for (let i = 0; i < (tickets?.length || 0); i++) {
        const ticket = tickets![i];
        await indexTicket(ticket);
        setProgress({ current: i + 1, total });
      }

      toast.success(`${total} chamados indexados com sucesso!`);
    } catch (error) {
      console.error('Error indexing tickets:', error);
      toast.error('Erro ao indexar chamados.');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [indexTicket]);

  return {
    loading,
    progress,
    indexScript,
    indexTicket,
    indexAllScripts,
    indexAllTickets,
  };
}
