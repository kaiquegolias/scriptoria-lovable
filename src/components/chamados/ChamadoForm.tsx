
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Chamado } from './ChamadoCard';
import { toast } from 'sonner';

interface ChamadoFormProps {
  onClose: () => void;
  onSave: (chamado: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'> & { id?: string }) => void;
  chamado?: Chamado;
}

const ChamadoForm: React.FC<ChamadoFormProps> = ({ onClose, onSave, chamado }) => {
  const [titulo, setTitulo] = useState(chamado?.titulo || '');
  const [status, setStatus] = useState<'agendados' | 'agendados_planner' | 'agendados_aguardando' | 'em_andamento' | 'resolvido'>(
    chamado?.status || 'agendados'
  );
  const [estruturante, setEstruturante] = useState<'PNCP' | 'PEN' | 'Outros'>(
    chamado?.estruturante || 'Outros'
  );
  const [nivel, setNivel] = useState<'N1' | 'N2' | 'N3'>(
    chamado?.nivel || 'N1'
  );
  const [acompanhamento, setAcompanhamento] = useState(chamado?.acompanhamento || '');
  const [links, setLinks] = useState<string[]>(chamado?.links || ['']);

  const isEditing = !!chamado;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim()) {
      toast.error('O título do chamado é obrigatório');
      return;
    }
    
    // Filtra links vazios
    const filteredLinks = links.filter(link => link.trim() !== '');
    
    const chamadoData = {
      ...(chamado?.id ? { id: chamado.id } : {}),
      titulo,
      status,
      estruturante,
      nivel,
      acompanhamento,
      links: filteredLinks,
    };
    
    onSave(chamadoData);
  };

  const addLink = () => {
    setLinks([...links, '']);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto animate-slide-in">
        <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Editar Chamado' : 'Novo Chamado'}
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
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="titulo" className="block text-sm font-medium">
                Título do Chamado <span className="text-red-500">*</span>
              </label>
              <input
                id="titulo"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="Digite um título descritivo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'agendados' | 'agendados_planner' | 'agendados_aguardando' | 'em_andamento' | 'resolvido')}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="agendados">Agendados</option>
                <option value="agendados_planner">Agendados PLANNER</option>
                <option value="agendados_aguardando">Aguardando devolutiva</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="resolvido">Resolvido</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="estruturante" className="block text-sm font-medium">
                Estruturante
              </label>
              <select
                id="estruturante"
                value={estruturante}
                onChange={(e) => setEstruturante(e.target.value as 'PNCP' | 'PEN' | 'Outros')}
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground"
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
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="N1">N1</option>
                <option value="N2">N2</option>
                <option value="N3">N3</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="acompanhamento" className="block text-sm font-medium">
              Acompanhamento
            </label>
            <textarea
              id="acompanhamento"
              value={acompanhamento}
              onChange={(e) => setAcompanhamento(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[120px] text-foreground"
              placeholder="Informações de acompanhamento do chamado"
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">
                Links
              </label>
              <button
                type="button"
                onClick={addLink}
                className="text-sm flex items-center text-primary hover:text-primary/80"
              >
                <Plus size={16} className="mr-1" />
                Adicionar Link
              </button>
            </div>
            
            {links.map((link, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => updateLink(index, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground"
                  placeholder="https://exemplo.com"
                />
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="p-2.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
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

export default ChamadoForm;
