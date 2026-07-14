
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { addBusinessHours } from '@/utils/businessHours';
import { ptBR } from 'date-fns/locale';

const mapRowToChamado = (item: any): Chamado => ({
  id: item.id,
  titulo: item.titulo,
  status: item.status as Chamado['status'],
  estruturante: item.estruturante as 'PNCP' | 'PEN' | 'Outros',
  nivel: item.nivel as 'N1' | 'N2' | 'N3',
  acompanhamento: item.acompanhamento,
  links: item.links || [],
  dataCriacao: item.data_criacao,
  dataAtualizacao: item.data_atualizacao,
  dataLimite: item.data_limite,
  assunto: item.assunto || undefined,
  penProduto: item.pen_produto || undefined,
  penModulo: item.pen_modulo || undefined,
  penPo: item.pen_po || undefined,
  penPoSubstituto: item.pen_po_substituto || undefined,
  penRepresentanteTecnico: item.pen_representante_tecnico || undefined,
  numeroChamado: item.numero_chamado || undefined,
  usuarioNome: item.usuario_nome || undefined,
  usuarioEmail: item.usuario_email || undefined,
  usuarioTelefone: item.usuario_telefone || undefined,
  usuarioCpf: item.usuario_cpf || undefined,
  prioridade: item.prioridade || undefined,
  categoria: item.categoria || undefined,
  orgao: item.orgao || undefined,
  temAnexo: item.tem_anexo ?? undefined,
  descricaoCompleta: item.descricao_completa || undefined,
  slaAtendimento: item.sla_atendimento || undefined,
  slaSolucao: item.sla_solucao || undefined,
  previsaoSolucao: item.previsao_solucao || null,
  timeAtendimento: item.time_atendimento || undefined,
  tipoChamado: item.tipo_chamado || undefined,
  responsavel: item.responsavel || undefined,
  dataAberturaPortal: item.data_abertura_portal || null,
  camposPersonalizados: item.campos_personalizados || {},
});

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
        const formattedChamados: Chamado[] = data.map(mapRowToChamado);
        if (encerrados) {
          setChamados(formattedChamados.filter(c => c.status === 'resolvido'));
        } else {
          setChamados(formattedChamados.filter(c => c.status !== 'resolvido' && c.status !== 'excluido'));
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
        // 72 horas úteis (Seg-Sex 09:00-18:00)
        dataLimite = addBusinessHours(new Date(), 72).toISOString();
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
            data_limite: dataLimite || chamadoData.dataLimite,
            assunto: chamadoData.assunto || null,
            pen_produto: chamadoData.penProduto || null,
            pen_modulo: chamadoData.penModulo || null,
            pen_po: chamadoData.penPo || null,
            pen_po_substituto: chamadoData.penPoSubstituto || null,
            pen_representante_tecnico: chamadoData.penRepresentanteTecnico || null,
            numero_chamado: (chamadoData as any).numeroChamado || null,
            usuario_nome: (chamadoData as any).usuarioNome || null,
            usuario_email: (chamadoData as any).usuarioEmail || null,
            usuario_telefone: (chamadoData as any).usuarioTelefone || null,
            usuario_cpf: (chamadoData as any).usuarioCpf || null,
            prioridade: (chamadoData as any).prioridade || null,
            categoria: (chamadoData as any).categoria || null,
            orgao: (chamadoData as any).orgao || null,
            tem_anexo: (chamadoData as any).temAnexo ?? false,
            descricao_completa: (chamadoData as any).descricaoCompleta || null,
            sla_atendimento: (chamadoData as any).slaAtendimento || null,
            sla_solucao: (chamadoData as any).slaSolucao || null,
            previsao_solucao: (chamadoData as any).previsaoSolucao || null,
            time_atendimento: (chamadoData as any).timeAtendimento || null,
            tipo_chamado: (chamadoData as any).tipoChamado || null,
            responsavel: (chamadoData as any).responsavel || null,
            data_abertura_portal: (chamadoData as any).dataAberturaPortal || null,
            campos_personalizados: (chamadoData as any).camposPersonalizados || {},
          }
        ])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const newChamado: Chamado = mapRowToChamado(data);

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
        dataLimite = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (chamadoData.status !== 'agendados_aguardando') {
        // If status is not 'agendados_aguardando' anymore, remove the deadline
        dataLimite = null;
      }

      const c = chamadoData as any;
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
          data_limite: dataLimite,
          assunto: chamadoData.assunto || null,
          pen_produto: chamadoData.penProduto || null,
          pen_modulo: chamadoData.penModulo || null,
          pen_po: chamadoData.penPo || null,
          pen_po_substituto: chamadoData.penPoSubstituto || null,
          pen_representante_tecnico: chamadoData.penRepresentanteTecnico || null,
          numero_chamado: c.numeroChamado ?? null,
          usuario_nome: c.usuarioNome ?? null,
          usuario_email: c.usuarioEmail ?? null,
          usuario_telefone: c.usuarioTelefone ?? null,
          usuario_cpf: c.usuarioCpf ?? null,
          prioridade: c.prioridade ?? null,
          categoria: c.categoria ?? null,
          orgao: c.orgao ?? null,
          tem_anexo: c.temAnexo ?? false,
          descricao_completa: c.descricaoCompleta ?? null,
          sla_atendimento: c.slaAtendimento ?? null,
          sla_solucao: c.slaSolucao ?? null,
          previsao_solucao: c.previsaoSolucao ?? null,
          time_atendimento: c.timeAtendimento ?? null,
          tipo_chamado: c.tipoChamado ?? null,
          responsavel: c.responsavel ?? null,
          data_abertura_portal: c.dataAberturaPortal ?? null,
          campos_personalizados: c.camposPersonalizados ?? {},
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const updatedChamado: Chamado = mapRowToChamado(data);

        if ((encerrados && updatedChamado.status === 'resolvido') ||
            (!encerrados && updatedChamado.status !== 'resolvido')) {
          setChamados(chamados.map(chamado => chamado.id === id ? updatedChamado : chamado));
        } else {
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
          dataLimite: null,
          assunto: data.assunto || undefined,
          penProduto: data.pen_produto || undefined,
          penModulo: data.pen_modulo || undefined,
          penPo: data.pen_po || undefined,
          penPoSubstituto: data.pen_po_substituto || undefined,
          penRepresentanteTecnico: data.pen_representante_tecnico || undefined
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
      // First, get the current chamado data including classificacao
      const { data: currentChamado, error: fetchError } = await supabase
        .from('chamados')
        .select('classificacao, data_atualizacao')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Get the ultimo_acompanhamento if exists
      const { data: ultimoAcomp } = await supabase
        .from('ticket_followups')
        .select('content, created_at')
        .eq('ticket_id', id)
        .eq('type', 'ultimo_acompanhamento')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Build the reopen observation message
      const closedDate = currentChamado?.data_atualizacao 
        ? format(new Date(currentChamado.data_atualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : 'data desconhecida';
      
      const classificacao = currentChamado?.classificacao || 'não especificado';
      
      let reopenObservation = `🔄 Chamado reaberto. Anteriormente encerrado em ${closedDate} com classificação: "${classificacao}".`;
      
      if (ultimoAcomp?.content) {
        reopenObservation += `\n\n📝 Último acompanhamento anterior:\n${ultimoAcomp.content}`;
      }

      // Insert the reopen observation
      await supabase
        .from('ticket_followups')
        .insert({
          ticket_id: id,
          type: 'observation',
          content: reopenObservation,
          created_by: user.id,
        });

      // Update the chamado status
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
          dataLimite: data.data_limite,
          assunto: data.assunto || undefined,
          penProduto: data.pen_produto || undefined,
          penModulo: data.pen_modulo || undefined,
          penPo: data.pen_po || undefined,
          penPoSubstituto: data.pen_po_substituto || undefined,
          penRepresentanteTecnico: data.pen_representante_tecnico || undefined
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

  // Delete a chamado (soft delete - changes status to 'excluido')
  const deleteChamado = async (id: string, justification?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para excluir chamados.');
      return false;
    }

    try {
      // Get chamado data before soft-delete for logging
      const { data: chamadoData } = await supabase
        .from('chamados')
        .select('*')
        .eq('id', id)
        .single();

      // Soft delete: update status to 'excluido'
      const { error } = await supabase
        .from('chamados')
        .update({
          status: 'excluido',
          motivo_exclusao: justification || 'Não informada',
          data_exclusao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Remove from kb_vectors (biblioteca)
      await supabase
        .from('kb_vectors')
        .delete()
        .eq('source_id', id)
        .eq('source_type', 'ticket');

      // Log deletion in system_logs for supervisor
      await supabase
        .from('system_logs')
        .insert({
          user_id: user.id,
          user_email: user.email,
          event_type: 'chamado_deleted',
          severity: 'warning',
          message: `Chamado excluído: ${chamadoData?.titulo || id}`,
          origin: 'chamados',
          entity_type: 'chamado',
          entity_id: id,
          payload: {
            chamado: chamadoData,
            justification: justification || 'Não informada',
            deleted_at: new Date().toISOString()
          }
        });

      // Log in audit_log for detailed audit trail
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          user_email: user.email,
          action: 'chamado_deleted',
          entity_type: 'chamado',
          entity_id: id,
          old_data: chamadoData,
          new_data: { status: 'excluido', motivo_exclusao: justification },
          metadata: {
            justification: justification || 'Não informada',
            deleted_at: new Date().toISOString()
          }
        });

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
