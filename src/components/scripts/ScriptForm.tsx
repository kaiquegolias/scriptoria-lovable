
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
  const [nivel, setNivel] = useState<'N1' | 'N2' | 'N3'>(script?.nivel || 'N1');
  const [situacao, setSituacao] = useState(script?.situacao || '');
  const [modelo, setModelo] = useState(script?.modelo || '');

  const isEditing = !!script;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('O nome do script é obrigatório');
      return;
    }
    
    if (!situacao.trim()) {
      toast.error('A situação de uso é obrigatória');
      return;
    }
    
    if (!modelo.trim()) {
      toast.error('O modelo de resposta é obrigatório');
      return;
    }
    
    const scriptData = {
      ...(script?.id ? { id: script.id } : {}),
      nome,
      estruturante,
      nivel,
      situacao,
      modelo,
    };
    
    onSave(scriptData);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto animate-slide-in">
        <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Editar Script' : 'Novo Script'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="nome" className="block text-sm font-medium">
                Nome do Script <span className="text-red-500">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
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
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              >
                <option value="PNCP">PNCP</option>
                <option value="PEN">PEN</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="nivel" className="block text-sm font-medium">
                Nível de Uso
              </label>
              <select
                id="nivel"
                value={nivel}
                onChange={(e) => setNivel(e.target.value as 'N1' | 'N2' | 'N3')}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              >
                <option value="N1">N1</option>
                <option value="N2">N2</option>
                <option value="N3">N3</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="situacao" className="block text-sm font-medium">
                Situação de Uso <span className="text-red-500">*</span>
              </label>
              <input
                id="situacao"
                type="text"
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="Quando este script deve ser utilizado"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="modelo" className="block text-sm font-medium">
              Modelo de Resposta <span className="text-red-500">*</span>
            </label>
            <textarea
              id="modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[200px]"
              placeholder="Digite o texto do script"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border hover:bg-gray-50 font-medium transition-colors"
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
