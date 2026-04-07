import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, ArrowUpCircle, Search, RotateCcw, X, Calendar, Tag, FileText, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ChamadoExcluido extends Chamado {
  motivoExclusao?: string;
  dataExclusao?: string;
}

const ChamadosExcluidos = () => {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<ChamadoExcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChamado, setSelectedChamado] = useState<ChamadoExcluido | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreJustification, setRestoreJustification] = useState('');
  const [restoring, setRestoring] = useState(false);

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
          motivoExclusao: item.motivo_exclusao || 'Não informado',
          dataExclusao: item.data_exclusao || item.data_atualizacao,
        }));
        setChamados(formatted);
      }
    } catch (err) {
      console.error('Error fetching excluded chamados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedChamado || !restoreJustification.trim()) {
      toast.error('Informe a justificativa para restaurar o chamado.');
      return;
    }

    setRestoring(true);
    try {
      const { error } = await supabase
        .from('chamados')
        .update({
          status: 'em_andamento',
          motivo_exclusao: null,
          data_exclusao: null,
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id);

      if (error) throw error;

      // Add observation with restore justification
      await supabase.from('ticket_followups').insert({
        ticket_id: selectedChamado.id,
        type: 'observation',
        content: `🔄 Chamado restaurado da fila de excluídos.\n\n📋 Motivo da exclusão anterior: ${selectedChamado.motivoExclusao || 'Não informado'}\n📝 Justificativa da restauração: ${restoreJustification.trim()}`,
        created_by: user!.id,
      });

      // Log the restore action
      await supabase.from('system_logs').insert({
        event_type: 'chamado_status_changed' as any,
        message: `Chamado "${selectedChamado.titulo}" restaurado para a fila. Justificativa: ${restoreJustification.trim()}`,
        entity_type: 'chamado',
        entity_id: selectedChamado.id,
        user_id: user!.id,
        user_email: user!.email,
        severity: 'info' as any,
      });

      toast.success('Chamado restaurado para a fila!');
      setChamados(prev => prev.filter(c => c.id !== selectedChamado.id));
      setSelectedChamado(null);
      setShowRestoreModal(false);
      setRestoreJustification('');
    } catch (err) {
      console.error('Error restoring chamado:', err);
      toast.error('Erro ao restaurar chamado.');
    } finally {
      setRestoring(false);
    }
  };

  const filtered = chamados.filter(c =>
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.acompanhamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subiuN3 = filtered.filter(c => c.motivoExclusao === 'Subiu para N3');
  const outros = filtered.filter(c => c.motivoExclusao !== 'Subiu para N3');

  const renderCard = (chamado: ChamadoExcluido, index: number) => (
    <motion.div
      key={chamado.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group bg-card border border-border/60 rounded-2xl p-5 hover:shadow-lg hover:border-border transition-all duration-300 cursor-pointer"
      onClick={() => setSelectedChamado(chamado)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-foreground line-clamp-1 flex-1">{chamado.titulo}</h3>
        <Badge
          variant={chamado.motivoExclusao === 'Subiu para N3' ? 'default' : 'secondary'}
          className="shrink-0 ml-2 text-xs"
        >
          {chamado.motivoExclusao === 'Subiu para N3' ? (
            <><ArrowUpCircle size={11} className="mr-1" /> N3</>
          ) : (
            <><Trash2 size={11} className="mr-1" /> Outros</>
          )}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
          {chamado.estruturante}
        </span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
          {chamado.nivel}
        </span>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{chamado.acompanhamento}</p>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {format(new Date(chamado.dataCriacao), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
        {chamado.dataExclusao && (
          <span className="flex items-center gap-1">
            <Trash2 size={10} />
            {format(new Date(chamado.dataExclusao), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-primary font-medium flex items-center gap-1">
          <ExternalLink size={10} />
          Clique para ver detalhes
        </span>
      </div>
    </motion.div>
  );

  const renderEmptyTab = (message: string) => (
    <div className="text-center py-16">
      <div className="p-4 rounded-2xl bg-accent/50 inline-block mb-4">
        <Trash2 className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Chamados Excluídos</h1>
        <p className="text-muted-foreground mt-1">
          Histórico de chamados excluídos, separados por motivo.
        </p>
      </div>

      <div className="relative w-full sm:max-w-md mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={16} className="text-muted-foreground" />
        </div>
        <Input
          placeholder="Buscar chamados excluídos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl bg-card"
        />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : chamados.length === 0 ? (
        <div className="text-center py-20">
          <div className="p-5 rounded-3xl bg-accent/50 inline-block mb-4">
            <Trash2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Nenhum chamado excluído</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Os chamados excluídos aparecerão aqui.</p>
        </div>
      ) : (
        <Tabs defaultValue="n3" className="w-full">
          <TabsList className="mb-6 bg-card border border-border/50 p-1 rounded-xl">
            <TabsTrigger value="n3" className="rounded-lg flex items-center gap-2 text-sm">
              <ArrowUpCircle size={14} />
              Subiu para N3 ({subiuN3.length})
            </TabsTrigger>
            <TabsTrigger value="outros" className="rounded-lg flex items-center gap-2 text-sm">
              <Trash2 size={14} />
              Outros ({outros.length})
            </TabsTrigger>
            <TabsTrigger value="todos" className="rounded-lg text-sm">
              Todos ({filtered.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="n3">
            {subiuN3.length === 0 ? renderEmptyTab('Nenhum chamado nesta categoria.') : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subiuN3.map((c, i) => renderCard(c, i))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outros">
            {outros.length === 0 ? renderEmptyTab('Nenhum chamado nesta categoria.') : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outros.map((c, i) => renderCard(c, i))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="todos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c, i) => renderCard(c, i))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedChamado && !showRestoreModal} onOpenChange={(open) => { if (!open) setSelectedChamado(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedChamado?.titulo}</DialogTitle>
            <DialogDescription>Detalhes do chamado excluído</DialogDescription>
          </DialogHeader>
          {selectedChamado && (
            <div className="space-y-4 mt-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Tag size={10} />
                  {selectedChamado.estruturante}
                </Badge>
                <Badge variant="outline">{selectedChamado.nivel}</Badge>
                <Badge variant={selectedChamado.motivoExclusao === 'Subiu para N3' ? 'default' : 'secondary'}>
                  {selectedChamado.motivoExclusao}
                </Badge>
              </div>

              <div className="bg-accent/50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Justificativa da Exclusão</p>
                  <p className="text-sm">{selectedChamado.motivoExclusao || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Acompanhamento</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedChamado.acompanhamento}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-accent/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedChamado.dataCriacao), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                {selectedChamado.dataExclusao && (
                  <div className="bg-accent/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Excluído em</p>
                    <p className="font-medium">{format(new Date(selectedChamado.dataExclusao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                )}
              </div>

              {selectedChamado.links && selectedChamado.links.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Links</p>
                  <div className="space-y-1">
                    {selectedChamado.links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline truncate">
                        <ExternalLink size={12} />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSelectedChamado(null)}>
                  Fechar
                </Button>
                <Button className="flex-1 rounded-xl" onClick={() => setShowRestoreModal(true)}>
                  <RotateCcw size={16} className="mr-2" />
                  Retornar para Fila
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Modal */}
      <Dialog open={showRestoreModal} onOpenChange={(open) => { if (!open) { setShowRestoreModal(false); setRestoreJustification(''); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={18} className="text-primary" />
              Retornar para Fila
            </DialogTitle>
            <DialogDescription>
              O chamado "{selectedChamado?.titulo}" será restaurado com status "Em Andamento".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Justificativa *</label>
              <Textarea
                placeholder="Informe o motivo para restaurar este chamado..."
                value={restoreJustification}
                onChange={(e) => setRestoreJustification(e.target.value)}
                className="min-h-[100px] rounded-xl"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowRestoreModal(false); setRestoreJustification(''); }}>
                Cancelar
              </Button>
              <Button className="flex-1 rounded-xl" onClick={handleRestore} disabled={restoring || !restoreJustification.trim()}>
                {restoring ? 'Restaurando...' : 'Confirmar Restauração'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChamadosExcluidos;
