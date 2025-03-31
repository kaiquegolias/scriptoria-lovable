
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Chamado } from './ChamadoCard';

interface ChamadoFormProps {
  onSave: (chamado: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'> & { id?: string }) => void;
  onClose: () => void;
  chamado?: Chamado;
}

const STATUS_OPTIONS = [
  { value: 'agendados', label: 'Agendados' },
  { value: 'agendados_planner', label: 'Agendados PLANNER' },
  { value: 'agendados_aguardando', label: 'Aguardando devolutiva' },
  { value: 'em_andamento', label: 'Em andamento' }
];

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

const STORAGE_KEY = 'chamadoFormState';

const ChamadoForm: React.FC<ChamadoFormProps> = ({ onSave, onClose, chamado }) => {
  const isEditing = !!chamado;
  
  const [formState, setFormState] = useState<Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'> & { id?: string }>(() => {
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
    return chamado ? {
      id: chamado.id,
      titulo: chamado.titulo,
      status: chamado.status,
      estruturante: chamado.estruturante,
      nivel: chamado.nivel,
      acompanhamento: chamado.acompanhamento,
      links: chamado.links || [],
      dataLimite: chamado.dataLimite
    } : {
      titulo: '',
      status: 'em_andamento',
      estruturante: 'PNCP',
      nivel: 'N1',
      acompanhamento: '',
      links: [],
      dataLimite: null
    };
  });
  
  const [newLink, setNewLink] = useState('');
  
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

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    
    setFormState(prev => ({
      ...prev,
      links: [...prev.links, newLink]
    }));
    setNewLink('');
  };
  
  const handleRemoveLink = (indexToRemove: number) => {
    setFormState(prev => ({
      ...prev,
      links: prev.links.filter((_, index) => index !== indexToRemove)
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.titulo) {
      toast.error('O título é obrigatório');
      return;
    }
    
    if (!formState.acompanhamento) {
      toast.error('O acompanhamento é obrigatório');
      return;
    }
    
    onSave(formState);
    cleanup();
  };
  
  const handleClose = () => {
    if (
      formState.titulo.trim() !== '' || 
      formState.acompanhamento.trim() !== '' ||
      formState.links.length > 0
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
            {isEditing ? 'Editar Chamado' : 'Novo Chamado'}
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
              <label htmlFor="titulo" className="block text-sm font-medium mb-1">
                Título*
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formState.titulo}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formState.status}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
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
              <label htmlFor="acompanhamento" className="block text-sm font-medium mb-1">
                Acompanhamento*
              </label>
              <textarea
                id="acompanhamento"
                name="acompanhamento"
                value={formState.acompanhamento}
                onChange={handleChange}
                className="w-full p-2 border rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Links relacionados
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Adicionar link"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="bg-primary text-white px-3 py-2 rounded-r-md"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="mt-2 space-y-2">
                {formState.links.map((link, index) => (
                  <div key={index} className="flex items-center bg-background p-2 rounded-md">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-primary hover:underline"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
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

export default ChamadoForm;
