import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, StopCircle, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCortana, CortanaMessage } from '@/hooks/useCortana';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'Quais erros mais comuns existem na minha base?',
  'Me ajude a montar uma resposta para um chamado sobre falha no PEN',
  'Existe algum script sobre repositório de estruturas?',
  'Quais chamados já foram resolvidos sobre problemas de tramitação?',
];

const CortanaChat: React.FC = () => {
  const { messages, isLoading, sendMessage, clearChat, stopGeneration } = useCortana();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] max-h-[700px]">
      {/* Chat messages area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border/50">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <WelcomeScreen onQuickPrompt={handleQuickPrompt} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="flex gap-1">
                    <span className="animate-bounce delay-0 w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="animate-bounce delay-100 w-1.5 h-1.5 rounded-full bg-primary" style={{ animationDelay: '0.1s' }} />
                    <span className="animate-bounce delay-200 w-1.5 h-1.5 rounded-full bg-primary" style={{ animationDelay: '0.2s' }} />
                  </div>
                  Cortana está pensando...
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border/50 p-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte à Cortana sobre sua base de conhecimento..."
              className="min-h-[44px] max-h-[120px] resize-none bg-muted/30 border-border/50"
              rows={1}
            />
            <div className="flex flex-col gap-1">
              {isLoading ? (
                <Button size="icon" variant="destructive" onClick={stopGeneration} title="Parar geração">
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" onClick={handleSend} disabled={!input.trim()} title="Enviar mensagem">
                  <Send className="h-4 w-4" />
                </Button>
              )}
              {messages.length > 0 && (
                <Button size="icon" variant="ghost" onClick={clearChat} title="Limpar conversa" className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const WelcomeScreen: React.FC<{ onQuickPrompt: (p: string) => void }> = ({ onQuickPrompt }) => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <Sparkles className="h-8 w-8 text-primary" />
    </div>
    <h3 className="text-xl font-semibold mb-2">Olá! Eu sou a Cortana</h3>
    <p className="text-muted-foreground text-sm max-w-md mb-6">
      Sua assistente de IA especializada. Pergunto sobre erros, soluções, scripts e chamados da sua base de conhecimento.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
      {QUICK_PROMPTS.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onQuickPrompt(prompt)}
          className="text-left text-sm p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          {prompt}
        </button>
      ))}
    </div>
  </div>
);

const MessageBubble: React.FC<{ message: CortanaMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary/10' : 'bg-primary/20'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'Você' : 'Cortana'}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={`rounded-lg p-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 border border-border/30'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CortanaChat;
