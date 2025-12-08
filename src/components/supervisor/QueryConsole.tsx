import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  HelpCircle, 
  Star, 
  StarOff, 
  Save,
  Play,
  X,
  Trash2
} from 'lucide-react';
import { getQueryHelp } from '@/utils/queryParser';
import { useSavedQueries, SavedQuery } from '@/hooks/useSavedQueries';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QueryConsoleProps {
  onSearch: (query: string) => void;
  currentQuery: string;
}

const QueryConsole: React.FC<QueryConsoleProps> = ({ onSearch, currentQuery }) => {
  const [query, setQuery] = useState(currentQuery);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const { queries, createQuery, deleteQuery, toggleFavorite, loading } = useSavedQueries();

  const handleSearch = () => {
    onSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSave = async () => {
    if (!saveForm.name.trim() || !query.trim()) return;
    
    await createQuery({
      name: saveForm.name,
      description: saveForm.description,
      query: query,
    });
    
    setShowSaveDialog(false);
    setSaveForm({ name: '', description: '' });
  };

  const handleLoadQuery = (savedQuery: SavedQuery) => {
    setQuery(savedQuery.query);
    onSearch(savedQuery.query);
  };

  const helpLines = getQueryHelp();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Console de Consultas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium">Ajuda de Consultas</h4>
                  <ScrollArea className="h-[300px]">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {helpLines.join('\n')}
                    </pre>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua consulta... Ex: type=erro AND severity=critical"
              className="pr-10 font-mono text-sm"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setQuery('');
                  onSearch('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={handleSearch}>
            <Play className="h-4 w-4 mr-2" />
            Executar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowSaveDialog(true)}
            disabled={!query.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>

        {/* Quick Examples */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Exemplos rápidos:</span>
          {[
            'severity=error',
            'type=login OR type=logout',
            'date:24h',
            'severity=critical AND origin=chamados',
          ].map((example) => (
            <Badge
              key={example}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => {
                setQuery(example);
                onSearch(example);
              }}
            >
              {example}
            </Badge>
          ))}
        </div>

        {/* Saved Queries */}
        {queries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Consultas Salvas</h4>
            <div className="flex flex-wrap gap-2">
              {queries.slice(0, 5).map((savedQuery) => (
                <div key={savedQuery.id} className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleLoadQuery(savedQuery)}
                  >
                    {savedQuery.is_favorite && <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />}
                    {savedQuery.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleFavorite(savedQuery.id)}
                  >
                    {savedQuery.is_favorite ? (
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    ) : (
                      <StarOff className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteQuery(savedQuery.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="query-name">Nome</Label>
              <Input
                id="query-name"
                value={saveForm.name}
                onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                placeholder="Minha consulta..."
              />
            </div>
            <div>
              <Label htmlFor="query-desc">Descrição (opcional)</Label>
              <Textarea
                id="query-desc"
                value={saveForm.description}
                onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                placeholder="Descreva o que esta consulta busca..."
                rows={2}
              />
            </div>
            <div>
              <Label>Consulta</Label>
              <pre className="text-sm p-3 bg-muted rounded-md font-mono">{query}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!saveForm.name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QueryConsole;
