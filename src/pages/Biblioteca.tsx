import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Calendar, Tag, 
  RefreshCw, Database, FileCode, Copy, Check, Ticket
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useScripts } from '@/hooks/useScripts';
import { useKBIndexer } from '@/hooks/useKBIndexer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Script } from '@/components/scripts/ScriptCard';

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
  const { scripts, loading: scriptsLoading, refreshScripts } = useScripts();
  const { indexAllScripts, indexAllTickets, loading: indexing, progress } = useKBIndexer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // KB Items from kb_vectors (chamados encerrados)
  const [kbItems, setKbItems] = useState<KBItem[]>([]);
  const [kbLoading, setKbLoading] = useState(true);

  // Fetch KB items from kb_vectors (only tickets)
  const fetchKBItems = useCallback(async () => {
    try {
      setKbLoading(true);
      const { data, error } = await supabase
        .from('kb_vectors')
        .select('*')
        .eq('source_type', 'ticket')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching KB items:', error);
        // Don't show toast for network errors
        if (!error.message?.includes('Failed to fetch')) {
          toast.error('Erro ao carregar itens da KB.');
        }
        return;
      }
      setKbItems((data as KBItem[]) || []);
    } catch (error: any) {
      console.error('Error fetching KB items:', error);
      // Don't show toast for network errors
      if (!error?.message?.includes('Failed to fetch')) {
        toast.error('Erro ao carregar itens da KB.');
      }
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

  // Get all unique estruturantes/niveis from scripts as tags
  const allTags = Array.from(new Set([
    ...scripts.map(s => s.estruturante),
    ...scripts.map(s => s.nivel)
  ]));

  // Get all keywords from KB items
  const allKeywords = Array.from(new Set(kbItems.flatMap(item => item.keywords || [])));

  // Filter scripts
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = 
      script.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.situacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || 
      script.estruturante === selectedTag || 
      script.nivel === selectedTag;
    
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

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReindex = async () => {
    await indexAllScripts();
    await indexAllTickets();
    await fetchKBItems();
    toast.success('Reindexação concluída!');
  };

  const goToScript = (script: Script) => {
    navigate(`/scripts?id=${script.id}`);
  };

  if (!user) return null;

  const loading = scriptsLoading || kbLoading;
  const totalItems = scripts.length + filteredKBItems.length;
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
          <Button onClick={() => navigate('/scripts')}>
            Gerenciar Scripts
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, situação ou modelo..."
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
            {[...new Set([...allTags, ...allKeywords])].slice(0, 20).map((tag, index) => (
              <Badge 
                key={`${tag}-${index}`}
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
            <div className="text-sm text-muted-foreground">Scripts Cadastrados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{kbItems.length}</div>
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
            Chamados ({kbItems.length})
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
                      <ScriptKBCard 
                        key={script.id} 
                        script={script} 
                        copiedId={copiedId}
                        onCopy={copyToClipboard}
                        onClick={goToScript}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredKBItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Ticket size={18} className="text-orange-500" />
                    Chamados Encerrados ({filteredKBItems.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredKBItems.map(item => (
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

              {filteredScripts.length === 0 && filteredKBItems.length === 0 && (
                <EmptyState 
                  searchTerm={searchTerm} 
                  selectedTag={selectedTag}
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
                <ScriptKBCard 
                  key={script.id} 
                  script={script} 
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                  onClick={goToScript}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              searchTerm={searchTerm} 
              selectedTag={selectedTag}
              type="scripts"
            />
          )}
        </TabsContent>

        <TabsContent value="tickets">
          {loading ? (
            <LoadingState />
          ) : filteredKBItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKBItems.map(item => (
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
              type="tickets"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Loading State Component
const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Empty State Component
const EmptyState = ({ 
  searchTerm, 
  selectedTag,
  type = 'all'
}: { 
  searchTerm: string; 
  selectedTag: string | null;
  type?: 'all' | 'scripts' | 'tickets';
}) => (
  <Card className="col-span-full">
    <CardContent className="flex flex-col items-center justify-center py-12">
      <Database className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {searchTerm || selectedTag 
          ? 'Nenhum resultado encontrado' 
          : type === 'scripts' 
            ? 'Nenhum script cadastrado'
            : type === 'tickets'
              ? 'Nenhum chamado indexado'
              : 'Biblioteca vazia'
        }
      </h3>
      <p className="text-muted-foreground text-center max-w-md">
        {searchTerm || selectedTag 
          ? 'Tente ajustar os filtros de busca.'
          : type === 'scripts'
            ? 'Acesse a página de Scripts para criar novos scripts.'
            : type === 'tickets'
              ? 'Encerre chamados com acompanhamento para indexá-los na KB.'
              : 'Adicione scripts ou encerre chamados para popular a biblioteca.'
        }
      </p>
    </CardContent>
  </Card>
);

// Script Card for KB (using Script type from scripts table)
const ScriptKBCard = ({ 
  script, 
  copiedId, 
  onCopy,
  onClick
}: { 
  script: Script; 
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onClick: (script: Script) => void;
}) => {
  const getEstruturanteBg = (estruturante: string) => {
    switch (estruturante) {
      case 'PNCP': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'PEN': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getNivelBg = (nivel: string) => {
    switch (nivel) {
      case 'N3': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'N2': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'N1': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClick(script)}>
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-base">
          <FileCode size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{script.nome}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className={getEstruturanteBg(script.estruturante)}>
            {script.estruturante}
          </Badge>
          <Badge variant="outline" className={getNivelBg(script.nivel)}>
            {script.nivel}
          </Badge>
        </div>
        
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Situação</p>
          <p className="text-sm line-clamp-2">{script.situacao}</p>
        </div>
        
        <div className="bg-secondary/50 rounded-md p-2 mb-3 max-h-24 overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground mb-1">Modelo de Resposta</p>
          <pre className="text-xs font-mono line-clamp-3 whitespace-pre-wrap">
            {script.modelo}
          </pre>
        </div>

        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar size={12} className="mr-1" />
          {format(new Date(script.updatedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex gap-1">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(script.modelo, script.id);
          }}
        >
          {copiedId === script.id ? (
            <Check size={14} className="mr-1 text-green-500" />
          ) : (
            <Copy size={14} className="mr-1" />
          )}
          Copiar Modelo
        </Button>
      </CardFooter>
    </Card>
  );
};

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
