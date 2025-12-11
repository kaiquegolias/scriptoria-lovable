import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, Plus, Trash2 } from 'lucide-react';

interface DocumentEntry {
  title: string;
  content: string;
  category: string;
  keywords: string;
}

const WikiPENImporter: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentEntry[]>([
    { title: '', content: '', category: '', keywords: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const addDocument = () => {
    setDocuments([...documents, { title: '', content: '', category: '', keywords: '' }]);
  };

  const removeDocument = (index: number) => {
    if (documents.length > 1) {
      setDocuments(documents.filter((_, i) => i !== index));
    }
  };

  const updateDocument = (index: number, field: keyof DocumentEntry, value: string) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
  };

  const handleImport = async () => {
    const validDocs = documents.filter(doc => doc.title.trim() && doc.content.trim());
    
    if (validDocs.length === 0) {
      toast.error('Adicione pelo menos um documento com título e conteúdo');
      return;
    }

    setLoading(true);
    try {
      const docsToImport = validDocs.map(doc => ({
        title: doc.title.trim(),
        content: doc.content.trim(),
        category: doc.category.trim() || null,
        keywords: doc.keywords.split(',').map(k => k.trim()).filter(k => k)
      }));

      const { data, error } = await supabase.functions.invoke('import-kb-content', {
        body: { documents: docsToImport, source: 'wiki_pen' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${data.insertedCount} documento(s) importado(s) com sucesso!`);
        setImportedCount(prev => prev + data.insertedCount);
        setDocuments([{ title: '', content: '', category: '', keywords: '' }]);
      } else {
        toast.error(data.error || 'Erro ao importar documentos');
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erro ao importar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error('Área de transferência vazia');
        return;
      }

      // Try to parse as sections separated by headers
      const sections = text.split(/(?=^#+ )/gm).filter(s => s.trim());
      
      if (sections.length > 1) {
        const newDocs: DocumentEntry[] = sections.map(section => {
          const lines = section.trim().split('\n');
          const titleMatch = lines[0].match(/^#+\s*(.+)$/);
          const title = titleMatch ? titleMatch[1] : lines[0].substring(0, 100);
          const content = lines.slice(1).join('\n').trim() || section;
          
          return {
            title: title.trim(),
            content: content.trim(),
            category: 'WikiPEN',
            keywords: ''
          };
        });

        setDocuments(newDocs);
        toast.success(`${newDocs.length} seções detectadas e preparadas para importação`);
      } else {
        // Single document
        setDocuments([{
          title: 'Documento WikiPEN',
          content: text.trim(),
          category: 'WikiPEN',
          keywords: ''
        }]);
        toast.info('Conteúdo colado como documento único');
      }
    } catch (err) {
      toast.error('Erro ao ler área de transferência');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar WikiPEN
          </CardTitle>
          {importedCount > 0 && (
            <Badge variant="secondary">
              <CheckCircle className="h-3 w-3 mr-1" />
              {importedCount} importados
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBulkPaste}>
            <Upload className="h-4 w-4 mr-1" />
            Colar da Área de Transferência
          </Button>
          <Button variant="outline" size="sm" onClick={addDocument}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Documento
          </Button>
        </div>

        <div className="space-y-6 max-h-[400px] overflow-y-auto">
          {documents.map((doc, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Documento {index + 1}</span>
                {documents.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Título *</Label>
                  <Input
                    placeholder="Título do documento"
                    value={doc.title}
                    onChange={(e) => updateDocument(index, 'title', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Input
                    placeholder="Ex: Tramitação, Assinatura..."
                    value={doc.category}
                    onChange={(e) => updateDocument(index, 'category', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
                <Input
                  placeholder="pen, tramitação, assinatura..."
                  value={doc.keywords}
                  onChange={(e) => updateDocument(index, 'keywords', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Conteúdo *</Label>
                <Textarea
                  placeholder="Cole o conteúdo do documento aqui..."
                  value={doc.content}
                  onChange={(e) => updateDocument(index, 'content', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={handleImport}
          disabled={loading || !documents.some(d => d.title.trim() && d.content.trim())}
        >
          {loading ? 'Importando...' : 'Importar Documentos'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Os documentos importados serão usados pelo Gemini para melhorar as sugestões de respostas.
        </p>
      </CardContent>
    </Card>
  );
};

export default WikiPENImporter;
