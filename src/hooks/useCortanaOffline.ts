import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CortanaMessage } from '@/hooks/useCortana';

/** Keyword-based offline search engine — no AI needed */

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'o','a','os','as','um','uma','de','do','da','dos','das','em','no','na','nos','nas',
    'por','para','com','sem','sobre','entre','que','qual','quais','como','onde','quando',
    'quem','se','ou','e','mas','pois','porque','não','sim','mais','menos','muito','pouco',
    'bem','mal','já','ainda','também','só','apenas','esse','essa','este','esta','isso',
    'eu','você','ele','ela','nós','eles','meu','minha','seu','sua','ser','estar','ter',
    'haver','fazer','poder','dever','ir','vir','me','te','lhe','ao','à','pelo','pela',
    'olá','oi','bom','boa','dia','tarde','noite','obrigado','obrigada','preciso','quero',
    'gostaria','favor','ajuda','ajude','saber','cortana','hey','hei','tudo','nada','algo',
    'coisa','foi','era','tem','pode','deve','vai','vem','faz','dá',
  ]);
  return text.toLowerCase()
    .replace(/[^\w\sàáâãéêíóôõúç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function scoreText(text: string, keywords: string[]): number {
  if (!text || !keywords.length) return 0;
  const lower = text.toLowerCase();
  return keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
}

interface SearchResult {
  type: 'script' | 'ticket' | 'kb';
  title: string;
  content: string;
  score: number;
  meta?: string;
}

export function useCortanaOffline() {
  const [messages, setMessages] = useState<CortanaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const search = useCallback(async (input: string) => {
    if (!user || !input.trim()) return;

    const userMsg: CortanaMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const keywords = extractKeywords(input);
      const ticketNumber = input.match(/\d{7,}/)?.[0] || null;

      // Parallel fetch
      const [
        { data: scripts },
        { data: tickets },
        { data: kbDocs },
        { data: kbVectors },
      ] = await Promise.all([
        supabase.from('scripts').select('nome, situacao, modelo, estruturante, nivel').eq('user_id', user.id),
        supabase.from('chamados').select('titulo, acompanhamento, classificacao, pen_produto, pen_modulo, status').eq('user_id', user.id).order('data_atualizacao', { ascending: false }).limit(100),
        supabase.from('kb_documents').select('title, content, category'),
        supabase.from('kb_vectors').select('title, content_preview, source_type').limit(200),
      ]);

      const results: SearchResult[] = [];

      // Score scripts
      (scripts || []).forEach(s => {
        const text = `${s.nome} ${s.situacao} ${s.modelo}`;
        const score = scoreText(text, keywords) + (ticketNumber && text.includes(ticketNumber) ? 50 : 0);
        if (score > 0) {
          results.push({
            type: 'script',
            title: s.nome,
            content: `**Situação:** ${s.situacao}\n\n**Modelo de Resposta:**\n${s.modelo}`,
            score,
            meta: `${s.estruturante} • ${s.nivel}`,
          });
        }
      });

      // Score tickets
      (tickets || []).forEach(t => {
        const text = `${t.titulo} ${t.acompanhamento} ${t.classificacao || ''} ${t.pen_produto || ''}`;
        const score = scoreText(text, keywords) + (ticketNumber && t.titulo.includes(ticketNumber) ? 50 : 0);
        if (score > 0) {
          results.push({
            type: 'ticket',
            title: t.titulo,
            content: t.acompanhamento,
            score,
            meta: `${t.status === 'resolvido' ? '✅ Resolvido' : '🔄 Aberto'} • ${t.pen_produto || 'N/A'}`,
          });
        }
      });

      // Score KB
      (kbDocs || []).forEach(d => {
        const text = `${d.title} ${d.content}`;
        const score = scoreText(text, keywords) + (ticketNumber && text.includes(ticketNumber) ? 50 : 0);
        if (score > 0) {
          results.push({
            type: 'kb',
            title: d.title,
            content: d.content.slice(0, 500),
            score,
            meta: d.category || 'Documento KB',
          });
        }
      });

      // Score KB vectors
      (kbVectors || []).forEach(v => {
        const text = `${v.title || ''} ${v.content_preview || ''}`;
        const score = scoreText(text, keywords) + (ticketNumber && text.includes(ticketNumber) ? 50 : 0);
        if (score > 0) {
          results.push({
            type: 'kb',
            title: v.title || 'Sem título',
            content: (v.content_preview || '').slice(0, 300),
            score,
            meta: v.source_type,
          });
        }
      });

      // Sort by relevance
      results.sort((a, b) => b.score - a.score);
      const top = results.slice(0, 10);

      // Build response
      let response: string;
      if (top.length === 0) {
        response = `🔍 **Nenhum resultado encontrado** para: "${input}"\n\nPalavras-chave buscadas: ${keywords.join(', ') || 'nenhuma'}\n\n💡 Tente reformular sua busca ou use termos mais específicos como nome do produto (SEI, Tramita, NUP) ou número do chamado.`;
      } else {
        const sections = top.map((r, i) => {
          const icon = r.type === 'script' ? '📝' : r.type === 'ticket' ? '🎫' : '📚';
          return `### ${icon} ${i + 1}. ${r.title}\n*${r.meta}* • Relevância: ${'⭐'.repeat(Math.min(r.score, 5))}\n\n${r.content.slice(0, 400)}${r.content.length > 400 ? '...' : ''}`;
        });
        response = `🔍 **Encontrei ${top.length} resultado(s)** na base de conhecimento:\n\n${sections.join('\n\n---\n\n')}\n\n---\n*🔌 Modo Offline — busca por palavras-chave na base local. Para análises inteligentes com IA, use o modo Online.*`;
      }

      const assistantMsg: CortanaMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Offline search error:', err);
      const errorMsg: CortanaMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '❌ Erro ao buscar na base local. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [user, messages]);

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage: search, clearChat };
}
