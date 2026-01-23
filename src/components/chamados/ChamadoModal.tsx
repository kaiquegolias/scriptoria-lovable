import React, { useState, useEffect } from 'react';
import { Chamado } from './ChamadoCard';
import { X, Edit, CheckCircle, RefreshCw, ExternalLink, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import SuggestionPanel from './SuggestionPanel';
import TicketObservations from './TicketObservations';
import DeleteTicketModal from './DeleteTicketModal';
import { supabase } from '@/integrations/supabase/client';

interface ChamadoModalProps {
  chamado: Chamado;
  onClose: () => void;
  onEdit?: (chamado: Chamado) => void;
  onDelete?: (id: string, justification: string) => Promise<void>;
  onFinish?: (id: string) => void;
  onReopen?: (id: string) => void;
}

const ChamadoModal: React.FC<ChamadoModalProps> = ({ 
  chamado, 
  onClose, 
  onEdit, 
  onDelete,
  onFinish,
  onReopen 
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ultimoAcompanhamento, setUltimoAcompanhamento] = useState<{
    content: string;
    createdAt: string;
    userName: string;
    classificacao?: string;
  } | null>(null);

  // Fetch ultimo_acompanhamento for resolved tickets
  useEffect(() => {
    const fetchUltimoAcompanhamento = async () => {
      if (chamado.status !== 'resolvido') {
        setUltimoAcompanhamento(null);
        return;
      }

      try {
        // Get ultimo_acompanhamento
        const { data: followupData } = await supabase
          .from('ticket_followups')
          .select('content, created_at, created_by')
          .eq('ticket_id', chamado.id)
          .eq('type', 'ultimo_acompanhamento')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get classificacao from chamados table
        const { data: chamadoData } = await supabase
          .from('chamados')
          .select('classificacao')
          .eq('id', chamado.id)
          .single();

        // Get user name if we have followup data
        let userName = 'Usuário';
        if (followupData?.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome')
            .eq('user_id', followupData.created_by)
            .maybeSingle();
          
          if (profile?.nome) {
            userName = profile.nome;
          }
        }

        // Set ultimo acompanhamento only if we have content or classificacao
        if (followupData || chamadoData?.classificacao) {
          setUltimoAcompanhamento({
            content: followupData?.content || '',
            createdAt: followupData?.created_at || chamado.dataAtualizacao,
            userName,
            classificacao: chamadoData?.classificacao || undefined
          });
        }
      } catch (err) {
        console.error('Error fetching ultimo_acompanhamento:', err);
      }
    };

    fetchUltimoAcompanhamento();
  }, [chamado.id, chamado.status, chamado.dataAtualizacao]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(chamado);
      onClose();
    }
  };

  const handleFinish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFinish) {
      onFinish(chamado.id);
      onClose();
    }
  };

  const handleReopen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReopen) {
      onReopen(chamado.id);
      onClose();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (ticketId: string, justification: string) => {
    if (onDelete) {
      await onDelete(ticketId, justification);
      onClose();
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'agendados':
        return 'Agendados';
      case 'agendados_planner':
        return 'Agendados PLANNER';
      case 'agendados_aguardando':
        return 'Aguardando devolutiva';
      case 'em_andamento':
        return 'Em Andamento';
      case 'resolvido':
        return 'Resolvido';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendados':
        return 'bg-blue-500 text-white';
      case 'agendados_planner':
        return 'bg-purple-500 text-white';
      case 'agendados_aguardando':
        if (chamado.dataLimite && isAfter(new Date(), new Date(chamado.dataLimite))) {
          return 'bg-red-600 text-white';
        }
        return 'bg-yellow-500 text-white';
      case 'em_andamento':
        return 'bg-orange-500 text-white';
      case 'resolvido':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const isCardDelayed = chamado.status === 'agendados_aguardando' && 
                        chamado.dataLimite && 
                        isAfter(new Date(), new Date(chamado.dataLimite));

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content p-0"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`p-6 rounded-t-xl ${getStatusColor(chamado.status)}`}>
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold">{chamado.titulo}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span>Status: {getStatusText(chamado.status)}</span>
              {chamado.status === 'agendados_aguardando' && chamado.dataLimite && (
                <div className="ml-4 flex items-center">
                  {isCardDelayed ? (
                    <AlertCircle size={16} className="mr-1" />
                  ) : (
                    <Calendar size={16} className="mr-1" />
                  )}
                  <span>
                    {isCardDelayed ? 'ATRASADO - Prazo expirado' : 'Aguardando devolutiva até'}:&nbsp;
                    {format(new Date(chamado.dataLimite), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Estruturante</h3>
                <p className="text-lg">{chamado.estruturante}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Nível</h3>
                <p className="text-lg">{chamado.nivel}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Acompanhamento</h3>
              <div className="p-4 bg-secondary rounded-lg whitespace-pre-wrap">
                {chamado.acompanhamento}
              </div>
            </div>

            {chamado.links.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Links</h3>
                <div className="flex flex-wrap gap-2">
                  {chamado.links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink size={14} className="mr-2" />
                      Link {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-semibold">Criado em:</span>{' '}
                {format(new Date(chamado.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              <div>
                <span className="font-semibold">Atualizado em:</span>{' '}
                {format(new Date(chamado.dataAtualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>

            {/* Encerramento info - for resolved tickets */}
            {ultimoAcompanhamento && chamado.status === 'resolvido' && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Informações do Encerramento
                  </h3>
                </div>
                {ultimoAcompanhamento.classificacao && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Classificação:</span>
                    <span className="px-3 py-1 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium text-sm">
                      {ultimoAcompanhamento.classificacao}
                    </span>
                  </div>
                )}
                {ultimoAcompanhamento.content && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Último Acompanhamento:</span>
                    <div className="p-3 bg-white dark:bg-background rounded border whitespace-pre-wrap text-sm">
                      {ultimoAcompanhamento.content}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Encerrado por {ultimoAcompanhamento.userName} em {format(new Date(ultimoAcompanhamento.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}

            {/* Observations section */}
            <div className="mt-6">
              <TicketObservations ticketId={chamado.id} />
            </div>

            {/* Suggestion Panel - only for non-resolved tickets */}
            {chamado.status !== 'resolvido' && (
              <div className="mt-6">
                <SuggestionPanel ticketId={chamado.id} />
              </div>
            )}
          </div>

          <div className="p-4 bg-secondary/50 rounded-b-xl border-t flex justify-end gap-2">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-md bg-secondary text-foreground hover:bg-secondary/80 flex items-center transition-colors"
              >
                <Edit size={16} className="mr-2" />
                Editar
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 flex items-center transition-colors"
              >
                <Trash2 size={16} className="mr-2" />
                Excluir
              </button>
            )}
            
            {onFinish && chamado.status !== 'resolvido' && (
              <button
                onClick={handleFinish}
                className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 flex items-center transition-colors"
              >
                <CheckCircle size={16} className="mr-2" />
                Finalizar
              </button>
            )}
            
            {onReopen && chamado.status === 'resolvido' && (
              <button
                onClick={handleReopen}
                className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 flex items-center transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                Reabrir
              </button>
            )}
          </div>
        </motion.div>

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <DeleteTicketModal
            ticketId={chamado.id}
            ticketTitle={chamado.titulo}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    </AnimatePresence>
  );
};

export default ChamadoModal;
