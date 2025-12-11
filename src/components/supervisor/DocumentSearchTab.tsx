import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileUp, Search, Loader2, FileText, X, AlertCircle } from 'lucide-react';
import AISearchResults from './AISearchResults';

interface AnaliseInterna {
  fontesEncontradas: string[];
  trechosRelevantes: string[];
}

interface SearchResult {
  analiseInterna?: AnaliseInterna;
  explicacaoTecnica: string;
  respostasFormais: string[];
  confiancaEstimada: number;
  observacoes?: string;
  // Legacy fields
  sugestaoResposta1?: string;
  sugestaoResposta2?: string;
  fundamentacaoTecnica?: string;
  trechosRelevantes?: string[];
  confianca?: string;
}

const DocumentSearchTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sourceInfo, setSourceInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          
          if (file.type === 'application/pdf') {
            // For PDF, we'll send the raw text content
            // In a production app, you'd use a PDF parsing library
            if (typeof content === 'string') {
              resolve(content);
            } else if (content instanceof ArrayBuffer) {
              // Convert ArrayBuffer to text (basic extraction)
              const decoder = new TextDecoder('utf-8');
              const text = decoder.decode(content);
              // Extract readable text from PDF (basic approach)
              const extractedText = text
                .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              resolve(extractedText || 'Não foi possível extrair texto do PDF. Tente um arquivo de texto.');
            }
          } else if (file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
            // For EPUB, extract text content
            if (content instanceof ArrayBuffer) {
              const decoder = new TextDecoder('utf-8');
              const text = decoder.decode(content);
              // Basic text extraction from EPUB
              const extractedText = text
                .replace(/<[^>]+>/g, ' ')
                .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              resolve(extractedText || 'Não foi possível extrair texto do EPUB.');
            }
          } else {
            // Plain text file
            resolve(typeof content === 'string' ? content : '');
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      
      if (file.type === 'application/pdf' || file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['application/pdf', 'application/epub+zip', 'text/plain'];
    const isEpub = selectedFile.name.endsWith('.epub');
    
    if (!validTypes.includes(selectedFile.type) && !isEpub) {
      toast.error('Formato inválido. Use PDF, EPUB ou TXT.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    setFile(selectedFile);
    setExtracting(true);
    setResult(null);

    try {
      const content = await extractTextFromFile(selectedFile);
      setFileContent(content);
      toast.success(`Arquivo processado: ${content.length} caracteres extraídos`);
    } catch (error) {
      console.error('Error extracting text:', error);
      toast.error('Erro ao processar arquivo');
      setFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileContent('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSearch = async () => {
    if (!fileContent) {
      toast.error('Faça upload de um documento primeiro');
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
          documentContent: fileContent,
          documentTitle: file?.name
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

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">📁 Upload de Documento (PDF ou EPUB)</Label>
        
        {!file ? (
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Clique ou arraste um arquivo PDF ou EPUB
            </p>
            <p className="text-xs text-muted-foreground">Máximo 20MB</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                    {fileContent && ` • ${fileContent.length.toLocaleString()} caracteres`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {extracting && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extraindo texto...
              </div>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Query Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">🔍 Problema do Usuário</Label>
        <Textarea
          placeholder="Ex: O usuário está com erro de hash ao tramitar processo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      {/* Search Button */}
      <Button 
        className="w-full" 
        onClick={handleSearch}
        disabled={loading || !fileContent || !query.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analisando documento...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Buscar no Documento
          </>
        )}
      </Button>

      {/* Results */}
      {result && <AISearchResults result={result} sourceInfo={sourceInfo} />}
    </div>
  );
};

export default DocumentSearchTab;
