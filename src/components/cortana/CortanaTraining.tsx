import React, { useEffect, useState, useCallback } from 'react';
import { Brain, Database, FileText, CheckCircle2, Loader2, BarChart3, BookOpen, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useKBIndexer } from '@/hooks/useKBIndexer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

const CortanaTraining: React.FC = () => {
  const { loading, progress, indexAllScripts, indexAllTickets } = useKBIndexer();
  const [stats, setStats] = useState<KBStats>({
    totalScripts: 0, totalTickets: 0, totalKBDocs: 0, totalModelos: 0,
    indexedScripts: 0, indexedTickets: 0, lastIndexed: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

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

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleTrainAll = async () => {
    toast.info('Iniciando treinamento completo da Cortana...');
    await indexAllScripts();
    await indexAllTickets();
    await fetchStats();
    toast.success('Treinamento concluído! 🧠');
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Scripts Biblioteca" value={stats.totalScripts} indexed={stats.indexedScripts} loading={statsLoading} />
        <StatCard icon={<Database className="h-4 w-4" />} label="Chamados Resolvidos" value={stats.totalTickets} indexed={stats.indexedTickets} loading={statsLoading} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Documentos KB" value={stats.totalKBDocs} loading={statsLoading} auto />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Modelos de Resposta" value={stats.totalModelos} loading={statsLoading} auto />
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Alimentar Base
          </TabsTrigger>
          <TabsTrigger value="index" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Indexar Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Alimentar Base de Conhecimento
              </CardTitle>
              <CardDescription>
                Envie documentos (PDF, EPUB, XLS) ou URLs de páginas gov.br para enriquecer a base da Cortana.
                O conteúdo será processado e ficará disponível para consultas imediatas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CortanaDocumentUpload onDocumentAdded={fetchStats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="index">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Indexar Dados Existentes
              </CardTitle>
              <CardDescription>
                A indexação processa scripts e chamados resolvidos para busca otimizada. Documentos KB e modelos são consultados diretamente.
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

          {/* How it works */}
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Como funciona?</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                {[
                  { title: 'Upload de Documentos', desc: 'PDFs, EPUBs e XLS são processados e salvos na base KB — a Cortana consulta diretamente.' },
                  { title: 'URLs Gov/Documentação', desc: 'Páginas web são rastreadas e seu conteúdo é extraído e salvo para consulta.' },
                  { title: 'Indexação de Scripts', desc: 'Scripts da biblioteca são tokenizados para busca rápida por palavras-chave.' },
                  { title: 'Indexação de Chamados', desc: 'Chamados resolvidos são indexados com soluções para encontrar casos similares.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p><strong>{item.title}:</strong> {item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
            {icon}
            <span className="text-xs font-medium">{label}</span>
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

export default CortanaTraining;
