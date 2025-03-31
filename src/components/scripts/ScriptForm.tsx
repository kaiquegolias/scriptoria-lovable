
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Script } from './ScriptCard';
import { toast } from 'sonner';

interface ScriptFormProps {
  onClose: () => void;
  onSave: (script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  script?: Script;
}

const ScriptForm: React.FC<ScriptFormProps> = ({ onClose, onSave, script }) => {
  const [nome, setNome] = useState(script?.nome || '');
  const [estruturante, setEstruturante] = useState<'PNCP' | 'PEN' | 'Outros'>(
    script?.estruturante || 'Outros'
  );
  const [nivel, setNivel] = useState<'N1' | 'N2' | 'N3'>(
    script?.nivel || 'N1'
  );
  const [situacao, setSituacao] = useState(script?.situacao || '');
  const [modelo, setModelo] = useState(script?.modelo || '');

  const isEditing = !!script;

  // Save form state to local storage when user navigates away
  useEffect(() => {
    // Save current form state
    const saveFormState = () => {
      const formState = {
        nome,
        estruturante,
        nivel,
        situacao,
        modelo,
        isEditing,
        scriptId: script?.id || null
      };
      localStorage.setItem('scriptFormState', JSON.stringify(formState));
    };

    // Add beforeunload event listener
    window.addEventListener('beforeunload', saveFormState);
    
    // Also save state when component unmounts
    return () => {
      saveFormState();
      window.removeEventListener('beforeunload', saveFormState);
    };
  }, [nome, estruturante, nivel, situacao, modelo, isEditing, script?.id]);

  // Load form state from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('scriptFormState');
    
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        
        // Only restore if it's the same editing context (new form or editing the same script)
        if (
          (isEditing && parsedState.isEditing && parsedState.scriptId === script?.id) || 
          (!isEditing && !parsedState.isEditing)
        ) {
          setNome(parsedState.nome || '');
          setEstruturante(parsedState.estruturante || 'Outros');
          setNivel(parsedState.nivel || 'N1');
          setSituacao(parsedState.situacao || '');
          setModelo(parsedState.modelo || '');
          
          toast.info('Seu progresso anterior foi restaurado', {
            description: 'Continue de onde parou',
            duration: 3000
          });
        }
      } catch (error) {
        console.error('Error parsing saved form state:', error);
      }
    }
    
    // Clean up local storage after successful form submission
    const handleFormSubmit = () => {
      localStorage.removeItem('scriptFormState');
    };
    
    return () => {
      document.removeEventListener('scriptFormSubmitted', handleFormSubmit);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('O nome do script é obrigatório');
      return;
    }
    
    const scriptData = {
      ...(script?.id ? { id: script.id } : {}),
      nome,
      estruturante,
      nivel,
      situacao,
      modelo
    };
    
    onSave(scriptData);
    
    // Dispatch event to clear localStorage
    document.dispatchEvent(new Event('scriptFormSubmitted'));
    localStorage.removeItem('scriptFormState');
  };
  
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto animate-slide-in dark:bg-gray-800">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Editar Script' : 'Novo Script'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="nome" className="block text-sm font-medium">
                Nome do Script <span className="text-red-500">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:bg-gray-700 dark:border-gray-600"
                placeholder="Digite um nome descritivo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="estruturante" className="block text-sm font-medium">
                Estruturante
              </label>
              <select
                id="estruturante"
                value={estruturante}
                onChange={(e) => setEstruturante(e.target.value as 'PNCP' | 'PEN' | 'Outros')}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="PNCP">PNCP</option>
                <option value="PEN">PEN</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="nivel" className="block text-sm font-medium">
                Nível
              </label>
              <select
                id="nivel"
                value={nivel}
                onChange={(e) => setNivel(e.target.value as 'N1' | 'N2' | 'N3')}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="N1">N1</option>
                <option value="N2">N2</option>
                <option value="N3">N3</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="situacao" className="block text-sm font-medium">
              Situação
            </label>
            <textarea
              id="situacao"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[100px] dark:bg-gray-700 dark:border-gray-600"
              placeholder="Descreva a situação"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="modelo" className="block text-sm font-medium">
              Modelo de Script
            </label>
            <textarea
              id="modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[200px] font-mono text-sm dark:bg-gray-700 dark:border-gray-600"
              placeholder="Cole aqui o modelo de script"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              {isEditing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptForm;
