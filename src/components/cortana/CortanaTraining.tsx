import React from 'react';
import { Brain, Database, FileText, CheckCircle2, Loader2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useKBIndexer } from '@/hooks/useKBIndexer';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KBStats {
  totalScripts: number;
  totalTickets: number;
  totalKBDocs: number;
  indexedScripts: number;
  indexedTickets: number;
  lastIndexed: string | null;
}

const CortanaTraining: React.FC = () => {
  const { loading, progress, indexAllScripts, indexAllTickets } = useKBIndexer();
  const [stats, setStats] = useState<KBStats>({
    totalScripts: 0,
    totalTickets: 0,
    totalKBDocs: 0,
    indexedScripts: 0,
    indexedTickets: 0,
    lastIndexed: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [
        { count: totalScripts },
        { count: totalTickets },
        { count: totalKBDocs },
        { count: indexedScripts },
        { count: indexedTickets },
        { data: lastEntry },
      ] = await Promise.all([
        supabase.from('scripts_library').select('*', { count: 'exact', head: true }),
        supabase.from('chamados').select('*', { count: 'exact', head: true }).eq('status', 'resolvido'),
        supabase.from('kb_documents').select('*', { count: 'exact', head: true }),
        supabase.from('kb_vectors').select('*', { count: 'exact', head: true }).eq('source_type', 'script'),
        supabase.from('kb_vectors').select('*', { count: 'exact', head: true }).eq('source_type', 'ticket'),
        supabase.from('kb_vectors').select('updated_at').order('updated_at', { ascending: false }).limit(1),
      ]);

      setStats({
        totalScripts: totalScripts || 0,
        totalTickets: totalTickets || 0,
        totalKBDocs: totalKBDocs || 0,
        indexedScripts: indexedScripts || 0,
        indexedTickets: indexedTickets || 0,
        lastIndexed: lastEntry?.[0]?.updated_at || null,
      });
    } catch (err) {
      console.error('Error fetching KB stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleTrainAll = async () => {
    toast.info('Iniciando treinamento completo da Cortana...');
    await indexAllScripts();
    await indexAllTickets();
    await fetchStats();
    toast.success('Treinamento concluído! A Cortana agora está mais inteligente.');
  };

  const handleTrainScripts = async () => {
    await indexAllScripts();
    await fetchStats();
  };

  const handleTrainTickets = async () => {
    await indexAllTickets();
    await fetchStats();
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Scripts na Biblioteca"
          total={stats.totalScripts}
          indexed={stats.indexedScripts}
          loading={statsLoading}
        />
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label="Chamados Resolvidos"
          total={stats.totalTickets}
          indexed={stats.indexedTickets}
          loading={statsLoading}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Documentos KB"
          total={stats.totalKBDocs}
          indexed={stats.totalKBDocs}
          loading={statsLoading}
        />
      </div>

      {/* Training actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Treinar Cortana
          </CardTitle>
          <CardDescription>
            O treinamento indexa toda a base de dados para que a Cortana encontre informações relevantes mais rapidamente.
            Quanto mais dados indexados, mais precisa será a IA.
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
            <Button
              onClick={handleTrainAll}
              disabled={loading}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
              <span className="font-medium">Treinamento Completo</span>
              <span className="text-xs opacity-80">Scripts + Chamados</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleTrainScripts}
              disabled={loading}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              <span className="font-medium">Treinar Scripts</span>
              <span className="text-xs opacity-80">{stats.totalScripts} scripts</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleTrainTickets}
              disabled={loading}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
              <span className="font-medium">Treinar Chamados</span>
              <span className="text-xs opacity-80">{stats.totalTickets} chamados</span>
            </Button>
          </div>

          {stats.lastIndexed && (
            <p className="text-xs text-muted-foreground text-center">
              Último treinamento: {new Date(stats.lastIndexed).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona o treinamento?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p><strong>Indexação de Scripts:</strong> Todos os scripts da biblioteca são processados e suas palavras-chave são extraídas para busca rápida.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p><strong>Indexação de Chamados:</strong> Chamados resolvidos são indexados com suas soluções, permitindo que a Cortana encontre casos similares.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p><strong>Aprendizado Contínuo:</strong> Sempre que novos scripts forem criados ou chamados forem resolvidos, treine a Cortana novamente para manter a base atualizada.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  total: number;
  indexed: number;
  loading: boolean;
}> = ({ icon, label, total, indexed, loading }) => {
  const coverage = total > 0 ? Math.round((indexed / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </div>
          <Badge variant={coverage >= 80 ? 'default' : coverage >= 40 ? 'secondary' : 'destructive'} className="text-xs">
            {loading ? '...' : `${coverage}%`}
          </Badge>
        </div>
        <div className="text-2xl font-bold">{loading ? '...' : indexed}<span className="text-sm text-muted-foreground font-normal">/{total}</span></div>
        <Progress value={coverage} className="h-1.5 mt-2" />
      </CardContent>
    </Card>
  );
};

export default CortanaTraining;
