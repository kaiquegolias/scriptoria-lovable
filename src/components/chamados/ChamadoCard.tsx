import React, { useState, useEffect } from 'react';
import { Edit, ExternalLink, CheckCircle, AlertCircle, Calendar, RefreshCw, Trash2, MessageCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import DeleteTicketModal from './DeleteTicketModal';
import { supabase } from '@/integrations/supabase/client';

export interface Chamado {
  id: string;
  titulo: string;
  status: 'agendados' | 'agendados_planner' | 'agendados_aguardando' | 'em_andamento' | 'resolvido' | 'excluido';
  estruturante: 'PNCP' | 'PEN' | 'Outros';
  nivel: 'N1' | 'N2' | 'N3';
  acompanhamento: string;
  links: string[];
  dataCriacao: string;
  dataAtualizacao: string;
  dataLimite?: string;
  assunto?: string;
  penProduto?: string;
  penModulo?: string;
  penPo?: string;
  penPoSubstituto?: string;
  penRepresentanteTecnico?: string;
  // MEXX import fields
  numeroChamado?: string;
  usuarioNome?: string;
  usuarioEmail?: string;
  usuarioTelefone?: string;
  usuarioCpf?: string;
  prioridade?: string;
  categoria?: string;
  orgao?: string;
  temAnexo?: boolean;
  descricaoCompleta?: string;
  slaAtendimento?: string;
  slaSolucao?: string;
  previsaoSolucao?: string | null;
  timeAtendimento?: string;
  tipoChamado?: string;
  responsavel?: string;
  dataAberturaPortal?: string | null;
  camposPersonalizados?: Record<string, string>;
}

interface ChamadoCardProps {
  chamado: Chamado;
  onEdit: (chamado: Chamado) => void;
  onDelete: (id: string, justification?: string) => Promise<void> | void;
  onFinish?: (id: string) => void;
  onReopen?: (id: string) => void;
  onViewDetails?: (chamado: Chamado) => void;
}

interface LastObservation {
  content: string;
  createdAt: string;
  userName: string;
}

const ChamadoCard: React.FC<ChamadoCardProps> = ({ 
  chamado, 
  onEdit, 
  onDelete,
  onFinish, 
  onReopen,
  onViewDetails
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lastObservation, setLastObservation] = useState<LastObservation | null>(null);

  // Fetch last observation for this ticket
  useEffect(() => {
    const fetchLastObservation = async () => {
      try {
        const { data, error } = await supabase
          .from('ticket_followups')
          .select('content, created_at, created_by')
          .eq('ticket_id', chamado.id)
          .eq('type', 'observation')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) return;

        // Get user name
        let userName = 'Usuário';
        if (data.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome')
            .eq('user_id', data.created_by)
            .maybeSingle();
          
          if (profile?.nome) {
            userName = profile.nome;
          }
        }

        setLastObservation({
          content: data.content || '',
          createdAt: data.created_at,
          userName
        });
      } catch (err) {
        console.error('Error fetching last observation:', err);
      }
    };

    fetchLastObservation();
  }, [chamado.id, chamado.dataAtualizacao]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendados': return 'bg-blue-500';
      case 'agendados_planner': return 'bg-purple-500';
      case 'agendados_aguardando':
        if (chamado.dataLimite && isAfter(new Date(), new Date(chamado.dataLimite))) return 'bg-red-600';
        return 'bg-yellow-500';
      case 'em_andamento': return 'bg-orange-500';
      case 'resolvido': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'agendados': return 'from-blue-500/15 to-blue-500/0';
      case 'agendados_planner': return 'from-purple-500/15 to-purple-500/0';
      case 'agendados_aguardando':
        if (chamado.dataLimite && isAfter(new Date(), new Date(chamado.dataLimite))) return 'from-red-500/20 to-red-500/0';
        return 'from-yellow-500/15 to-yellow-500/0';
      case 'em_andamento': return 'from-orange-500/15 to-orange-500/0';
      case 'resolvido': return 'from-emerald-500/15 to-emerald-500/0';
      default: return 'from-gray-500/10 to-gray-500/0';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'agendados': return 'Agendados';
      case 'agendados_planner': return 'Agendados PLANNER';
      case 'agendados_aguardando': return 'Aguardando devolutiva';
      case 'em_andamento': return 'Em Andamento';
      case 'resolvido': return 'Resolvido';
      default: return status;
    }
  };

  const getEstruturanteBg = (estruturante: string) => {
    switch (estruturante) {
      case 'PNCP': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'PEN': return 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getNivelBg = (nivel: string) => {
    switch (nivel) {
      case 'N3': return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      case 'N2': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'N1': return 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isCardDelayed = chamado.status === 'agendados_aguardando' &&
                        chamado.dataLimite &&
                        isAfter(new Date(), new Date(chamado.dataLimite));

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-xl hover:border-primary/30 cursor-pointer transition-all ${isCardDelayed ? 'ring-1 ring-red-500/40' : ''}`}
      whileHover={{ y: -2 }}
      onClick={() => onViewDetails && onViewDetails(chamado)}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${getStatusColor(chamado.status)}`} />
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${getStatusGradient(chamado.status)} blur-2xl pointer-events-none`} />

      <div className="relative flex justify-between items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          {chamado.numeroChamado && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Nº {chamado.numeroChamado}
            </div>
          )}
          <h3 className="text-base font-semibold leading-snug line-clamp-2">{chamado.titulo}</h3>
        </div>
        <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(chamado); }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Editar"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
            className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
            aria-label="Excluir"
          >
            <Trash2 size={15} />
          </button>
          {onFinish && chamado.status !== 'resolvido' && (
            <button
              onClick={(e) => { e.stopPropagation(); onFinish(chamado.id); }}
              className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
              aria-label="Finalizar chamado"
            >
              <CheckCircle size={15} />
            </button>
          )}
          {onReopen && chamado.status === 'resolvido' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReopen(chamado.id); }}
              className="p-1.5 rounded-lg hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950 transition-colors"
              aria-label="Reabrir chamado"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-wrap gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${getEstruturanteBg(chamado.estruturante)}`}>
          {chamado.estruturante}
        </span>
        <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${getNivelBg(chamado.nivel)}`}>
          {chamado.nivel}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(chamado.status)}`} />
          {getStatusText(chamado.status)}
        </span>
        {chamado.assunto && (
          <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {chamado.assunto}
          </span>
        )}
      </div>

      {/* PEN Product Details */}
      {chamado.estruturante === 'PEN' && chamado.penProduto && (
        <div className="mb-4 p-3 bg-estruturante-pen/10 rounded-lg border border-estruturante-pen/20">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-estruturante-pen" />
            <h4 className="text-xs font-medium uppercase text-estruturante-pen">
              Detalhes PEN
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Produto:</span>
              <span className="ml-1 font-medium">{chamado.penProduto}</span>
            </div>
            {chamado.penModulo && (
              <div>
                <span className="text-muted-foreground">Módulo:</span>
                <span className="ml-1 font-medium">{chamado.penModulo}</span>
              </div>
            )}
            {chamado.penPo && (
              <div>
                <span className="text-muted-foreground">PO:</span>
                <span className="ml-1 font-medium">{chamado.penPo}</span>
              </div>
            )}
            {chamado.penRepresentanteTecnico && chamado.penRepresentanteTecnico !== '-' && (
              <div>
                <span className="text-muted-foreground">Rep. Técnico:</span>
                <span className="ml-1 font-medium">{chamado.penRepresentanteTecnico}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <h4 className="text-xs font-medium uppercase text-foreground/60 mb-1">
          Acompanhamento
        </h4>
        <p className="text-sm text-foreground/80 line-clamp-2 bg-white/50 p-2 rounded">{chamado.acompanhamento}</p>
      </div>

      {/* Última Observação */}
      {lastObservation && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle size={14} className="text-blue-600" />
            <h4 className="text-xs font-medium uppercase text-blue-700 dark:text-blue-300">
              Última Observação
            </h4>
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2">{lastObservation.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {lastObservation.userName} • {format(new Date(lastObservation.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      )}
      
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
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} className="mr-1" />
                Link {index + 1}
              </a>
            ))}
          </div>
        </div>
      )}
      
      {chamado.status === 'agendados_aguardando' && chamado.dataLimite && (
        <div className={`mb-4 p-2 rounded-md flex items-center ${isCardDelayed ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <Calendar size={14} className={isCardDelayed ? 'text-red-600 mr-2' : 'text-yellow-600 mr-2'} />
          <div>
            <span className="text-xs font-medium">
              {isCardDelayed ? 'ATRASADO - Prazo expirado em: ' : 'Aguardando até: '}
            </span>
            <span className="text-xs">
              {format(new Date(chamado.dataLimite), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      )}
      
      <div className="text-xs text-foreground/60 mt-2">
        Atualizado em {new Date(chamado.dataAtualizacao).toLocaleDateString('pt-BR')}
      </div>

      {showDeleteModal && (
        <DeleteTicketModal
          ticketId={chamado.id}
          ticketTitle={chamado.titulo}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async (ticketId, justification) => {
            await onDelete(ticketId, justification);
            setShowDeleteModal(false);
          }}
        />
      )}
    </motion.div>
  );
};

export default ChamadoCard;
