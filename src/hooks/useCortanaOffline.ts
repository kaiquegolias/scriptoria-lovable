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

/** Check if content is binary or raw HTML junk */
function isJunkContent(content: string): boolean {
  if (!content) return true;
  // Binary PDF content
  const binaryIndicators = ['/FlateDecode', '/XObject', 'endobj', 'endstream', '/DeviceRGB'];
  let binaryHits = 0;
  for (const ind of binaryIndicators) {
    if (content.includes(ind)) binaryHits++;
  }
  if (binaryHits >= 2) return true;
  // Google Sheets URL or raw HTML from sheets
  if (content.includes('docs.google.com/spreadsheets')) return true;
  if (content.includes('O JavaScript não está habilitado')) return true;
  if (content.includes('Esta versão não é mais compatível')) return true;
  return false;
}

/** Clean content for display — remove URLs, HTML artifacts, excessive whitespace */
function cleanContent(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)]+/g, '') // remove URLs
    .replace(/<[^>]+>/g, '') // remove HTML tags
    .replace(/\s{3,}/g, '\n') // collapse whitespace
    .trim();
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

      const [
        { data: scripts },
        { data: tickets },
        { data: kbDocs },
      ] = await Promise.all([
        supabase.from('scripts').select('nome, situacao, modelo, estruturante, nivel').eq('user_id', user.id),
        supabase.from('chamados').select('titulo, acompanhamento, classificacao, pen_produto, pen_modulo, status').eq('user_id', user.id).order('data_atualizacao', { ascending: false }).limit(100),
        supabase.from('kb_documents').select('title, content, category'),
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
            content: `**Situação:** ${cleanContent(s.situacao).slice(0, 200)}\n\n**Modelo de Resposta:**\n${cleanContent(s.modelo).slice(0, 300)}`,
            score,
            meta: `${s.estruturante} · ${s.nivel}`,
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
            content: cleanContent(t.acompanhamento).slice(0, 250),
            score,
            meta: t.status === 'resolvido' ? '✅ Resolvido' : `🔄 ${t.status}`,
          });
        }
      });

      // Score KB — filter out junk
      (kbDocs || []).forEach(d => {
        if (isJunkContent(d.content)) return;
        const text = `${d.title} ${d.content}`;
        const score = scoreText(text, keywords) + (ticketNumber && text.includes(ticketNumber) ? 50 : 0);
        if (score > 0) {
          results.push({
            type: 'kb',
            title: d.title,
            content: cleanContent(d.content).slice(0, 300),
            score,
            meta: d.category || 'Documento KB',
          });
        }
      });

      // Sort and limit
      results.sort((a, b) => b.score - a.score);
      const top = results.slice(0, 5);

      // Build natural language response
      let response: string;
      if (top.length === 0) {
        response = keywords.length === 0
          ? `Não consegui identificar termos de busca na sua mensagem. Tente perguntar de forma mais específica, por exemplo:\n\n- "erro tramitação SEI"\n- "chamado 33304336"\n- "script repositório de estruturas"`
          : `Não encontrei resultados para: **${keywords.join(', ')}**\n\nSugestões:\n- Use termos mais específicos (ex: nome do produto, número do chamado)\n- Verifique se há scripts ou documentos cadastrados sobre o assunto\n- Tente o modo **IA Online** para uma análise mais inteligente`;
      } else {
        const typeLabel = { script: 'Script', ticket: 'Chamado', kb: 'Documento' };
        const typeIcon = { script: '📝', ticket: '🎫', kb: '📄' };
        
        const sections = top.map((r, i) => {
          return `**${i + 1}. ${typeIcon[r.type]} [${typeLabel[r.type]}] ${r.title}**\n_${r.meta}_\n\n${r.content}`;
        });
        
        response = `Encontrei **${top.length} resultado(s)** relevante(s):\n\n${sections.join('\n\n---\n\n')}`;
        
        if (results.length > 5) {
          response += `\n\n_Mais ${results.length - 5} resultado(s) com menor relevância omitidos._`;
        }
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
        content: 'Ocorreu um erro ao buscar na base local. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage: search, clearChat };
}
