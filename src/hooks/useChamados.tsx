
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { addBusinessDays } from 'date-fns';

export function useChamados(encerrados = false) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch chamados from Supabase
  const fetchChamados = async () => {
    if (!user) {
      setChamados([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .order('data_atualizacao', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const formattedChamados: Chamado[] = data.map(item => ({
          id: item.id,
          titulo: item.titulo,
          status: item.status as 'agendados' | 'agendados_planner' | 'agendados_aguardando' | 'em_andamento' | 'resolvido',
          estruturante: item.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: item.nivel as 'N1' | 'N2' | 'N3',
          acompanhamento: item.acompanhamento,
          links: item.links || [],
          dataCriacao: item.data_criacao,
          dataAtualizacao: item.data_atualizacao,
          dataLimite: item.data_limite
        }));
        
        // Filter based on encerrados param
        if (encerrados) {
          setChamados(formattedChamados.filter(c => c.status === 'resolvido'));
        } else {
          setChamados(formattedChamados.filter(c => c.status !== 'resolvido'));
        }
      }
    } catch (error) {
      console.error('Error fetching chamados:', error);
      toast.error('Erro ao buscar chamados.');
    } finally {
      setLoading(false);
    }
  };

  // Create a new chamado
  const createChamado = async (chamadoData: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar chamados.');
      return null;
    }

    try {
      let dataLimite = undefined;
      if (chamadoData.status === 'agendados_aguardando') {
        dataLimite = addBusinessDays(new Date(), 3).toISOString();
      }
      
      const { data, error } = await supabase
        .from('chamados')
        .insert([
          {
            user_id: user.id,
            titulo: chamadoData.titulo,
            status: chamadoData.status,
            estruturante: chamadoData.estruturante,
            nivel: chamadoData.nivel,
            acompanhamento: chamadoData.acompanhamento,
            links: chamadoData.links,
            data_limite: dataLimite || chamadoData.dataLimite
          }
        ])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const newChamado: Chamado = {
          id: data.id,
          titulo: data.titulo,
          status: data.status as 'agendados' | 'agendados_planner' | 'agendados_aguardando' | 'em_andamento' | 'resolvido',
          estruturante: data.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: data.nivel as 'N1' | 'N2' | 'N3',
          acompanhamento: data.acompanhamento,
          links: data.links || [],
          dataCriacao: data.data_criacao,
          dataAtualizacao: data.data_atualizacao,
          dataLimite: data.data_limite
        };

        if (!encerrados && newChamado.status !== 'resolvido') {
          setChamados([newChamado, ...chamados]);
        }
        return newChamado;
      }
    } catch (error) {
      console.error('Error creating chamado:', error);
      toast.error('Erro ao criar chamado.');
    }
    return null;
  };

  // Update an existing chamado
  const updateChamado = async (id: string, chamadoData: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para atualizar chamados.');
      return null;
    }

    try {
      // Get existing chamado to check if we need to update data_limite
      const { data: existingChamado } = await supabase
        .from('chamados')
        .select('status, data_limite')
        .eq('id', id)
        .single();

      let dataLimite = chamadoData.dataLimite;
      
      // If status is changing to 'agendados_aguardando' and wasn't before, or if it was but didn't have a data_limite
      if (chamadoData.status === 'agendados_aguardando' && 
         (existingChamado?.status !== 'agendados_aguardando' || !existingChamado?.data_limite)) {
        dataLimite = addBusinessDays(new Date(), 3).toISOString();
      } else if (chamadoData.status !== 'agendados_aguardando') {
        // If status is not 'agendados_aguardando' anymore, remove the deadline
        dataLimite = null;
      }

      const { data, error } = await supabase
        .from('chamados')
        .update({
          titulo: chamadoData.titulo,
          status: chamadoData.status,
          estruturante: chamadoData.estruturante,
          nivel: chamadoData.nivel,
          acompanhamento: chamadoData.acompanhamento,
          links: chamadoData.links,
          data_atualizacao: new Date().toISOString(),
          data_limite: dataLimite
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const updatedChamado: Chamado = {
          id: data.id,
          titulo: data.titulo,
          status: data.status as 'agendados' | 'agendados_planner' | 'agendados_aguardando' | 'em_andamento' | 'resolvido',
          estruturante: data.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: data.nivel as 'N1' | 'N2' | 'N3',
          acompanhamento: data.acompanhamento,
          links: data.links || [],
          dataCriacao: data.data_criacao,
          dataAtualizacao: data.data_atualizacao,
          dataLimite: data.data_limite
        };

        // Update in state if still visible in this list
        if ((encerrados && updatedChamado.status === 'resolvido') ||
            (!encerrados && updatedChamado.status !== 'resolvido')) {
          setChamados(chamados.map(chamado => chamado.id === id ? updatedChamado : chamado));
        } else {
          // Remove from the current list if it doesn't belong anymore
          setChamados(chamados.filter(chamado => chamado.id !== id));
        }
        
        return updatedChamado;
      }
    } catch (error) {
      console.error('Error updating chamado:', error);
      toast.error('Erro ao atualizar chamado.');
    }
    return null;
  };

  // Finish a chamado (mark as resolved)
  const finishChamado = async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para finalizar chamados.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'resolvido',
          data_atualizacao: new Date().toISOString(),
          data_limite: null // Clear deadline when resolved
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const updatedChamado: Chamado = {
          id: data.id,
          titulo: data.titulo,
          status: 'resolvido',
          estruturante: data.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: data.nivel as 'N1' | 'N2' | 'N3',
          acompanhamento: data.acompanhamento,
          links: data.links || [],
          dataCriacao: data.data_criacao,
          dataAtualizacao: data.data_atualizacao,
          dataLimite: null
        };

        // If not viewing encerrados, remove from list
        if (!encerrados) {
          setChamados(chamados.filter(chamado => chamado.id !== id));
        } else {
          // If viewing encerrados, add to list
          setChamados([updatedChamado, ...chamados]);
        }
        
        return updatedChamado;
      }
    } catch (error) {
      console.error('Error finishing chamado:', error);
      toast.error('Erro ao finalizar chamado.');
    }
    return null;
  };

  // Reopen a chamado
  const reopenChamado = async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para reabrir chamados.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'em_andamento',
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const updatedChamado: Chamado = {
          id: data.id,
          titulo: data.titulo,
          status: 'em_andamento',
          estruturante: data.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: data.nivel as 'N1' | 'N2' | 'N3',
          acompanhamento: data.acompanhamento,
          links: data.links || [],
          dataCriacao: data.data_criacao,
          dataAtualizacao: data.data_atualizacao,
          dataLimite: data.data_limite
        };

        // If viewing encerrados, remove from list
        if (encerrados) {
          setChamados(chamados.filter(chamado => chamado.id !== id));
        } else {
          // If not viewing encerrados, add to list
          setChamados([updatedChamado, ...chamados]);
        }
        
        return updatedChamado;
      }
    } catch (error) {
      console.error('Error reopening chamado:', error);
      toast.error('Erro ao reabrir chamado.');
    }
    return null;
  };

  // Delete a chamado
  const deleteChamado = async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para excluir chamados.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('chamados')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setChamados(chamados.filter(chamado => chamado.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting chamado:', error);
      toast.error('Erro ao excluir chamado.');
      return false;
    }
  };

  // Load initial data
  useEffect(() => {
    fetchChamados();
  }, [user, encerrados]);

  return {
    chamados,
    loading,
    createChamado,
    updateChamado,
    finishChamado,
    reopenChamado,
    deleteChamado,
    refreshChamados: fetchChamados
  };
}
