import React from 'react';
import { Chamado } from './ChamadoCard';
import { X, Edit, CheckCircle, RefreshCw, ExternalLink, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface ChamadoModalProps {
  chamado: Chamado;
  onClose: () => void;
  onEdit?: (chamado: Chamado) => void;
  onDelete?: (id: string) => void;
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Tem certeza que deseja excluir este chamado?')) {
      onDelete(chamado.id);
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
                onClick={handleDelete}
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
      </div>
    </AnimatePresence>
  );
};

export default ChamadoModal;
