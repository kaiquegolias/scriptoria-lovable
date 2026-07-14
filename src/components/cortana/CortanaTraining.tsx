import React, { useEffect, useState, useCallback } from 'react';
import {
  Brain, Database, FileText, CheckCircle2, Loader2, BarChart3, BookOpen,
  Upload, RefreshCw, Trash2, ExternalLink, Activity, TrendingUp, AlertCircle,
  Clock, MessageCircle, Search, Zap, Link as LinkIcon, HeartPulse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useKBIndexer } from '@/hooks/useKBIndexer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CortanaDocumentUpload from './CortanaDocumentUpload';

interface KBStats {
  totalScripts: number;
  totalTickets: number;
  totalKBDocs: number;
  totalModelos: number;
  indexedScripts: number;
  indexedTickets: number;
  lastIndexed: string | null;
}

interface KBDocument {
  id: string;
  title: string;
  source: string;
  category: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

interface CortanaQuery {
  id: string;
  pergunta: string;
  resposta_preview: string | null;
  mode: string;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface UsageMetrics {
  total: number;
  today: number;
  last7d: number;
  successRate: number;
  avgLatency: number;
  errors: number;
  topKeywords: { word: string; count: number }[];
  recent: CortanaQuery[];
}

const CortanaTraining: React.FC = () => {
  const { loading, progress, indexAllScripts, indexAllTickets } = useKBIndexer();
  const [stats, setStats] = useState<KBStats>({
    totalScripts: 0, totalTickets: 0, totalKBDocs: 0, totalModelos: 0,
    indexedScripts: 0, indexedTickets: 0, lastIndexed: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [
        { count: totalScripts },
        { count: totalTickets },
        { count: totalKBDocs },
        { count: totalModelos },
        { count: indexedScripts },
        { count: indexedTickets },
        { data: lastEntry },
      ] = await Promise.all([
        supabase.from('scripts_library').select('*', { count: 'exact', head: true }),
        supabase.from('chamados').select('*', { count: 'exact', head: true }).eq('status', 'resolvido'),
        supabase.from('kb_documents').select('*', { count: 'exact', head: true }),
        supabase.from('scripts').select('*', { count: 'exact', head: true }),
        supabase.from('kb_vectors').select('*', { count: 'exact', head: true }).eq('source_type', 'script'),
        supabase.from('kb_vectors').select('*', { count: 'exact', head: true }).eq('source_type', 'ticket'),
        supabase.from('kb_vectors').select('updated_at').order('updated_at', { ascending: false }).limit(1),
      ]);
      setStats({
        totalScripts: totalScripts || 0, totalTickets: totalTickets || 0,
        totalKBDocs: totalKBDocs || 0, totalModelos: totalModelos || 0,
        indexedScripts: indexedScripts || 0, indexedTickets: indexedTickets || 0,
        lastIndexed: lastEntry?.[0]?.updated_at || null,
      });
    } catch (err) { console.error('Error fetching KB stats:', err); }
    finally { setStatsLoading(false); }
  }, []);

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kb_documents')
        .select('id, title, source, category, content, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      toast.error('Erro ao carregar fontes.');
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cortana_queries')
        .select('id, pergunta, resposta_preview, mode, latency_ms, success, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const rows = (data || []) as CortanaQuery[];
      const now = Date.now();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const sevenAgo = now - 7 * 24 * 60 * 60 * 1000;

      const todayCount = rows.filter(r => new Date(r.created_at).getTime() >= today.getTime()).length;
      const last7d = rows.filter(r => new Date(r.created_at).getTime() >= sevenAgo).length;
      const successCount = rows.filter(r => r.success).length;
      const latencies = rows.filter(r => r.latency_ms).map(r => r.latency_ms as number);
      const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
      const errors = rows.filter(r => !r.success).length;

      // Top keywords
      const stop = new Set(['para','como','sobre','tenho','fazer','isso','esse','essa','esta','este','pelo','pela','mais','muito','onde','quando','porque','porquê','está','estao','estão','vocês','você','tudo','nada','algum','alguma','algumas','alguns','entre','pode','deve','fica','vamos','então','também','apenas','sendo','vamos','favor','preciso','quero','gostaria']);
      const freq: Record<string, number> = {};
      rows.forEach(r => {
        r.pergunta.toLowerCase()
          .replace(/[^\w\sàáâãéêíóôõúç]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stop.has(w))
          .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      });
      const topKeywords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      setMetrics({
        total: rows.length,
        today: todayCount,
        last7d,
        successRate: rows.length ? Math.round((successCount / rows.length) * 100) : 100,
        avgLatency,
        errors,
        topKeywords,
        recent: rows.slice(0, 15),
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
      toast.error('Erro ao carregar métricas.');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchDocuments();
    fetchMetrics();
  }, [fetchStats, fetchDocuments, fetchMetrics]);

  const handleTrainAll = async () => {
    toast.info('Iniciando treinamento completo da Cortana...');
    await indexAllScripts();
    await indexAllTickets();
    await fetchStats();
    toast.success('Treinamento concluído! 🧠');
  };

  const handleDeleteDocument = async (id: string, title: string) => {
    try {
      const { error } = await supabase.from('kb_documents').delete().eq('id', id);
      if (error) throw error;
      toast.success(`"${title}" removido da base.`);
      fetchDocuments();
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover documento.');
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const totalCoverage = stats.totalScripts + stats.totalTickets > 0
    ? Math.round(((stats.indexedScripts + stats.indexedTickets) / (stats.totalScripts + stats.totalTickets)) * 100)
    : 0;

  const isHealthy = totalCoverage >= 80 && (metrics?.successRate ?? 100) >= 90;

  return (
    <div className="space-y-6">
      {/* Health banner */}
      <Card className={`overflow-hidden border-2 ${isHealthy ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isHealthy ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">
                {isHealthy ? 'Cortana operando com saúde ótima' : 'Cortana precisa de atenção'}
              </div>
              <div className="text-xs text-muted-foreground">
                Cobertura {totalCoverage}% · Sucesso {metrics?.successRate ?? 100}% · Latência média {metrics?.avgLatency ?? 0}ms
              </div>
            </div>
          </div>
          <Badge variant={isHealthy ? 'default' : 'secondary'} className="text-xs">
            {isHealthy ? '● Saudável' : '● Atenção'}
          </Badge>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Scripts Biblioteca" value={stats.totalScripts} indexed={stats.indexedScripts} loading={statsLoading} />
        <StatCard icon={<Database className="h-4 w-4" />} label="Chamados Resolvidos" value={stats.totalTickets} indexed={stats.indexedTickets} loading={statsLoading} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Documentos KB" value={stats.totalKBDocs} loading={statsLoading} auto />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Modelos de Resposta" value={stats.totalModelos} loading={statsLoading} auto />
      </div>

      <Tabs defaultValue="fontes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="fontes" className="flex items-center gap-2 text-xs md:text-sm">
            <BookOpen className="h-4 w-4" /> Fontes
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2 text-xs md:text-sm">
            <Upload className="h-4 w-4" /> Alimentar
          </TabsTrigger>
          <TabsTrigger value="index" className="flex items-center gap-2 text-xs md:text-sm">
            <RefreshCw className="h-4 w-4" /> Reindexar
          </TabsTrigger>
          <TabsTrigger value="metricas" className="flex items-center gap-2 text-xs md:text-sm">
            <TrendingUp className="h-4 w-4" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="saude" className="flex items-center gap-2 text-xs md:text-sm">
            <Activity className="h-4 w-4" /> Saúde
          </TabsTrigger>
        </TabsList>

        {/* ============ FONTES (documentos/URLs) ============ */}
        <TabsContent value="fontes">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Tudo que a Cortana aprendeu
                  </CardTitle>
                  <CardDescription>
                    Documentos e URLs indexados na base de conhecimento. Remova o que não é mais relevante.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={docsLoading} className="rounded-xl">
                  {docsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : documents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Nenhuma fonte adicionada. Use a aba "Alimentar" para começar.
                </div>
              ) : (
                <ScrollArea className="h-[520px] pr-3">
                  <div className="space-y-2">
                    {documents.map((doc) => {
                      const isUrl = doc.source?.startsWith('http');
                      return (
                        <div key={doc.id} className="group flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/30 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {isUrl ? <LinkIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium text-sm truncate">{doc.title}</div>
                              {doc.category && <Badge variant="secondary" className="text-[10px] h-4">{doc.category}</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {isUrl ? doc.source : `${(doc.content?.length || 0).toLocaleString()} caracteres`}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 mt-1">
                              Adicionado {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ptBR })}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUrl && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                <a href={doc.source} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover fonte?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A Cortana não usará mais <strong>"{doc.title}"</strong> nas próximas respostas. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteDocument(doc.id, doc.title)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Sim, remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ALIMENTAR ============ */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Alimentar Base de Conhecimento
              </CardTitle>
              <CardDescription>
                Envie documentos (PDF, EPUB, XLS) ou URLs de páginas gov.br para enriquecer a base da Cortana.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CortanaDocumentUpload onDocumentAdded={() => { fetchStats(); fetchDocuments(); }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ REINDEXAR ============ */}
        <TabsContent value="index">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Reindexar Dados Existentes
              </CardTitle>
              <CardDescription>
                A indexação processa scripts e chamados resolvidos para busca otimizada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Indexando...</span>
                    <span className="font-medium">{progress.current}/{progress.total}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button onClick={handleTrainAll} disabled={loading} className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
                  <span className="font-medium">Treinamento Completo</span>
                  <span className="text-xs opacity-80">Scripts + Chamados</span>
                </Button>
                <Button variant="outline" onClick={async () => { await indexAllScripts(); await fetchStats(); }} disabled={loading} className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  <span className="font-medium">Treinar Scripts</span>
                  <span className="text-xs opacity-80">{stats.totalScripts} scripts</span>
                </Button>
                <Button variant="outline" onClick={async () => { await indexAllTickets(); await fetchStats(); }} disabled={loading} className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                  <span className="font-medium">Treinar Chamados</span>
                  <span className="text-xs opacity-80">{stats.totalTickets} chamados</span>
                </Button>
              </div>
              {stats.lastIndexed && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Último treinamento: {new Date(stats.lastIndexed).toLocaleString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MÉTRICAS ============ */}
        <TabsContent value="metricas">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={<MessageCircle className="h-4 w-4" />} label="Perguntas totais" value={metrics?.total ?? 0} loading={metricsLoading} />
              <MetricCard icon={<Zap className="h-4 w-4" />} label="Hoje" value={metrics?.today ?? 0} loading={metricsLoading} />
              <MetricCard icon={<Clock className="h-4 w-4" />} label="Últimos 7 dias" value={metrics?.last7d ?? 0} loading={metricsLoading} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Taxa de sucesso" value={`${metrics?.successRate ?? 100}%`} loading={metricsLoading} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary"/> Palavras mais perguntadas</CardTitle></CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground"/></div>
                  ) : metrics?.topKeywords.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6">Sem dados ainda.</div>
                  ) : (
                    <div className="space-y-2">
                      {metrics?.topKeywords.map((k, i) => (
                        <div key={k.word} className="flex items-center gap-2 text-sm">
                          <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                          <span className="flex-1 font-medium truncate">{k.word}</span>
                          <Badge variant="secondary" className="text-xs">{k.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/> Últimas perguntas</CardTitle></CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground"/></div>
                  ) : metrics?.recent.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6">Nenhuma pergunta registrada ainda.</div>
                  ) : (
                    <ScrollArea className="h-[240px] pr-3">
                      <div className="space-y-2">
                        {metrics?.recent.map((q) => (
                          <div key={q.id} className="text-xs p-2 rounded-lg border border-border/40">
                            <div className="flex items-center gap-2 mb-1">
                              {q.success ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                              )}
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                              {q.latency_ms && <Badge variant="outline" className="text-[9px] h-4 ml-auto">{q.latency_ms}ms</Badge>}
                            </div>
                            <div className="line-clamp-2 text-foreground/80">{q.pergunta}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============ SAÚDE ============ */}
        <TabsContent value="saude">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Cobertura de indexação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <HealthRow label="Scripts biblioteca" value={stats.indexedScripts} total={stats.totalScripts} />
                <HealthRow label="Chamados resolvidos" value={stats.indexedTickets} total={stats.totalTickets} />
                <HealthRow label="Cobertura total" value={stats.indexedScripts + stats.indexedTickets} total={stats.totalScripts + stats.totalTickets} highlight />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Diagnóstico</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <HealthLine ok={totalCoverage >= 80} okText="Cobertura acima de 80%" badText={`Cobertura baixa (${totalCoverage}%). Rode o treinamento completo.`} />
                <HealthLine ok={(metrics?.successRate ?? 100) >= 90} okText={`Taxa de sucesso ${metrics?.successRate ?? 100}%`} badText={`Muitos erros nas respostas (${metrics?.errors ?? 0}).`} />
                <HealthLine ok={documents.length > 0} okText={`${documents.length} fonte(s) alimentada(s)`} badText="Nenhuma fonte externa adicionada." />
                <HealthLine ok={stats.totalModelos > 0} okText={`${stats.totalModelos} modelos de resposta`} badText="Sem modelos de resposta cadastrados." />
                <HealthLine ok={!!stats.lastIndexed && (Date.now() - new Date(stats.lastIndexed).getTime()) < 7 * 24 * 3600 * 1000} okText="Indexação recente (últimos 7 dias)" badText="Indexação desatualizada — reindexe." />
              </CardContent>
            </Card>
          </div>

          {metrics && metrics.errors > 0 && (
            <Card className="mt-4 border-destructive/30">
              <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4"/> Erros recentes</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-3">
                  <div className="space-y-2">
                    {metrics.recent.filter(r => !r.success).map(q => (
                      <div key={q.id} className="text-xs p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                        <div className="text-muted-foreground mb-1">
                          {formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                        <div className="line-clamp-1 font-medium">{q.pergunta}</div>
                        {q.error_message && <div className="text-destructive mt-1 line-clamp-1">{q.error_message}</div>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: number;
  indexed?: number; loading: boolean; auto?: boolean;
}> = ({ icon, label, value, indexed, loading, auto }) => {
  const coverage = !auto && indexed !== undefined && value > 0 ? Math.round((indexed / value) * 100) : 100;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}<span className="text-xs font-medium">{label}</span>
          </div>
          {auto ? (
            <Badge variant="outline" className="text-[10px] h-5">{loading ? '...' : 'Auto'}</Badge>
          ) : (
            <Badge variant={coverage >= 80 ? 'default' : coverage >= 40 ? 'secondary' : 'destructive'} className="text-[10px] h-5">
              {loading ? '...' : `${coverage}%`}
            </Badge>
          )}
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {loading ? '...' : value}
          {!auto && indexed !== undefined && (
            <span className="text-xs text-muted-foreground font-normal ml-1">({indexed} idx)</span>
          )}
        </div>
        {!auto && <Progress value={coverage} className="h-1 mt-2" />}
      </CardContent>
    </Card>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; loading: boolean }> = ({ icon, label, value, loading }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="text-2xl font-bold tabular-nums">{loading ? '...' : value}</div>
    </CardContent>
  </Card>
);

const HealthRow: React.FC<{ label: string; value: number; total: number; highlight?: boolean }> = ({ label, value, total, highlight }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
        <span className="tabular-nums">{value}/{total} · {pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
};

const HealthLine: React.FC<{ ok: boolean; okText: string; badText: string }> = ({ ok, okText, badText }) => (
  <div className="flex items-start gap-2">
    {ok
      ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      : <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
    }
    <span className={ok ? 'text-muted-foreground' : 'text-foreground'}>{ok ? okText : badText}</span>
  </div>
);

export default CortanaTraining;
