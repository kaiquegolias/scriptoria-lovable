import React, { useState, useEffect } from 'react';
import { X, Plus, Trash, User } from 'lucide-react';
import { toast } from 'sonner';
import { Chamado } from './ChamadoCard';
import { PEN_PRODUCTS, getProductByValue, getModuleByValue, getProductByLabel } from '@/data/penProducts';
import MexxPdfImport, { ExtractedMexxData } from './MexxPdfImport';

interface ChamadoFormState {
  id?: string;
  titulo: string;
  status: 'agendados' | 'agendados_aguardando' | 'agendados_planner' | 'em_andamento' | 'resolvido';
  estruturante: 'PNCP' | 'PEN' | 'Outros';
  nivel: 'N1' | 'N2' | 'N3';
  acompanhamento: string;
  links: string[];
  dataLimite: string | null;
  assunto?: string;
  penProduto?: string;
  penModulo?: string;
  penPo?: string;
  penPoSubstituto?: string;
  penRepresentanteTecnico?: string;
  // MEXX import metadata
  numeroChamado?: string;
  usuarioNome?: string;
  usuarioEmail?: string;
  usuarioTelefone?: string;
  usuarioCpf?: string;
  prioridade?: string;
  categoria?: string;
  orgao?: string;
  temAnexo?: boolean;
  descricaoCompleta?: string;
  slaAtendimento?: string;
  slaSolucao?: string;
  previsaoSolucao?: string | null;
  timeAtendimento?: string;
  tipoChamado?: string;
  responsavel?: string;
  dataAberturaPortal?: string | null;
  camposPersonalizados?: Record<string, string>;
}

const ASSUNTO_OPTIONS = [
  { value: 'registrar_duvida', label: 'Registrar dúvida' },
  { value: 'registrar_problema_tecnico', label: 'Registrar problema técnico' },
  { value: 'registrar_melhoria', label: 'Registrar melhoria' },
  { value: 'registrar_reclamacao', label: 'Registrar reclamação' },
  { value: 'solicitar_reuniao', label: 'Solicitar reunião com a equipe do PEN' },
  { value: 'solicitacoes', label: 'Solicitações' }
];

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
    if (chamado) {
      // Find product value from saved label for editing
      let penProdutoValue = '';
      let penModuloValue = '';
      
      if (chamado.penProduto) {
        // Find product by label (what was saved in DB)
        const productMatch = PEN_PRODUCTS.find(p => p.label === chamado.penProduto);
        if (productMatch) {
          penProdutoValue = productMatch.value;
          // Find module by label within that product
          if (chamado.penModulo) {
            const moduleMatch = productMatch.modules.find(m => m.label === chamado.penModulo);
            if (moduleMatch) {
              penModuloValue = moduleMatch.value;
            }
          }
        }
      }
      
      // Find assunto value from label if needed
      let assuntoValue = '';
      if (chamado.assunto) {
        const assuntoMatch = ASSUNTO_OPTIONS.find(a => a.label === chamado.assunto);
        assuntoValue = assuntoMatch?.value || '';
      }
      
      return {
        id: chamado.id,
        titulo: chamado.titulo,
        status: chamado.status,
        estruturante: chamado.estruturante,
        nivel: chamado.nivel,
        acompanhamento: chamado.acompanhamento,
        links: chamado.links || [],
        dataLimite: chamado.dataLimite,
        assunto: assuntoValue,
        penProduto: penProdutoValue,
        penModulo: penModuloValue,
        penPo: chamado.penPo || '',
        penPoSubstituto: chamado.penPoSubstituto || '',
        penRepresentanteTecnico: chamado.penRepresentanteTecnico || '',
        numeroChamado: chamado.numeroChamado,
        usuarioNome: chamado.usuarioNome,
        usuarioEmail: chamado.usuarioEmail,
        usuarioTelefone: chamado.usuarioTelefone,
        usuarioCpf: chamado.usuarioCpf,
        prioridade: chamado.prioridade,
        categoria: chamado.categoria,
        orgao: chamado.orgao,
        temAnexo: chamado.temAnexo,
        descricaoCompleta: chamado.descricaoCompleta,
        slaAtendimento: chamado.slaAtendimento,
        slaSolucao: chamado.slaSolucao,
        previsaoSolucao: chamado.previsaoSolucao || null,
        timeAtendimento: chamado.timeAtendimento,
        tipoChamado: chamado.tipoChamado,
        responsavel: chamado.responsavel,
        dataAberturaPortal: chamado.dataAberturaPortal || null,
        camposPersonalizados: chamado.camposPersonalizados || {},
      };
    }
    
    return {
      titulo: '',
      status: 'em_andamento',
      estruturante: 'PNCP',
      nivel: 'N1',
      acompanhamento: '',
      links: [],
      dataLimite: null,
      assunto: '',
      penProduto: '',
      penModulo: '',
      penPo: '',
      penPoSubstituto: '',
      penRepresentanteTecnico: ''
    };
  });
  
  const [newLink, setNewLink] = useState('');
  const [editPoManual, setEditPoManual] = useState(false);
  
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
    
    // Convert PEN product/module values to labels for storage
    let penProdutoLabel = '';
    let penModuloLabel = '';
    
    if (formState.penProduto) {
      const product = getProductByValue(formState.penProduto);
      if (product) {
        penProdutoLabel = product.label;
        if (formState.penModulo) {
          const module = product.modules.find(m => m.value === formState.penModulo);
          if (module) {
            penModuloLabel = module.label;
          }
        }
      }
    }
    
    // Convert assunto value to label for storage
    let assuntoLabel = '';
    if (formState.assunto) {
      const assuntoMatch = ASSUNTO_OPTIONS.find(a => a.value === formState.assunto);
      assuntoLabel = assuntoMatch?.label || '';
    }
    
    const dataToSave = {
      ...formState,
      assunto: assuntoLabel,
      penProduto: penProdutoLabel,
      penModulo: penModuloLabel
    };
    
    onSave(dataToSave);
    cleanup();
  };

  const handleMexxExtracted = (d: ExtractedMexxData) => {
    setFormState(prev => ({
      ...prev,
      titulo: d.titulo || prev.titulo,
      acompanhamento: prev.acompanhamento ||
        [
          d.numero_chamado ? `Nº ${d.numero_chamado}` : null,
          d.descricao,
        ].filter(Boolean).join('\n\n'),
      numeroChamado: d.numero_chamado,
      usuarioNome: d.usuario_nome,
      usuarioEmail: d.usuario_email,
      usuarioTelefone: d.usuario_telefone,
      usuarioCpf: d.usuario_cpf,
      prioridade: d.prioridade,
      categoria: d.categoria,
      orgao: d.orgao,
      temAnexo: d.tem_anexo,
      descricaoCompleta: d.descricao,
      slaAtendimento: d.sla_atendimento,
      slaSolucao: d.sla_solucao,
      previsaoSolucao: d.previsao_solucao || null,
      timeAtendimento: d.time_atendimento,
      tipoChamado: d.tipo_chamado,
      responsavel: d.responsavel || 'KAIQUE MATHEUS NEVES MACHADO',
      dataAberturaPortal: d.data_abertura || null,
      camposPersonalizados: d.campos_personalizados || {},
    }));
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
            {!isEditing && (
              <MexxPdfImport onExtracted={handleMexxExtracted} />
            )}

            {(formState.numeroChamado || formState.usuarioNome || formState.orgao) && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                  📋 Dados importados do MEXX
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {formState.numeroChamado && <div><span className="text-muted-foreground">Nº:</span> <b>{formState.numeroChamado}</b></div>}
                  {formState.prioridade && <div><span className="text-muted-foreground">Prioridade:</span> {formState.prioridade}</div>}
                  {formState.usuarioNome && <div className="col-span-2"><span className="text-muted-foreground">Solicitante:</span> {formState.usuarioNome}</div>}
                  {formState.usuarioEmail && <div className="col-span-2"><span className="text-muted-foreground">E-mail:</span> {formState.usuarioEmail}</div>}
                  {formState.orgao && <div><span className="text-muted-foreground">Órgão:</span> {formState.orgao}</div>}
                  {formState.categoria && <div className="col-span-2"><span className="text-muted-foreground">Categoria:</span> {formState.categoria}</div>}
                  {formState.responsavel && <div className="col-span-2"><span className="text-muted-foreground">Responsável:</span> {formState.responsavel}</div>}
                  {typeof formState.temAnexo === 'boolean' && <div><span className="text-muted-foreground">Anexo:</span> {formState.temAnexo ? 'Sim' : 'Não'}</div>}
                </div>
                {formState.camposPersonalizados && Object.keys(formState.camposPersonalizados).length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="font-medium mb-1">Campos personalizados:</div>
                    <div className="grid grid-cols-2 gap-x-4">
                      {Object.entries(formState.camposPersonalizados).map(([k, v]) => (
                        <div key={k}><span className="text-muted-foreground">{k}:</span> {v}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            
            {/* Campo Assunto */}
            <div>
              <label htmlFor="assunto" className="block text-sm font-medium mb-1">
                Assunto
              </label>
              <select
                id="assunto"
                name="assunto"
                value={formState.assunto || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione o assunto</option>
                {ASSUNTO_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                {formState.penModulo && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-md space-y-3">
                    {!editPoManual ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">PO:</span>
                            <span className="ml-2 font-medium">{formState.penPo || '-'}</span>
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
                        <button
                          type="button"
                          onClick={() => setEditPoManual(true)}
                          className="text-xs px-3 py-1.5 rounded-md border border-primary/40 bg-background hover:bg-accent transition"
                        >
                          Outros (editar manualmente)
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">PO</label>
                            <input
                              type="text"
                              name="penPo"
                              value={formState.penPo || ''}
                              onChange={handleChange}
                              placeholder="Nome do PO"
                              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">PO Substituto</label>
                            <input
                              type="text"
                              name="penPoSubstituto"
                              value={formState.penPoSubstituto || ''}
                              onChange={handleChange}
                              placeholder="Nome do PO substituto"
                              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Rep. Técnico</label>
                            <input
                              type="text"
                              name="penRepresentanteTecnico"
                              value={formState.penRepresentanteTecnico || ''}
                              onChange={handleChange}
                              placeholder="Nome do representante técnico"
                              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const module = getModuleByValue(formState.penProduto || '', formState.penModulo || '');
                            setFormState(prev => ({
                              ...prev,
                              penPo: module?.po || '',
                              penPoSubstituto: module?.poSubstituto || '',
                              penRepresentanteTecnico: module?.representanteTecnico || '',
                            }));
                            setEditPoManual(false);
                          }}
                          className="text-xs px-3 py-1.5 rounded-md border bg-background hover:bg-accent transition"
                        >
                          Restaurar dados da planilha
                        </button>
                      </>
                    )}
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
