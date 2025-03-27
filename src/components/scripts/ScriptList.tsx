
import React, { useState, useEffect } from 'react';
import ScriptCard, { Script } from './ScriptCard';
import ScriptForm from './ScriptForm';
import ScriptModal from './ScriptModal';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';

const ScriptList = () => {
  const { user } = useAuth();
  const storageKey = `scripts-${user?.id || 'guest'}`;
  
  const [scripts, setScripts] = useLocalStorage<Script[]>(storageKey, []);
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
  
  const handleDeleteScript = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este script?')) {
      setScripts(scripts.filter((script) => script.id !== id));
      toast.success('Script excluído com sucesso!');
    }
  };

  const handleViewDetails = (script: Script) => {
    setSelectedScript(script);
  };

  const handleCloseModal = () => {
    setSelectedScript(null);
  };
  
  const handleSaveScript = (
    scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const now = new Date().toISOString();
    
    if (scriptData.id) {
      // Atualizar script existente
      setScripts(
        scripts.map((script) =>
          script.id === scriptData.id
            ? {
                ...script,
                ...scriptData,
                updatedAt: now,
              }
            : script
        )
      );
      toast.success('Script atualizado com sucesso!');
    } else {
      // Criar novo script
      const newScript: Script = {
        id: Math.random().toString(36).substring(2),
        nome: scriptData.nome,
        estruturante: scriptData.estruturante,
        nivel: scriptData.nivel,
        situacao: scriptData.situacao,
        modelo: scriptData.modelo,
        createdAt: now,
        updatedAt: now,
      };
      
      setScripts([newScript, ...scripts]);
      toast.success('Script criado com sucesso!');
    }
    
    handleCloseForm();
  };
  
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
