import React, { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FileUp, FileText, X, Loader2, Globe, Plus, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const extractPdfText = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: any) => 'str' in item && item.str.trim())
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n\n').replace(/\s+/g, ' ').trim();
};

interface UploadedDoc {
  name: string;
  size: number;
  status: 'extracting' | 'saving' | 'done' | 'error';
  chars?: number;
  error?: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.epub', '.xls', '.xlsx', '.txt', '.csv'];

const extractTextFromFile = async (file: File): Promise<string> => {
  const nameLower = file.name.toLowerCase();
  if (file.type === 'application/pdf' || nameLower.endsWith('.pdf')) {
    const text = await extractPdfText(file);
    if (!text || text.length < 20) {
      throw new Error('PDF sem texto extraível (possivelmente escaneado). Use OCR antes de subir.');
    }
    return text;
  }
  if (nameLower.endsWith('.epub')) {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer)
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\u00C0-\u00FF]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  return await file.text();
};

const CortanaDocumentUpload: React.FC<{ onDocumentAdded?: () => void }> = ({ onDocumentAdded }) => {
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAccepted = (file: File) => {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    return ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const saveToKB = async (title: string, content: string, source: string, category: string) => {
    const keywords = content.toLowerCase()
      .split(/\s+/).filter(w => w.length > 3)
      .reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);

    const { error } = await supabase.from('kb_documents').insert({
      title, content: content.substring(0, 50000), source, category,
      keywords: topKeywords,
    });
    if (error) throw error;
  };

  const processFile = useCallback(async (file: File) => {
    const docEntry: UploadedDoc = { name: file.name, size: file.size, status: 'extracting' };
    setUploads(prev => [...prev, docEntry]);

    try {
      const content = await extractTextFromFile(file);
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'saving', chars: content.length } : u));

      const category = file.name.endsWith('.pdf') ? 'Documento PDF'
        : file.name.endsWith('.epub') ? 'Documento EPUB'
        : file.name.match(/\.xlsx?$/) ? 'Planilha XLS'
        : 'Documento';

      await saveToKB(file.name, content, `upload:${file.name}`, category);
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'done' } : u));
      toast.success(`"${file.name}" adicionado à base de conhecimento!`);
      onDocumentAdded?.();
    } catch (err) {
      console.error('Error processing file:', err);
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', error: 'Erro ao processar' } : u));
      toast.error(`Erro ao processar "${file.name}"`);
    }
  }, [onDocumentAdded]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!isAccepted(file)) {
        toast.error(`Formato não suportado: ${file.name}`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Arquivo muito grande: ${file.name} (máx 20MB)`);
        return;
      }
      processFile(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setUrlLoading(true);
    const docName = `URL: ${url}`;
    setUploads(prev => [...prev, { name: docName, size: 0, status: 'extracting' }]);

    try {
      const { data, error } = await supabase.functions.invoke('crawl-urls', {
        body: { urls: [url] },
      });

      if (error) throw error;

      const results = data?.results || [];
      if (results.length === 0 || !results[0]?.content) {
        throw new Error('Não foi possível extrair conteúdo da URL');
      }

      const content = results[0].content;
      setUploads(prev => prev.map(u => u.name === docName ? { ...u, status: 'saving', chars: content.length } : u));

      await saveToKB(results[0].title || url, content, `url:${url}`, 'Página Web');
      setUploads(prev => prev.map(u => u.name === docName ? { ...u, status: 'done' } : u));
      toast.success(`Conteúdo de "${url}" adicionado à base!`);
      setUrlInput('');
      onDocumentAdded?.();
    } catch (err) {
      console.error('Error crawling URL:', err);
      setUploads(prev => prev.map(u => u.name === docName ? { ...u, status: 'error', error: 'Erro ao acessar URL' } : u));
      toast.error('Erro ao processar URL');
    } finally {
      setUrlLoading(false);
    }
  };

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'done' && u.status !== 'error'));
  };

  const hasCompleted = uploads.some(u => u.status === 'done' || u.status === 'error');

  return (
    <div className="space-y-5">
      {/* Drag & drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileUp className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, EPUB, XLS, XLSX, TXT, CSV • Máximo 20MB por arquivo
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {['PDF', 'EPUB', 'XLS', 'XLSX', 'TXT'].map(ext => (
              <Badge key={ext} variant="secondary" className="text-[10px] px-2 py-0.5">{ext}</Badge>
            ))}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          multiple
        />
      </div>

      {/* URL input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Importar de URL (Gov, documentação, etc.)
        </Label>
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.gov.br/gestao/pt-br/..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button onClick={handleUrlSubmit} disabled={urlLoading || !urlInput.trim()} size="sm" className="px-4">
            {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Processamento</Label>
            {hasCompleted && (
              <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-xs h-7">
                Limpar concluídos
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploads.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex-shrink-0">
                  {doc.status === 'done' && <Check className="h-4 w-4 text-green-500" />}
                  {doc.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {(doc.status === 'extracting' || doc.status === 'saving') && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.status === 'extracting' && 'Extraindo texto...'}
                    {doc.status === 'saving' && `Salvando na base... (${doc.chars?.toLocaleString()} chars)`}
                    {doc.status === 'done' && `✅ Adicionado à base (${doc.chars?.toLocaleString()} chars)`}
                    {doc.status === 'error' && doc.error}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CortanaDocumentUpload;
