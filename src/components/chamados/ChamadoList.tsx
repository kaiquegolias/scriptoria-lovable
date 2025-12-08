import React, { useState } from 'react';
import ChamadoCard, { Chamado } from './ChamadoCard';
import ChamadoForm from './ChamadoForm';
import ChamadoModal from './ChamadoModal';
import CloseTicketModal from './CloseTicketModal';
import { toast } from 'sonner';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useChamados } from '@/hooks/useChamados';

interface ChamadoListProps {
  encerrados?: boolean;
  onFinishChamado?: (chamado: Chamado) => void;
}

const ChamadoList: React.FC<ChamadoListProps> = ({ encerrados = false, onFinishChamado }) => {
  const { user } = useAuth();
  const { 
    chamados, 
    loading, 
    createChamado, 
    updateChamado, 
    finishChamado, 
    reopenChamado,
    deleteChamado
  } = useChamados(encerrados);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chamadoToEdit, setChamadoToEdit] = useState<Chamado | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstruturante, setFiltroEstruturante] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [chamadoToClose, setChamadoToClose] = useState<Chamado | null>(null);
  
  const chamadosFiltrados = chamados
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
    const chamado = chamados.find(c => c.id === id);
    if (chamado) {
      setChamadoToClose(chamado);
      setSelectedChamado(null); // Close detail modal if open
    }
  };

  const handleCloseTicketSuccess = () => {
    // Refresh chamados list
    setChamadoToClose(null);
    // The hook will refetch automatically
  };
  
  const handleReopenChamado = async (id: string) => {
    if (window.confirm('Deseja reabrir este chamado?')) {
      const updated = await reopenChamado(id);
      
      if (updated) {
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
  
  const handleSaveChamado = async (
    chamadoData: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'> & { id?: string }
  ) => {
    if (chamadoData.id) {
      const updated = await updateChamado(chamadoData.id, chamadoData);
      
      if (updated) {
        toast.success('Chamado atualizado com sucesso!');
      }
    } else {
      const created = await createChamado(chamadoData);
      
      if (created) {
        toast.success('Chamado criado com sucesso!');
      }
    }
    
    handleCloseForm();
  };
  
  const handleDeleteChamado = async (id: string, justification?: string) => {
    const deleted = await deleteChamado(id, justification);
    
    if (deleted) {
      if (selectedChamado && selectedChamado.id === id) {
        setSelectedChamado(null);
      }
    }
  };
  
  const estruturanteCount = chamados
    .reduce((acc, chamado) => {
      acc[chamado.estruturante] = (acc[chamado.estruturante] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  const statusCount = chamados
    .reduce((acc, chamado) => {
      acc[chamado.status] = (acc[chamado.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Você precisa estar logado para visualizar chamados.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg font-medium">Carregando chamados...</p>
      </div>
    );
  }
  
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
              onDelete={handleDeleteChamado}
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
          onDelete={handleDeleteChamado}
          onFinish={!encerrados ? handleFinishChamado : undefined}
          onReopen={encerrados ? handleReopenChamado : undefined}
        />
      )}

      <CloseTicketModal
        open={!!chamadoToClose}
        onOpenChange={(open) => !open && setChamadoToClose(null)}
        chamado={chamadoToClose}
        onSuccess={handleCloseTicketSuccess}
      />
    </div>
  );
};

export default ChamadoList;
