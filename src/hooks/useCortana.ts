import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CortanaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cortana-chat`;

export function useCortana() {
  const [messages, setMessages] = useState<CortanaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (input: string) => {
    if (!user || !input.trim()) return;

    const userMsg: CortanaMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Build message history for context
    const chatHistory = [...messages, userMsg].map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id === assistantId) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, {
          id: assistantId,
          role: 'assistant' as const,
          content: assistantContent,
          timestamp: new Date(),
        }];
      });
    };

    try {
      abortRef.current = new AbortController();

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatHistory, userId: user.id }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errorMsg = errorData.error || `Erro ${resp.status}`;
        
        if (resp.status === 429) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (resp.status === 402) {
          toast.error('Créditos insuficientes. Adicione créditos ao workspace.');
        } else {
          toast.error(errorMsg);
        }
        
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Cortana chat error:', err);
      toast.error('Erro ao comunicar com a Cortana.');
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [user, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    stopGeneration,
  };
}
