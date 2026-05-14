import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, StopCircle, Bot, User, Sparkles, Zap, Wifi, WifiOff, Search, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCortana, CortanaMessage } from '@/hooks/useCortana';
import { useCortanaOffline } from '@/hooks/useCortanaOffline';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { runMexxExtraction, ExtractedMexxData } from '@/utils/mexxPdfExtractor';

const QUICK_PROMPTS = [
  { emoji: '🔍', text: 'Quais erros mais comuns existem na minha base?' },
  { emoji: '📝', text: 'Me ajude a montar uma resposta para um chamado sobre falha no PEN' },
  { emoji: '📚', text: 'Existe algum script sobre repositório de estruturas?' },
  { emoji: '✅', text: 'Quais chamados já foram resolvidos sobre tramitação?' },
];

const CortanaChat: React.FC = () => {
  const online = useCortana();
  const offline = useCortanaOffline();
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const active = mode === 'online' ? online : offline;

  const [input, setInput] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [active.messages]);

  const handleSend = () => {
    if (!input.trim() || active.isLoading) return;
    active.sendMessage(input);
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const buildMexxPrompt = (d: ExtractedMexxData) => {
    const campos = d.campos_personalizados && Object.keys(d.campos_personalizados).length
      ? Object.entries(d.campos_personalizados).map(([k, v]) => `- **${k}:** ${v}`).join('\n')
      : '_nenhum_';
    return [
      '📄 **Analise este chamado MEXX e responda completo.**',
      '',
      'Use a base de conhecimento (modelos de resposta, chamados resolvidos, KB) e estruture:',
      '1. **Análise técnica** do problema relatado',
      '2. **Solução sugerida** passo a passo',
      '3. **Modelo de resposta formal** pronto para enviar ao usuário',
      '4. **Fontes utilizadas** e nível de confiança (%)',
      '',
      '---',
      `**Nº Chamado:** ${d.numero_chamado || 'N/I'}`,
      `**Solicitante:** ${d.usuario_nome || 'N/I'} ${d.usuario_email ? `(${d.usuario_email})` : ''}`,
      `**Órgão:** ${d.orgao || 'N/I'}`,
      `**Categoria:** ${d.categoria || 'N/I'} | **Prioridade:** ${d.prioridade || 'N/I'}`,
      `**Tipo:** ${d.tipo_chamado || 'N/I'} | **Time:** ${d.time_atendimento || 'N/I'}`,
      `**SLA Atendimento:** ${d.sla_atendimento || 'N/I'} | **SLA Solução:** ${d.sla_solucao || 'N/I'}`,
      `**Aberto em:** ${d.data_abertura || 'N/I'} | **Previsão:** ${d.previsao_solucao || 'N/I'}`,
      '',
      '**Descrição:**',
      d.descricao || '_não informada_',
      '',
      '**Campos Personalizados:**',
      campos,
    ].join('\n');
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF muito grande (máx 10MB).');
      return;
    }
    setPdfLoading(true);
    setPdfProgress(0);
    const t = toast.loading('Analisando PDF do MEXX...');
    try {
      const { data } = await runMexxExtraction(file, (p) => setPdfProgress(p));
      toast.success('PDF analisado. Cortana está respondendo...', { id: t });
      if (mode !== 'online') setMode('online');
      const prompt = buildMexxPrompt(data);
      setTimeout(() => online.sendMessage(prompt), 50);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao processar PDF', { id: t });
    } finally {
      setPdfLoading(false);
      setPdfProgress(0);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[780px]">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex rounded-lg border border-border/50 overflow-hidden text-sm">
          <button
            onClick={() => setMode('online')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 transition-colors font-medium',
              mode === 'online'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            <Wifi className="h-3.5 w-3.5" />
            IA Online
          </button>
          <button
            onClick={() => setMode('offline')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 transition-colors font-medium',
              mode === 'offline'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Busca Local
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {mode === 'online' ? 'Respostas inteligentes com IA' : 'Busca por palavras-chave — sem consumir tokens'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
        <ScrollArea className="h-full p-5" ref={scrollRef}>
          {active.messages.length === 0 ? (
            <WelcomeScreen mode={mode} onQuickPrompt={(p) => active.sendMessage(p)} />
          ) : (
            <div className="space-y-5">
              {active.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {active.isLoading && active.messages[active.messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-center gap-3 pl-12">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {mode === 'online' ? 'Cortana está pensando...' : 'Buscando na base local...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input bar */}
      <div className="mt-3 flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'online' ? 'Pergunte à Cortana...' : 'Buscar na base de conhecimento...'}
            className="min-h-[52px] max-h-[140px] resize-none rounded-xl bg-card border-border/50 pr-12 text-sm shadow-sm focus-visible:ring-primary/30"
            rows={1}
          />
        </div>
        <div className="flex gap-1.5">
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePdfUpload(f);
              e.target.value = '';
            }}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => pdfInputRef.current?.click()}
            disabled={pdfLoading || active.isLoading}
            title="Enviar PDF do MEXX para análise completa"
            className="h-[52px] w-[52px] rounded-xl text-primary border-primary/30 hover:bg-primary/10 relative"
          >
            {pdfLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
            {pdfLoading && (
              <span className="absolute -bottom-1 left-1 right-1 text-[9px] font-bold text-primary">{pdfProgress}%</span>
            )}
          </Button>
          {active.isLoading && mode === 'online' ? (
            <Button size="icon" variant="destructive" onClick={online.stopGeneration} className="h-[52px] w-[52px] rounded-xl shadow-sm">
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-[52px] w-[52px] rounded-xl shadow-sm">
              <Send className="h-5 w-5" />
            </Button>
          )}
          {active.messages.length > 0 && (
            <Button size="icon" variant="outline" onClick={active.clearChat} className="h-[52px] w-[52px] rounded-xl text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const WelcomeScreen: React.FC<{ mode: string; onQuickPrompt: (p: string) => void }> = ({ mode, onQuickPrompt }) => (
  <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
    <div className="relative mb-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
        {mode === 'online' ? <Sparkles className="h-10 w-10 text-primary" /> : <Search className="h-10 w-10 text-primary" />}
      </div>
      <div className={cn(
        "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center",
        mode === 'online' ? 'bg-green-500' : 'bg-amber-500'
      )}>
        {mode === 'online' ? <Zap className="h-3 w-3 text-primary-foreground" /> : <WifiOff className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
    <h3 className="text-2xl font-bold mb-2">
      {mode === 'online' ? 'Olá! Eu sou a Cortana 👋' : 'Busca Local 🔍'}
    </h3>
    <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
      {mode === 'online'
        ? 'Sua assistente de IA especialista no PEN. Pergunte sobre erros, soluções, scripts e chamados.'
        : 'Pesquise diretamente na base de conhecimento sem consumir tokens. Ideal para buscas rápidas por palavras-chave.'}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
      {QUICK_PROMPTS.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onQuickPrompt(prompt.text)}
          className="group text-left text-sm p-4 rounded-xl border border-border/50 bg-card/80 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover:shadow-sm"
        >
          <span className="text-lg mb-1 block">{prompt.emoji}</span>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">{prompt.text}</span>
        </button>
      ))}
    </div>
  </div>
);

const MessageBubble: React.FC<{ message: CortanaMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-xs font-semibold">{isUser ? 'Você' : 'Cortana'}</span>
          <span className="text-[11px] text-muted-foreground/50">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={cn(
          'rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted/40 border border-border/30 rounded-tl-md'
        )}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CortanaChat;
