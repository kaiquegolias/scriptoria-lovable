import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChamadoList from '@/components/chamados/ChamadoList';
import ChamadoModal from '@/components/chamados/ChamadoModal';
import { supabase } from '@/integrations/supabase/client';
import { Chamado } from '@/components/chamados/ChamadoCard';

const Chamados = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [loadingChamado, setLoadingChamado] = useState(false);

  // Check for id parameter in URL to open specific chamado
  useEffect(() => {
    const chamadoId = searchParams.get('id');
    if (chamadoId) {
      loadChamadoById(chamadoId);
    }
  }, [searchParams]);

  const loadChamadoById = async (id: string) => {
    try {
      setLoadingChamado(true);
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const chamado: Chamado = {
          id: data.id,
          titulo: data.titulo,
          status: data.status as Chamado['status'],
          estruturante: data.estruturante as Chamado['estruturante'],
          nivel: data.nivel as Chamado['nivel'],
          acompanhamento: data.acompanhamento,
          links: data.links || [],
          dataCriacao: data.data_criacao,
          dataAtualizacao: data.data_atualizacao,
          dataLimite: data.data_limite
        };
        setSelectedChamado(chamado);
      }
    } catch (error) {
      console.error('Error loading chamado:', error);
    } finally {
      setLoadingChamado(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedChamado(null);
    // Remove id from URL
    searchParams.delete('id');
    setSearchParams(searchParams);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/40 to-background p-6 mb-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
            Atendimento
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Chamados</h1>
          <p className="text-foreground/70 mt-2 max-w-2xl">
            Acompanhe, atualize e priorize seus chamados em tempo real. Importe automaticamente do Portal MEXX e mantenha tudo organizado.
          </p>
        </div>
      </div>

      <ChamadoList />

      {selectedChamado && (
        <ChamadoModal
          chamado={selectedChamado}
          onClose={handleCloseModal}
          onEdit={() => {}}
          onFinish={() => {}}
          onReopen={() => {}}
          onDelete={async () => { handleCloseModal(); }}
        />
      )}
    </div>
  );
};

export default Chamados;
