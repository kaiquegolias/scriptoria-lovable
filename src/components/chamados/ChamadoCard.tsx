
import React from 'react';
import { Edit, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface Chamado {
  id: string;
  titulo: string;
  status: 'aberto' | 'em_andamento' | 'pendente' | 'resolvido';
  estruturante: 'PNCP' | 'PEN' | 'Outros';
  nivel: 'N1' | 'N2' | 'N3';
  acompanhamento: string;
  links: string[];
  dataCriacao: string;
  dataAtualizacao: string;
}

interface ChamadoCardProps {
  chamado: Chamado;
  onEdit: (chamado: Chamado) => void;
  onFinish?: (id: string) => void;
}

const ChamadoCard: React.FC<ChamadoCardProps> = ({ chamado, onEdit, onFinish }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-status-info';
      case 'em_andamento':
        return 'bg-status-warning';
      case 'pendente':
        return 'bg-gray-400';
      case 'resolvido':
        return 'bg-status-success';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'Aberto';
      case 'em_andamento':
        return 'Em Andamento';
      case 'pendente':
        return 'Pendente';
      case 'resolvido':
        return 'Resolvido';
      default:
        return status;
    }
  };

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

  return (
    <div className="glass p-6 rounded-xl shadow-sm hover-lift">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(chamado.status)}`}></div>
          <h3 className="text-lg font-semibold line-clamp-1">{chamado.titulo}</h3>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onEdit(chamado)}
            className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Editar"
          >
            <Edit size={16} />
          </button>
          {onFinish && chamado.status !== 'resolvido' && (
            <button
              onClick={() => onFinish(chamado.id)}
              className="p-1.5 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
              aria-label="Finalizar chamado"
            >
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getEstruturanteBg(chamado.estruturante)}`}>
          {chamado.estruturante}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getNivelBg(chamado.nivel)}`}>
          {chamado.nivel}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100`}>
          {getStatusText(chamado.status)}
        </span>
      </div>
      
      <div className="mb-4">
        <h4 className="text-xs font-medium uppercase text-foreground/60 mb-1">
          Acompanhamento
        </h4>
        <p className="text-sm text-foreground/80 line-clamp-2 bg-white/50 p-2 rounded">{chamado.acompanhamento}</p>
      </div>
      
      {chamado.links.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium uppercase text-foreground/60 mb-1">
            Links
          </h4>
          <div className="flex flex-wrap gap-2">
            {chamado.links.map((link, index) => (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink size={10} className="mr-1" />
                Link {index + 1}
              </a>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-xs text-foreground/60 mt-2">
        Atualizado em {new Date(chamado.dataAtualizacao).toLocaleDateString('pt-BR')}
      </div>
    </div>
  );
};

export default ChamadoCard;
