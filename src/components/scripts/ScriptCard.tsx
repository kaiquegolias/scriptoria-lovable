
import React from 'react';
import { Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export interface Script {
  id: string;
  nome: string;
  estruturante: 'PNCP' | 'PEN' | 'Outros';
  nivel: 'N1' | 'N2' | 'N3';
  situacao: string;
  modelo: string;
  createdAt: string;
  updatedAt: string;
}

interface ScriptCardProps {
  script: Script;
  onEdit: (script: Script) => void;
  onDelete: (id: string) => void;
}

const ScriptCard: React.FC<ScriptCardProps> = ({ script, onEdit, onDelete }) => {
  const getEstruturanteBg = (estruturante: string) => {
    switch (estruturante) {
      case 'PNCP':
        return 'bg-estruturante-pncp/20 text-estruturante-pncp';
      case 'PEN':
        return 'bg-estruturante-pen/20 text-estruturante-pen';
      default:
        return 'bg-estruturante-other/20 text-estruturante-other';
    }
  };

  const getNivelBg = (nivel: string) => {
    switch (nivel) {
      case 'N3':
        return 'bg-status-error/20 text-status-error';
      case 'N2':
        return 'bg-status-warning/20 text-status-warning';
      case 'N1':
        return 'bg-status-info/20 text-status-info';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script.modelo)
      .then(() => {
        toast.success('Script copiado para a área de transferência!');
      })
      .catch(() => {
        toast.error('Erro ao copiar o script');
      });
  };

  return (
    <div className="glass p-6 rounded-xl shadow-sm hover-lift">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold line-clamp-1">{script.nome}</h3>
        <div className="flex space-x-1">
          <button
            onClick={() => onEdit(script)}
            className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Editar"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(script.id)}
            className="p-1.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
            aria-label="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getEstruturanteBg(script.estruturante)}`}>
          {script.estruturante}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getNivelBg(script.nivel)}`}>
          {script.nivel}
        </span>
      </div>
      
      <div className="mb-4">
        <h4 className="text-xs font-medium uppercase text-foreground/60 mb-1">
          Situação de Uso
        </h4>
        <p className="text-sm text-foreground/80 line-clamp-2">{script.situacao}</p>
      </div>
      
      <div className="mb-4">
        <h4 className="text-xs font-medium uppercase text-foreground/60 mb-1">
          Modelo de Resposta
        </h4>
        <p className="text-sm text-foreground/80 line-clamp-3 bg-white/50 p-2 rounded">
          {script.modelo}
        </p>
      </div>
      
      <div className="flex justify-between items-center pt-2 mt-auto">
        <div className="text-xs text-foreground/60">
          Atualizado em {new Date(script.updatedAt).toLocaleDateString('pt-BR')}
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Copy size={12} className="mr-1.5" />
          Copiar
        </button>
      </div>
    </div>
  );
};

export default ScriptCard;
