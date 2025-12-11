import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, Search, Loader2, Globe, CheckCircle, XCircle } from 'lucide-react';
import AISearchResults from './AISearchResults';

interface SearchResult {
  sugestaoResposta1: string;
  sugestaoResposta2: string;
  fundamentacaoTecnica: string;
  trechosRelevantes: string[];
  confianca: string;
  observacoes?: string;
}

interface CrawlResult {
  url: string;
  content: string;
  error?: string;
}

const URLCrawlerTab: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawledUrls, setCrawledUrls] = useState<CrawlResult[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sourceInfo, setSourceInfo] = useState('');

  const parseUrls = (input: string): string[] => {
    return input
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return url.startsWith('http://') || url.startsWith('https://');
        }
      });
  };

  const handleCrawl = async () => {
    const urls = parseUrls(urlInput);
    
    if (urls.length === 0) {
      toast.error('Insira pelo menos uma URL válida');
      return;
    }

    if (urls.length > 10) {
      toast.warning('Máximo de 10 URLs. Apenas as primeiras 10 serão processadas.');
    }

    setCrawling(true);
    setCrawledUrls([]);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('crawl-urls', {
        body: { urls: urls.slice(0, 10) }
      });

      if (error) throw error;

      if (data.success) {
        setCrawledUrls(data.results || []);
        toast.success(`${data.successCount}/${data.totalProcessed} URLs processadas com sucesso`);
        
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: CrawlResult) => {
            console.warn(`Failed to crawl ${err.url}: ${err.error}`);
          });
        }
      } else {
        toast.error(data.error || 'Erro ao processar URLs');
      }
    } catch (error) {
      console.error('Crawl error:', error);
      toast.error('Erro ao processar URLs');
    } finally {
      setCrawling(false);
    }
  };

  const handleSearch = async () => {
    if (crawledUrls.length === 0) {
      toast.error('Primeiro processe as URLs');
      return;
    }

    if (!query.trim()) {
      toast.error('Digite o problema do usuário');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-document-search', {
        body: {
          query: query.trim(),
          urlContents: crawledUrls.map(u => ({ url: u.url, content: u.content }))
        }
      });

      if (error) throw error;

      if (data.success && data.result) {
        setResult(data.result);
        setSourceInfo(data.sourceInfo || '');
        toast.success('Análise concluída!');
      } else {
        toast.error(data.error || 'Erro na análise');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erro ao processar busca');
    } finally {
      setLoading(false);
    }
  };

  const urls = parseUrls(urlInput);

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">🔗 URLs para Análise</Label>
        <Textarea
          placeholder={`Cole as URLs aqui (uma por linha ou separadas por vírgula):

https://www.gov.br/gestao/pt-br/processoeletronico
https://www.gov.br/economia/pt-br/...
https://wiki.processoeletronico.gov.br/...`}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="min-h-[120px] font-mono text-sm"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {urls.length} URL(s) detectada(s) • Máximo 10
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCrawl}
            disabled={crawling || urls.length === 0}
          >
            {crawling ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-1" />
                Processar URLs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Crawled URLs Status */}
      {crawledUrls.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">URLs Processadas</Label>
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2 max-h-[150px] overflow-y-auto">
            {crawledUrls.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {item.error ? (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
                <span className="truncate flex-1">{item.url}</span>
                {!item.error && (
                  <Badge variant="secondary" className="text-xs">
                    {item.content.length.toLocaleString()} chars
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">🔍 Problema do Usuário</Label>
        <Textarea
          placeholder="Ex: Como tramitar processo eletrônico entre órgãos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      {/* Search Button */}
      <Button 
        className="w-full" 
        onClick={handleSearch}
        disabled={loading || crawledUrls.length === 0 || !query.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analisando conteúdo...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Buscar nas Páginas
          </>
        )}
      </Button>

      {/* Results */}
      {result && <AISearchResults result={result} sourceInfo={sourceInfo} />}
    </div>
  );
};

export default URLCrawlerTab;
