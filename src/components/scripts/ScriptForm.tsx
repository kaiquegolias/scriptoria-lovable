
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Script } from './ScriptCard';

interface ScriptFormProps {
  onSave: (script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
  script?: Script;
}

const ESTRUTURANTES_OPTIONS = [
  { value: 'PNCP', label: 'PNCP' },
  { value: 'PEN', label: 'PEN' },
  { value: 'Outros', label: 'Outros' }
];

const NIVEL_OPTIONS = [
  { value: 'N1', label: 'N1' },
  { value: 'N2', label: 'N2' },
  { value: 'N3', label: 'N3' }
];

const STORAGE_KEY = 'scriptFormState';

const ScriptForm: React.FC<ScriptFormProps> = ({ onSave, onClose, script }) => {
  const isEditing = !!script;
  
  const [formState, setFormState] = useState<Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>(() => {
    // Try to restore form state from localStorage if not editing
    if (!isEditing) {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          return JSON.parse(savedState);
        } catch (e) {
          console.error("Failed to parse saved form state:", e);
        }
      }
    }
    
    // Default state or editing state
    return script ? {
      id: script.id,
      nome: script.nome,
      estruturante: script.estruturante,
      nivel: script.nivel,
      situacao: script.situacao,
      modelo: script.modelo
    } : {
      nome: '',
      estruturante: 'PNCP',
      nivel: 'N1',
      situacao: '',
      modelo: ''
    };
  });
  
  // Save form state to localStorage when it changes
  useEffect(() => {
    if (!isEditing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formState));
    }
  }, [formState, isEditing]);
  
  // Clear saved state when form is submitted or closed
  const cleanup = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.nome) {
      toast.error('O nome é obrigatório');
      return;
    }
    
    if (!formState.situacao) {
      toast.error('A situação de uso é obrigatória');
      return;
    }
    
    if (!formState.modelo) {
      toast.error('O modelo de resposta é obrigatório');
      return;
    }
    
    onSave(formState);
    cleanup();
  };
  
  const handleClose = () => {
    if (
      formState.nome.trim() !== '' || 
      formState.situacao.trim() !== '' ||
      formState.modelo.trim() !== ''
    ) {
      if (!window.confirm('Tem certeza que deseja fechar o formulário? Os dados não salvos serão perdidos.')) {
        return;
      }
      cleanup();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Editar Script' : 'Novo Script'}
          </h2>
          <button
            onClick={handleClose}
            className="text-foreground/70 hover:text-foreground p-1 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium mb-1">
                Nome*
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formState.nome}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="estruturante" className="block text-sm font-medium mb-1">
                  Estruturante
                </label>
                <select
                  id="estruturante"
                  name="estruturante"
                  value={formState.estruturante}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ESTRUTURANTES_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="nivel" className="block text-sm font-medium mb-1">
                  Nível
                </label>
                <select
                  id="nivel"
                  name="nivel"
                  value={formState.nivel}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {NIVEL_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="situacao" className="block text-sm font-medium mb-1">
                Situação de Uso*
              </label>
              <textarea
                id="situacao"
                name="situacao"
                value={formState.situacao}
                onChange={handleChange}
                className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            
            <div>
              <label htmlFor="modelo" className="block text-sm font-medium mb-1">
                Modelo de Resposta*
              </label>
              <textarea
                id="modelo"
                name="modelo"
                value={formState.modelo}
                onChange={handleChange}
                className="w-full p-2 border rounded-md h-48 resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              {isEditing ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptForm;
