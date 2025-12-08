import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, Plus, Calendar, Edit, Trash2, Tag, 
  RefreshCw, Database, FileCode, Copy, Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useScriptsLibrary, ScriptLibraryItem } from '@/hooks/useScriptsLibrary';
import { useKBIndexer } from '@/hooks/useKBIndexer';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Biblioteca = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scripts, loading, refreshScripts, createScript, updateScript, deleteScript } = useScriptsLibrary();
  const { indexAllScripts, indexAllTickets, loading: indexing } = useKBIndexer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptLibraryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    refreshScripts();
  }, [user, navigate, refreshScripts]);

  // Get all unique tags
  const allTags = Array.from(new Set(scripts.flatMap(s => s.tags || [])));

  // Filter scripts
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = 
      script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || (script.tags && script.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

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
      sistema: formData.sistema || null,
      versao: formData.versao || null,
      pre_condicoes: formData.pre_condicoes || null,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedScript) return;
    
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    await updateScript(selectedScript.id, {
      title: formData.title,
      description: formData.description,
      content: formData.content,
      tags,
      sistema: formData.sistema || null,
      versao: formData.versao || null,
      pre_condicoes: formData.pre_condicoes || null,
    });

    setIsEditOpen(false);
    setSelectedScript(null);
    resetForm();
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
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Biblioteca de Scripts (KB)
          </h1>
          <p className="text-muted-foreground">
            Base de conhecimento com scripts e soluções para chamados.
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={handleReindex}
            disabled={indexing}
          >
            <RefreshCw size={16} className={`mr-2 ${indexing ? 'animate-spin' : ''}`} />
            {indexing ? 'Indexando...' : 'Reindexar KB'}
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

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              Todos
            </Badge>
            {allTags.map(tag => (
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
            <div className="text-sm text-muted-foreground">Total de Scripts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{allTags.length}</div>
            <div className="text-sm text-muted-foreground">Tags Únicas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {scripts.reduce((acc, s) => acc + (s.usage_count || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Usos Totais</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {scripts.length > 0 
                ? Math.round(scripts.reduce((acc, s) => acc + (s.success_rate || 0), 0) / scripts.length)
                : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
          </CardContent>
        </Card>
      </div>

      {/* Scripts grid */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando scripts...</p>
        </div>
      ) : filteredScripts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((script) => (
            <Card key={script.id} className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="flex items-start gap-2">
                  <FileCode size={20} className="text-primary mt-1 flex-shrink-0" />
                  <span className="line-clamp-2">{script.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                {script.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {script.description}
                  </p>
                )}
                
                <div className="bg-secondary/50 rounded-md p-3 mb-4 max-h-32 overflow-hidden">
                  <pre className="text-xs font-mono line-clamp-4 whitespace-pre-wrap">
                    {script.content}
                  </pre>
                </div>

                {script.tags && script.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {script.tags.slice(0, 4).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {script.tags.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{script.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {script.created_at && format(new Date(script.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  <div>
                    Usos: {script.usage_count || 0}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(script.content, script.id)}
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
                  onClick={() => openEditModal(script)}
                >
                  <Edit size={14} className="mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(script.id)}
                >
                  <Trash2 size={14} className="mr-1" />
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Database size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhum script encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedTag
              ? "Nenhum script corresponde aos filtros aplicados" 
              : "Adicione scripts à biblioteca para começar!"}
          </p>
          <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} className="mr-2" />
            Criar Primeiro Script
          </Button>
        </div>
      )}

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

export default Biblioteca;
