import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedMexxData {
  numero_chamado?: string;
  titulo?: string;
  usuario_nome?: string;
  usuario_email?: string;
  usuario_telefone?: string;
  usuario_cpf?: string;
  data_abertura?: string;
  responsavel?: string;
  prioridade?: string;
  categoria?: string;
  orgao?: string;
  descricao?: string;
  tem_anexo?: boolean;
  sla_atendimento?: string;
  sla_solucao?: string;
  previsao_solucao?: string;
  time_atendimento?: string;
  tipo_chamado?: string;
  status_portal?: string;
  chave_ativacao?: string;
  campos_personalizados?: Record<string, string>;
}

interface Props {
  onExtracted: (data: ExtractedMexxData) => void;
}

const extractPdfText = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n').trim();
};

const MexxPdfImport: React.FC<Props> = ({ onExtracted }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF muito grande (máx 10MB).');
      return;
    }

    setLoading(true);
    setFileName(file.name);
    setSuccess(false);
    const t = toast.loading('Analisando PDF do MEXX com IA...');

    try {
      const pdfBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('extract-mexx-pdf', {
        body: { pdfBase64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onExtracted(data.data as ExtractedMexxData);
      setSuccess(true);
      toast.success('Chamado extraído! Revise os campos e salve.', { id: t });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Falha ao extrair PDF', { id: t });
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="relative rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4 transition hover:border-primary/60"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : success ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Sparkles className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            Importar do PDF / MEXX
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">IA</span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {fileName ? (
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{fileName}</span>
            ) : (
              'Arraste um PDF do Portal MEXX aqui ou clique para selecionar.'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {loading ? 'Analisando...' : 'Selecionar PDF'}
        </button>
      </div>
    </div>
  );
};

export default MexxPdfImport;
