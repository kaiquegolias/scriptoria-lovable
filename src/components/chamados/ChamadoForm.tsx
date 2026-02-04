import React, { useState, useEffect } from 'react';
import { X, Plus, Trash, User } from 'lucide-react';
import { toast } from 'sonner';
import { Chamado } from './ChamadoCard';
import { PEN_PRODUCTS, getProductByValue, getModuleByValue } from '@/data/penProducts';

interface ChamadoFormState {
  id?: string;
  titulo: string;
  status: 'agendados' | 'agendados_aguardando' | 'agendados_planner' | 'em_andamento' | 'resolvido';
  estruturante: 'PNCP' | 'PEN' | 'Outros';
  nivel: 'N1' | 'N2' | 'N3';
  acompanhamento: string;
  links: string[];
  dataLimite: string | null;
  penProduto?: string;
  penModulo?: string;
  penPo?: string;
  penPoSubstituto?: string;
  penRepresentanteTecnico?: string;
}

interface ChamadoFormProps {
  onSave: (chamado: ChamadoFormState) => void;
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
  
  const [formState, setFormState] = useState<ChamadoFormState>(() => {
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
      dataLimite: chamado.dataLimite,
      penProduto: '',
      penModulo: '',
      penPo: '',
      penPoSubstituto: '',
      penRepresentanteTecnico: ''
    } : {
      titulo: '',
      status: 'em_andamento',
      estruturante: 'PNCP',
      nivel: 'N1',
      acompanhamento: '',
      links: [],
      dataLimite: null,
      penProduto: '',
      penModulo: '',
      penPo: '',
      penPoSubstituto: '',
      penRepresentanteTecnico: ''
    };
  });
  
  const [newLink, setNewLink] = useState('');
  
  // Get available modules based on selected product
  const selectedProduct = formState.penProduto ? getProductByValue(formState.penProduto) : null;
  const availableModules = selectedProduct?.modules || [];
  
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
    
    // Reset PEN fields when estruturante changes
    if (name === 'estruturante') {
      if (value !== 'PEN') {
        setFormState(prev => ({ 
          ...prev, 
          estruturante: value as 'PNCP' | 'PEN' | 'Outros',
          penProduto: '',
          penModulo: '',
          penPo: '',
          penPoSubstituto: '',
          penRepresentanteTecnico: ''
        }));
      } else {
        setFormState(prev => ({ 
          ...prev, 
          estruturante: value as 'PNCP' | 'PEN' | 'Outros'
        }));
      }
      return;
    }
    
    // Reset module and PO when product changes
    if (name === 'penProduto') {
      setFormState(prev => ({ 
        ...prev, 
        penProduto: value,
        penModulo: '',
        penPo: '',
        penPoSubstituto: '',
        penRepresentanteTecnico: ''
      }));
      return;
    }
    
    // Update PO info when module changes
    if (name === 'penModulo' && formState.penProduto) {
      const module = getModuleByValue(formState.penProduto, value);
      setFormState(prev => ({ 
        ...prev, 
        penModulo: value,
        penPo: module?.po || '',
        penPoSubstituto: module?.poSubstituto || '',
        penRepresentanteTecnico: module?.representanteTecnico || ''
      }));
      return;
    }
    
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
            
            {/* PEN Product and Module Selection */}
            {formState.estruturante === 'PEN' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Detalhes do Produto PEN
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="penProduto" className="block text-sm font-medium mb-1">
                      Produto
                    </label>
                    <select
                      id="penProduto"
                      name="penProduto"
                      value={formState.penProduto || ''}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    >
                      <option value="">Selecione um produto</option>
                      {PEN_PRODUCTS.map(product => (
                        <option key={product.value} value={product.value}>
                          {product.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formState.penProduto && (
                    <div>
                      <label htmlFor="penModulo" className="block text-sm font-medium mb-1">
                        Módulo
                      </label>
                      <select
                        id="penModulo"
                        name="penModulo"
                        value={formState.penModulo || ''}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      >
                        <option value="">Selecione um módulo</option>
                        {availableModules.map(module => (
                          <option key={module.value} value={module.value}>
                            {module.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {/* PO and Representative Information */}
                {formState.penModulo && formState.penPo && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">PO:</span>
                        <span className="ml-2 font-medium">{formState.penPo}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">PO Substituto:</span>
                        <span className="ml-2 font-medium">{formState.penPoSubstituto || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rep. Técnico:</span>
                        <span className="ml-2 font-medium">{formState.penRepresentanteTecnico || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
                      className="ml-2 text-destructive hover:text-destructive/80"
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
