import React, { useState } from 'react';
import ChamadoCard, { Chamado } from './ChamadoCard';
import ChamadoForm from './ChamadoForm';
import ChamadoModal from './ChamadoModal';
import { toast } from 'sonner';
import { Plus, Search, Filter } from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { addBusinessDays } from 'date-fns';

interface ChamadoListProps {
  encerrados?: boolean;
  onFinishChamado?: (chamado: Chamado) => void;
}

const ChamadoList: React.FC<ChamadoListProps> = ({ encerrados = false, onFinishChamado }) => {
  const { user } = useAuth();
  const storageKey = `chamados-${user?.id || 'guest'}`;
  
  const [chamados, setChamados] = useLocalStorage<Chamado[]>(storageKey, []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chamadoToEdit, setChamadoToEdit] = useState<Chamado | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstruturante, setFiltroEstruturante] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  
  const chamadosFiltrados = chamados
    .filter(chamado => encerrados ? chamado.status === 'resolvido' : chamado.status !== 'resolvido')
    .filter(chamado => 
      chamado.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.acompanhamento.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(chamado => filtroEstruturante ? chamado.estruturante === filtroEstruturante : true)
    .filter(chamado => filtroStatus ? chamado.status === filtroStatus : true);
  
  const handleOpenForm = () => {
    setChamadoToEdit(undefined);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setChamadoToEdit(undefined);
  };
  
  const handleEditChamado = (chamado: Chamado) => {
    setChamadoToEdit(chamado);
    setIsFormOpen(true);
  };
  
  const handleFinishChamado = (id: string) => {
    if (window.confirm('Deseja finalizar este chamado?')) {
      const chamadoIndex = chamados.findIndex(c => c.id === id);
      if (chamadoIndex !== -1) {
        const updatedChamado = {
          ...chamados[chamadoIndex],
          status: 'resolvido' as const,
          dataAtualizacao: new Date().toISOString()
        };
        
        const newChamados = [...chamados];
        newChamados[chamadoIndex] = updatedChamado;
        
        setChamados(newChamados);
        
        if (onFinishChamado) {
          onFinishChamado(updatedChamado);
        }
        
        toast.success('Chamado finalizado com sucesso!');
      }
    }
  };
  
  const handleReopenChamado = (id: string) => {
    if (window.confirm('Deseja reabrir este chamado?')) {
      const chamadoIndex = chamados.findIndex(c => c.id === id);
      if (chamadoIndex !== -1) {
        const updatedChamado = {
          ...chamados[chamadoIndex],
          status: 'em_andamento' as const,
          dataAtualizacao: new Date().toISOString()
        };
        
        const newChamados = [...chamados];
        newChamados[chamadoIndex] = updatedChamado;
        
        setChamados(newChamados);
        toast.success('Chamado reaberto com sucesso!');
      }
    }
  };

  const handleViewDetails = (chamado: Chamado) => {
    setSelectedChamado(chamado);
  };

  const handleCloseModal = () => {
    setSelectedChamado(null);
  };
  
  const handleSaveChamado = (
    chamadoData: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'> & { id?: string }
  ) => {
    const now = new Date().toISOString();
    
    let dataLimite;
    if (chamadoData.status === 'agendados_aguardando') {
      dataLimite = addBusinessDays(new Date(), 3).toISOString();
    }
    
    if (chamadoData.id) {
      setChamados(
        chamados.map((chamado) =>
          chamado.id === chamadoData.id
            ? {
                ...chamado,
                ...chamadoData,
                dataAtualizacao: now,
                dataLimite: chamadoData.status === 'agendados_aguardando' 
                  ? (chamado.status === 'agendados_aguardando' ? chamado.dataLimite : dataLimite)
                  : undefined,
              }
            : chamado
        )
      );
      toast.success('Chamado atualizado com sucesso!');
    } else {
      const newChamado: Chamado = {
        id: Math.random().toString(36).substring(2),
        titulo: chamadoData.titulo,
        status: chamadoData.status,
        estruturante: chamadoData.estruturante,
        nivel: chamadoData.nivel,
        acompanhamento: chamadoData.acompanhamento,
        links: chamadoData.links,
        dataCriacao: now,
        dataAtualizacao: now,
        dataLimite: chamadoData.status === 'agendados_aguardando' ? dataLimite : undefined,
      };
      
      setChamados([newChamado, ...chamados]);
      toast.success('Chamado criado com sucesso!');
    }
    
    handleCloseForm();
  };
  
  const estruturanteCount = chamados
    .filter(chamado => encerrados ? chamado.status === 'resolvido' : chamado.status !== 'resolvido')
    .reduce((acc, chamado) => {
      acc[chamado.estruturante] = (acc[chamado.estruturante] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  const statusCount = chamados
    .filter(chamado => encerrados ? chamado.status === 'resolvido' : chamado.status !== 'resolvido')
    .reduce((acc, chamado) => {
      acc[chamado.status] = (acc[chamado.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-foreground/60" />
          </div>
          <input
            type="text"
            placeholder="Buscar chamados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
          />
        </div>
        
        {!encerrados && (
          <button
            onClick={handleOpenForm}
            className="px-4 py-2.5 rounded-lg bg-primary text-white flex items-center hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Novo Chamado
          </button>
        )}
      </div>
      
      <div className="glass p-4 rounded-xl mb-6">
        <div className="flex items-center mb-2">
          <Filter size={16} className="mr-2 text-foreground/60" />
          <h3 className="text-sm font-medium">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filtroEstruturante" className="block text-xs font-medium mb-1">
              Estruturante
            </label>
            <select
              id="filtroEstruturante"
              value={filtroEstruturante}
              onChange={(e) => setFiltroEstruturante(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            >
              <option value="">Todos</option>
              <option value="PNCP">PNCP ({estruturanteCount['PNCP'] || 0})</option>
              <option value="PEN">PEN ({estruturanteCount['PEN'] || 0})</option>
              <option value="Outros">Outros ({estruturanteCount['Outros'] || 0})</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="filtroStatus" className="block text-xs font-medium mb-1">
              Status
            </label>
            <select
              id="filtroStatus"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            >
              <option value="">Todos</option>
              {!encerrados && (
                <>
                  <option value="agendados">Agendados ({statusCount['agendados'] || 0})</option>
                  <option value="agendados_planner">Agendados PLANNER ({statusCount['agendados_planner'] || 0})</option>
                  <option value="agendados_aguardando">Aguardando devolutiva ({statusCount['agendados_aguardando'] || 0})</option>
                  <option value="em_andamento">Em Andamento ({statusCount['em_andamento'] || 0})</option>
                </>
              )}
              {encerrados && (
                <option value="resolvido">Resolvido ({statusCount['resolvido'] || 0})</option>
              )}
            </select>
          </div>
        </div>
      </div>
      
      {chamadosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm || filtroEstruturante || filtroStatus ? (
            <div>
              <p className="text-lg font-medium">Nenhum chamado encontrado</p>
              <p className="text-foreground/60 mt-1">
                Tente ajustar os filtros ou{' '}
                {!encerrados && (
                  <button
                    onClick={handleOpenForm}
                    className="text-primary hover:underline"
                  >
                    crie um novo chamado
                  </button>
                )}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">
                {encerrados ? 'Nenhum chamado encerrado' : 'Nenhum chamado em aberto'}
              </p>
              <p className="text-foreground/60 mt-1">
                {!encerrados && (
                  <>
                    Comece agora mesmo{' '}
                    <button
                      onClick={handleOpenForm}
                      className="text-primary hover:underline"
                    >
                      criando seu primeiro chamado
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chamadosFiltrados.map((chamado) => (
            <ChamadoCard
              key={chamado.id}
              chamado={chamado}
              onEdit={handleEditChamado}
              onFinish={!encerrados ? handleFinishChamado : undefined}
              onReopen={encerrados ? handleReopenChamado : undefined}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
      
      {isFormOpen && (
        <ChamadoForm
          onClose={handleCloseForm}
          onSave={handleSaveChamado}
          chamado={chamadoToEdit}
        />
      )}

      {selectedChamado && (
        <ChamadoModal 
          chamado={selectedChamado} 
          onClose={handleCloseModal}
          onEdit={handleEditChamado}
          onFinish={!encerrados ? handleFinishChamado : undefined}
          onReopen={encerrados ? handleReopenChamado : undefined}
        />
      )}
    </div>
  );
};

export default ChamadoList;
