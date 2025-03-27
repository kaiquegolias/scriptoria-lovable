
import React, { useState } from 'react';
import ScriptCard, { Script } from './ScriptCard';
import ScriptForm from './ScriptForm';
import ScriptModal from './ScriptModal';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useScripts } from '@/hooks/useScripts';

const ScriptList = () => {
  const { user } = useAuth();
  const { scripts, loading, createScript, updateScript, deleteScript } = useScripts();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [scriptToEdit, setScriptToEdit] = useState<Script | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  
  const filteredScripts = scripts.filter(
    (script) =>
      script.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.situacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleOpenForm = () => {
    setScriptToEdit(undefined);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setScriptToEdit(undefined);
  };
  
  const handleEditScript = (script: Script) => {
    setScriptToEdit(script);
    setIsFormOpen(true);
  };
  
  const handleDeleteScript = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este script?')) {
      const success = await deleteScript(id);
      if (success) {
        toast.success('Script excluído com sucesso!');
      }
    }
  };

  const handleViewDetails = (script: Script) => {
    setSelectedScript(script);
  };

  const handleCloseModal = () => {
    setSelectedScript(null);
  };
  
  const handleSaveScript = async (
    scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    if (scriptData.id) {
      // Atualizar script existente
      const updated = await updateScript(scriptData.id, scriptData);
      if (updated) {
        toast.success('Script atualizado com sucesso!');
      }
    } else {
      // Criar novo script
      const created = await createScript(scriptData);
      if (created) {
        toast.success('Script criado com sucesso!');
      }
    }
    
    handleCloseForm();
  };
  
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Você precisa estar logado para visualizar scripts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg font-medium">Carregando scripts...</p>
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
            placeholder="Buscar scripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
          />
        </div>
        
        <button
          onClick={handleOpenForm}
          className="px-4 py-2.5 rounded-lg bg-primary text-white flex items-center hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Novo Script
        </button>
      </div>
      
      {filteredScripts.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm ? (
            <div>
              <p className="text-lg font-medium">Nenhum script encontrado</p>
              <p className="text-foreground/60 mt-1">
                Tente buscar por outro termo ou{' '}
                <button
                  onClick={handleOpenForm}
                  className="text-primary hover:underline"
                >
                  crie um novo script
                </button>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">Nenhum script cadastrado</p>
              <p className="text-foreground/60 mt-1">
                Comece agora mesmo{' '}
                <button
                  onClick={handleOpenForm}
                  className="text-primary hover:underline"
                >
                  criando seu primeiro script
                </button>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onEdit={handleEditScript}
              onDelete={handleDeleteScript}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
      
      {isFormOpen && (
        <ScriptForm
          onClose={handleCloseForm}
          onSave={handleSaveScript}
          script={scriptToEdit}
        />
      )}

      {selectedScript && (
        <ScriptModal
          script={selectedScript}
          onClose={handleCloseModal}
          onEdit={handleEditScript}
          onDelete={handleDeleteScript}
        />
      )}
    </div>
  );
};

export default ScriptList;
