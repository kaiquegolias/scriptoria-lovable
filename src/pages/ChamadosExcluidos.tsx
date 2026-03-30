import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, ArrowUpCircle, Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChamadoExcluido extends Chamado {
  motivoExclusao?: string;
  dataExclusao?: string;
}

const ChamadosExcluidos = () => {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<ChamadoExcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchExcluidos();
  }, [user]);

  const fetchExcluidos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .eq('status', 'excluido')
        .order('data_exclusao', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: ChamadoExcluido[] = data.map(item => ({
          id: item.id,
          titulo: item.titulo,
          status: item.status as any,
          estruturante: item.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: item.nivel as 'N1' | 'N2' | 'N3',
          acompanhamento: item.acompanhamento,
          links: item.links || [],
          dataCriacao: item.data_criacao,
          dataAtualizacao: item.data_atualizacao,
          dataLimite: item.data_limite,
          motivoExclusao: (item as any).motivo_exclusao || 'Não informado',
          dataExclusao: (item as any).data_exclusao || item.data_atualizacao,
        }));
        setChamados(formatted);
      }
    } catch (err) {
      console.error('Error fetching excluded chamados:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = chamados.filter(c =>
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.acompanhamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subiuN3 = filtered.filter(c => c.motivoExclusao === 'Subiu para N3');
  const outros = filtered.filter(c => c.motivoExclusao !== 'Subiu para N3');

  const renderCard = (chamado: ChamadoExcluido) => (
    <div key={chamado.id} className="glass p-5 rounded-xl border border-border/50">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-foreground line-clamp-1">{chamado.titulo}</h3>
        <Badge variant={chamado.motivoExclusao === 'Subiu para N3' ? 'default' : 'secondary'} className="shrink-0 ml-2">
          {chamado.motivoExclusao === 'Subiu para N3' ? (
            <><ArrowUpCircle size={12} className="mr-1" /> N3</>
          ) : (
            <><Trash2 size={12} className="mr-1" /> Outros</>
          )}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {chamado.estruturante}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {chamado.nivel}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Justificativa:</p>
        <p className="text-sm text-foreground/80 bg-muted/50 p-2 rounded">
          {chamado.motivoExclusao || 'Não informado'}
        </p>
      </div>

      <p className="text-sm text-foreground/70 line-clamp-2 mb-3">{chamado.acompanhamento}</p>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Criado em {format(new Date(chamado.dataCriacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
        {chamado.dataExclusao && (
          <span>Excluído em {format(new Date(chamado.dataExclusao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        )}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Você precisa estar logado.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">Chamados Excluídos</h1>
      <p className="text-foreground/70 mb-6">
        Histórico de chamados excluídos, separados por motivo.
      </p>

      <div className="relative w-full sm:max-w-md mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-foreground/60" />
        </div>
        <input
          type="text"
          placeholder="Buscar chamados excluídos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-lg font-medium">Carregando...</p>
        </div>
      ) : chamados.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Nenhum chamado excluído</p>
        </div>
      ) : (
        <Tabs defaultValue="n3" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="n3" className="flex items-center gap-2">
              <ArrowUpCircle size={14} />
              Subiu para N3 ({subiuN3.length})
            </TabsTrigger>
            <TabsTrigger value="outros" className="flex items-center gap-2">
              <Trash2 size={14} />
              Outros ({outros.length})
            </TabsTrigger>
            <TabsTrigger value="todos">
              Todos ({filtered.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="n3">
            {subiuN3.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum chamado nesta categoria.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subiuN3.map(renderCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outros">
            {outros.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum chamado nesta categoria.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outros.map(renderCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="todos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(renderCard)}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ChamadosExcluidos;
