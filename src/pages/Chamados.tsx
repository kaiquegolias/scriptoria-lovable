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
      <h1 className="text-2xl font-bold mb-2">Gerenciamento de Chamados</h1>
      <p className="text-foreground/70 mb-8">
        Acompanhe e atualize o status dos seus chamados.
      </p>
      
      <ChamadoList />

      {/* Modal for viewing chamado from URL parameter */}
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
