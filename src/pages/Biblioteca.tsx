import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Plus, Calendar, Edit, Trash2, Tag, 
  RefreshCw, Database, FileCode, Copy, Check, FileText, Ticket
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useScriptsLibrary, ScriptLibraryItem } from '@/hooks/useScriptsLibrary';
import { useKBIndexer } from '@/hooks/useKBIndexer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KBItem {
  id: string;
  source_id: string;
  source_type: 'script' | 'ticket';
  title: string | null;
  content_preview: string | null;
  keywords: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

const Biblioteca = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scripts, loading: scriptsLoading, refreshScripts, createScript, updateScript, deleteScript } = useScriptsLibrary();
  const { indexAllScripts, indexAllTickets, loading: indexing, progress } = useKBIndexer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptLibraryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // KB Items from kb_vectors
  const [kbItems, setKbItems] = useState<KBItem[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    tags: '',
    sistema: '',
    versao: '',
    pre_condicoes: '',
  });

  // Fetch KB items from kb_vectors
  const fetchKBItems = useCallback(async () => {
    try {
      setKbLoading(true);
      const { data, error } = await supabase
        .from('kb_vectors')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setKbItems((data as KBItem[]) || []);
    } catch (error) {
      console.error('Error fetching KB items:', error);
      toast.error('Erro ao carregar itens da KB.');
    } finally {
      setKbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    refreshScripts();
    fetchKBItems();
  }, [user, navigate, refreshScripts, fetchKBItems]);

  // Get all unique tags from scripts
  const allTags = Array.from(new Set(scripts.flatMap(s => s.tags || [])));

  // Get all keywords from KB items
  const allKeywords = Array.from(new Set(kbItems.flatMap(item => item.keywords || [])));

  // Filter scripts
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = 
      script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || (script.tags && script.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

  // Filter KB items (tickets from closed chamados)
  const filteredKBItems = kbItems.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content_preview?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKeyword = !selectedTag || (item.keywords && item.keywords.includes(selectedTag));
    
    return matchesSearch && matchesKeyword;
  });

  // Separate by type
  const ticketKBItems = filteredKBItems.filter(item => item.source_type === 'ticket');
  const scriptKBItems = filteredKBItems.filter(item => item.source_type === 'script');

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      tags: '',
      sistema: '',
      versao: '',
      pre_condicoes: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Título e conteúdo são obrigatórios.');
      return;
    }

    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    await createScript({
      title: formData.title,
      description: formData.description,
      content: formData.content,
      tags,
      sistema: formData.sistema || undefined,
      versao: formData.versao || undefined,
      pre_condicoes: formData.pre_condicoes || undefined,
    });

    setIsCreateOpen(false);
    resetForm();
    fetchKBItems(); // Refresh KB items after creating
  };

  const handleEdit = async () => {
    if (!selectedScript) return;
    
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    await updateScript(selectedScript.id, {
      title: formData.title,
      description: formData.description,
      content: formData.content,
      tags,
      sistema: formData.sistema || undefined,
      versao: formData.versao || undefined,
      pre_condicoes: formData.pre_condicoes || undefined,
    });

    setIsEditOpen(false);
    setSelectedScript(null);
    resetForm();
    fetchKBItems(); // Refresh KB items after editing
  };

  const openEditModal = (script: ScriptLibraryItem) => {
    setSelectedScript(script);
    setFormData({
      title: script.title,
      description: script.description || '',
      content: script.content,
      tags: (script.tags || []).join(', '),
      sistema: script.sistema || '',
      versao: script.versao || '',
      pre_condicoes: script.pre_condicoes || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este script?')) {
      await deleteScript(id);
      fetchKBItems(); // Refresh KB items after deleting
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReindex = async () => {
    await indexAllScripts();
    await indexAllTickets();
    await fetchKBItems(); // Refresh KB items after reindexing
    toast.success('Reindexação concluída!');
  };

  if (!user) return null;

  const loading = scriptsLoading || kbLoading;
  const totalItems = scripts.length + ticketKBItems.length;
  const totalKeywords = new Set([...allTags, ...allKeywords]).size;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Biblioteca de Conhecimento (KB)
          </h1>
          <p className="text-muted-foreground">
            Scripts e soluções de chamados encerrados para referência futura.
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={handleReindex}
            disabled={indexing}
          >
            <RefreshCw size={16} className={`mr-2 ${indexing ? 'animate-spin' : ''}`} />
            {indexing ? `Indexando... ${progress.current}/${progress.total}` : 'Reindexar KB'}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} className="mr-2" />
            Novo Script
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título, descrição ou conteúdo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {(allTags.length > 0 || allKeywords.length > 0) && (
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              Todos
            </Badge>
            {[...new Set([...allTags, ...allKeywords])].slice(0, 20).map(tag => (
              <Badge 
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTag(tag)}
              >
                <Tag size={12} className="mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{scripts.length}</div>
            <div className="text-sm text-muted-foreground">Scripts na Biblioteca</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ticketKBItems.length}</div>
            <div className="text-sm text-muted-foreground">Chamados Indexados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalItems}</div>
            <div className="text-sm text-muted-foreground">Total na KB</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalKeywords}</div>
            <div className="text-sm text-muted-foreground">Tags/Keywords</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different content types */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Database size={14} />
            Todos ({totalItems})
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center gap-2">
            <FileCode size={14} />
            Scripts ({scripts.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket size={14} />
            Chamados ({ticketKBItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="space-y-6">
              {filteredScripts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileCode size={18} className="text-primary" />
                    Scripts ({filteredScripts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredScripts.map(script => (
                      <ScriptCard 
                        key={script.id} 
                        script={script} 
                        copiedId={copiedId}
                        onCopy={copyToClipboard}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {ticketKBItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Ticket size={18} className="text-orange-500" />
                    Chamados Encerrados ({ticketKBItems.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ticketKBItems.map(item => (
                      <KBItemCard 
                        key={item.id} 
                        item={item}
                        copiedId={copiedId}
                        onCopy={copyToClipboard}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredScripts.length === 0 && ticketKBItems.length === 0 && (
                <EmptyState 
                  searchTerm={searchTerm} 
                  selectedTag={selectedTag}
                  onCreateClick={() => setIsCreateOpen(true)}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scripts">
          {loading ? (
            <LoadingState />
          ) : filteredScripts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScripts.map(script => (
                <ScriptCard 
                  key={script.id} 
                  script={script} 
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              searchTerm={searchTerm} 
              selectedTag={selectedTag}
              onCreateClick={() => setIsCreateOpen(true)}
              type="scripts"
            />
          )}
        </TabsContent>

        <TabsContent value="tickets">
          {loading ? (
            <LoadingState />
          ) : ticketKBItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ticketKBItems.map(item => (
                <KBItemCard 
                  key={item.id} 
                  item={item}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              searchTerm={searchTerm} 
              selectedTag={selectedTag}
              onCreateClick={() => {}}
              type="tickets"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Script</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Nome do script"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descrição do que o script faz"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Conteúdo do script ou solução"
                rows={6}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="erro, sftp, conexão"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sistema">Sistema</Label>
                <Input
                  id="sistema"
                  value={formData.sistema}
                  onChange={(e) => setFormData({...formData, sistema: e.target.value})}
                  placeholder="Ex: PEN, PNCP"
                />
              </div>
              <div>
                <Label htmlFor="versao">Versão</Label>
                <Input
                  id="versao"
                  value={formData.versao}
                  onChange={(e) => setFormData({...formData, versao: e.target.value})}
                  placeholder="Ex: 1.0.0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pre_condicoes">Pré-condições</Label>
              <Textarea
                id="pre_condicoes"
                value={formData.pre_condicoes}
                onChange={(e) => setFormData({...formData, pre_condicoes: e.target.value})}
                placeholder="Condições necessárias para executar o script"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsCreateOpen(false); resetForm();}}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Criar Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Script</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Conteúdo *</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                rows={6}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-sistema">Sistema</Label>
                <Input
                  id="edit-sistema"
                  value={formData.sistema}
                  onChange={(e) => setFormData({...formData, sistema: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-versao">Versão</Label>
                <Input
                  id="edit-versao"
                  value={formData.versao}
                  onChange={(e) => setFormData({...formData, versao: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-pre_condicoes">Pré-condições</Label>
              <Textarea
                id="edit-pre_condicoes"
                value={formData.pre_condicoes}
                onChange={(e) => setFormData({...formData, pre_condicoes: e.target.value})}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsEditOpen(false); setSelectedScript(null); resetForm();}}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Loading State Component
const LoadingState = () => (
  <div className="text-center py-12">
    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
    <p className="mt-2 text-muted-foreground">Carregando dados...</p>
  </div>
);

// Empty State Component
const EmptyState = ({ 
  searchTerm, 
  selectedTag, 
  onCreateClick,
  type = 'all' 
}: { 
  searchTerm: string; 
  selectedTag: string | null; 
  onCreateClick: () => void;
  type?: 'all' | 'scripts' | 'tickets';
}) => (
  <div className="text-center py-12">
    <Database size={48} className="mx-auto text-muted-foreground/50 mb-4" />
    <h3 className="text-xl font-medium mb-2">
      {type === 'tickets' ? 'Nenhum chamado indexado' : 'Nenhum item encontrado'}
    </h3>
    <p className="text-muted-foreground">
      {searchTerm || selectedTag
        ? "Nenhum item corresponde aos filtros aplicados" 
        : type === 'tickets' 
          ? "Encerre chamados com o campo 'Último acompanhamento' para indexá-los"
          : "Adicione scripts ou encerre chamados para popular a KB!"}
    </p>
    {type !== 'tickets' && (
      <Button className="mt-4" onClick={onCreateClick}>
        <Plus size={16} className="mr-2" />
        Criar Primeiro Script
      </Button>
    )}
  </div>
);

// Script Card Component
const ScriptCard = ({ 
  script, 
  copiedId, 
  onCopy, 
  onEdit, 
  onDelete 
}: { 
  script: ScriptLibraryItem; 
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onEdit: (script: ScriptLibraryItem) => void;
  onDelete: (id: string) => void;
}) => (
  <Card className="flex flex-col h-full">
    <CardHeader>
      <CardTitle className="flex items-start gap-2 text-base">
        <FileCode size={18} className="text-primary mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2">{script.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      {script.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {script.description}
        </p>
      )}
      
      <div className="bg-secondary/50 rounded-md p-2 mb-3 max-h-24 overflow-hidden">
        <pre className="text-xs font-mono line-clamp-3 whitespace-pre-wrap">
          {script.content}
        </pre>
      </div>

      {script.tags && script.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {script.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {script.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{script.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center">
          <Calendar size={12} className="mr-1" />
          {script.created_at && format(new Date(script.created_at), "dd/MM/yy", { locale: ptBR })}
        </div>
        <div>Usos: {script.usage_count || 0}</div>
      </div>
    </CardContent>
    <CardFooter className="border-t pt-3 flex gap-1">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => onCopy(script.content, script.id)}
      >
        {copiedId === script.id ? (
          <Check size={14} className="mr-1 text-green-500" />
        ) : (
          <Copy size={14} className="mr-1" />
        )}
        Copiar
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => onEdit(script)}
      >
        <Edit size={14} className="mr-1" />
        Editar
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => onDelete(script.id)}
      >
        <Trash2 size={14} />
      </Button>
    </CardFooter>
  </Card>
);

// KB Item Card Component (for tickets)
const KBItemCard = ({ 
  item, 
  copiedId, 
  onCopy 
}: { 
  item: KBItem; 
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
}) => (
  <Card className="flex flex-col h-full border-l-4 border-l-orange-500">
    <CardHeader>
      <CardTitle className="flex items-start gap-2 text-base">
        <Ticket size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2">{item.title || 'Sem título'}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <div className="bg-secondary/50 rounded-md p-2 mb-3 max-h-24 overflow-hidden">
        <p className="text-sm line-clamp-3 whitespace-pre-wrap">
          {item.content_preview || 'Sem conteúdo'}
        </p>
      </div>

      {item.keywords && item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.keywords.slice(0, 4).map((keyword, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
          {item.keywords.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{item.keywords.length - 4}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center text-xs text-muted-foreground">
        <Calendar size={12} className="mr-1" />
        {item.updated_at && format(new Date(item.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
      </div>
    </CardContent>
    <CardFooter className="border-t pt-3">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => onCopy(item.content_preview || '', item.id)}
      >
        {copiedId === item.id ? (
          <Check size={14} className="mr-1 text-green-500" />
        ) : (
          <Copy size={14} className="mr-1" />
        )}
        Copiar
      </Button>
    </CardFooter>
  </Card>
);

export default Biblioteca;
