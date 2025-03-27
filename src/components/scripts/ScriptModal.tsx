
import React from 'react';
import { Script } from './ScriptCard';
import { X, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generatePDF } from '@/utils/pdfUtils';

interface ScriptModalProps {
  script: Script;
  onClose: () => void;
  onEdit?: (script: Script) => void;
  onDelete?: (id: string) => void;
}

const ScriptModal: React.FC<ScriptModalProps> = ({ 
  script, 
  onClose, 
  onEdit, 
  onDelete
}) => {
  // Manipuladores de eventos com prevenção de propagação
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(script);
      onClose();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Tem certeza que deseja excluir este script?')) {
      onDelete(script.id);
      onClose();
    }
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(script.modelo)
      .then(() => {
        toast.success('Script copiado para a área de transferência!');
      })
      .catch(() => {
        toast.error('Erro ao copiar o script');
      });
  };

  const handleExportPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    generatePDF(script);
    toast.success('PDF gerado com sucesso!');
  };

  const getEstruturanteColor = (estruturante: string) => {
    switch (estruturante) {
      case 'PNCP':
        return 'bg-estruturante-pncp text-white';
      case 'PEN':
        return 'bg-estruturante-pen text-white';
      default:
        return 'bg-estruturante-other text-white';
    }
  };

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
          {/* Cabeçalho */}
          <div className={`p-6 rounded-t-xl ${getEstruturanteColor(script.estruturante)}`}>
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold">{script.nome}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-sm">{script.estruturante}</span>
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-sm">{script.nivel}</span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Situação de Uso</h3>
              <div className="p-4 bg-secondary rounded-lg">
                {script.situacao}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Modelo de Resposta</h3>
              <div className="p-4 bg-secondary rounded-lg whitespace-pre-wrap">
                {script.modelo}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-semibold">Criado em:</span>{' '}
                {format(new Date(script.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              <div>
                <span className="font-semibold">Atualizado em:</span>{' '}
                {format(new Date(script.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          </div>

          {/* Rodapé com ações */}
          <div className="p-4 bg-secondary/50 rounded-b-xl border-t flex justify-between">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 flex items-center transition-colors"
              >
                <Trash2 size={16} className="mr-2" />
                Excluir
              </button>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 flex items-center transition-colors"
              >
                <FileText size={16} className="mr-2" />
                Exportar PDF
              </button>
              
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 rounded-md bg-secondary text-foreground hover:bg-secondary/80 flex items-center transition-colors"
              >
                <Copy size={16} className="mr-2" />
                Copiar
              </button>
              
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center transition-colors"
                >
                  <Edit size={16} className="mr-2" />
                  Editar
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScriptModal;
