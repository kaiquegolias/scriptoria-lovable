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

interface PdfExtractionResult {
  text: string;
  pageImages: string[];
}

const extractPdfContent = async (file: File): Promise<PdfExtractionResult> => {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const pageImages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const positionedItems = content.items
      .filter((item) => 'str' in item && item.str.trim())
      .map((item) => {
        const textItem = item as { str: string; transform?: number[] };
        return { str: textItem.str.trim(), x: textItem.transform?.[4] ?? 0, y: textItem.transform?.[5] ?? 0 };
      })
      .sort((a, b) => Math.abs(b.y - a.y) > 4 ? b.y - a.y : a.x - b.x);

    const lines: string[] = [];
    positionedItems.forEach((item) => {
      const last = lines[lines.length - 1];
      const previous = positionedItems[positionedItems.indexOf(item) - 1];
      if (!last || (previous && Math.abs(previous.y - item.y) > 4)) lines.push(item.str);
      else lines[lines.length - 1] = `${last} ${item.str}`;
    });
    const text = lines.join('\n');
    pages.push(text);

    if (pageNumber <= 6) {
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.max(1.15, 1400 / baseViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        pageImages.push(canvas.toDataURL('image/jpeg', 0.78));
      }
    }
  }

  return { text: pages.join('\n\n').trim(), pageImages };
};

const parseBrazilianDate = (value?: string) => {
  if (!value) return '';
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return value.trim();
  const [, day, month, year, hour = '00', minute = '00', second = '00'] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

const extractByLabel = (text: string, labels: string[], stopLabels: string[] = []) => {
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const escapedStops = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const stop = escapedStops ? `(?=\\n\\s*(?:${escapedStops})\\s*:?|$)` : '(?=\\n|$)';
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${escapedLabels})\\s*:?\\s*([\\s\\S]*?)${stop}`, 'i');
  return text.match(regex)?.[1]?.replace(/\s+/g, ' ').trim() || '';
};

const extractLocalMexxData = (text: string): ExtractedMexxData => {
  const stopLabels = ['Campos Personalizados', 'Anexos', 'Histórico', 'Comentários', 'Interações', 'SLA', 'Atendimento', 'Descrição'];
  const numero = text.match(/(?:N[º°o.]|Número do chamado|Chamado)\s*[:#-]?\s*(\d{4,})/i)?.[1] || '';
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const descricao = extractByLabel(text, ['Descrição', 'Descricao'], ['Campos Personalizados', 'Anexos', 'Histórico', 'Comentários', 'Interações']) || text.slice(0, 1200);
  const camposPersonalizados: Record<string, string> = {};
  const customBlock = text.split(/Campos Personalizados/i)[1]?.split(/(?:Anexos|Histórico|Comentários|Interações)/i)[0] || '';
  customBlock.split('\n').forEach((line) => {
    const match = line.match(/^\s*([^:]{3,80})\s*:\s*(.+)$/);
    if (match) camposPersonalizados[match[1].trim()] = match[2].trim();
  });

  return {
    numero_chamado: numero,
    titulo: numero ? `Chamado MEXX Nº ${numero}` : 'Chamado importado do MEXX',
    usuario_nome: extractByLabel(text, ['Nome do usuário', 'Nome do usuario', 'Solicitante', 'Usuário', 'Usuario'], stopLabels),
    usuario_email: email,
    usuario_telefone: extractByLabel(text, ['Telefone', 'Celular'], stopLabels),
    usuario_cpf: text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/)?.[0] || '',
    data_abertura: parseBrazilianDate(extractByLabel(text, ['Data da abertura', 'Data de abertura', 'Aberto em', 'Criado em'], stopLabels)),
    responsavel: extractByLabel(text, ['Responsável', 'Responsavel'], stopLabels) || 'KAIQUE MATHEUS NEVES MACHADO',
    prioridade: extractByLabel(text, ['Prioridade'], stopLabels),
    categoria: extractByLabel(text, ['Categoria'], stopLabels),
    orgao: extractByLabel(text, ['Órgão', 'Orgao', 'Nome do órgão', 'Nome do orgao'], stopLabels),
    descricao,
    tem_anexo: /\b(anexo|anexos|arquivo anexado|evid[eê]ncias? anexad[ao]s?)\b/i.test(text) && !/sem anexo|não possui anexo|nao possui anexo/i.test(text),
    sla_atendimento: extractByLabel(text, ['SLA Atendimento', 'SLA de Atendimento'], stopLabels),
    sla_solucao: extractByLabel(text, ['SLA Solução', 'SLA Solucao', 'SLA de Solução', 'SLA de Solucao'], stopLabels),
    previsao_solucao: extractByLabel(text, ['Previsão de solução', 'Previsao de solucao'], stopLabels),
    time_atendimento: extractByLabel(text, ['Time de atendimento', 'Time Atendimento'], stopLabels),
    tipo_chamado: extractByLabel(text, ['Tipo de chamado', 'Tipo Chamado'], stopLabels),
    status_portal: extractByLabel(text, ['Status', 'Status portal', 'Status do portal'], stopLabels),
    chave_ativacao: extractByLabel(text, ['Chave de ativação', 'Chave de ativacao'], stopLabels),
    campos_personalizados: camposPersonalizados,
  };
};

const mergeExtractedData = (primary: ExtractedMexxData, fallback: ExtractedMexxData): ExtractedMexxData => ({
  ...fallback,
  ...Object.fromEntries(Object.entries(primary).filter(([, value]) => {
    if (typeof value === 'boolean') return true;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return String(value || '').trim().length > 0;
  })),
  responsavel: 'KAIQUE MATHEUS NEVES MACHADO',
  campos_personalizados: {
    ...(fallback.campos_personalizados || {}),
    ...(primary.campos_personalizados || {}),
  },
});

const hasUsefulMexxData = (data: ExtractedMexxData) => Boolean(
  data.numero_chamado || data.usuario_nome || data.usuario_email || data.orgao || data.descricao ||
  (data.campos_personalizados && Object.keys(data.campos_personalizados).length > 0)
);

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
    let pdfText = '';

    try {
      const pdfContent = await extractPdfContent(file);
      pdfText = pdfContent.text;
      const localData = pdfText ? extractLocalMexxData(pdfText) : {} as ExtractedMexxData;
      const { data, error } = await supabase.functions.invoke('extract-mexx-pdf', {
        body: { pdfText, pageImages: pdfContent.pageImages, fileName: file.name },
      });

      if (error || data?.fallback || data?.error) {
        console.warn('Extração via IA indisponível, usando extração local:', error || data?.error);
        if (hasUsefulMexxData(localData)) {
          onExtracted(localData);
          setSuccess(true);
          toast.success('Chamado extraído localmente. Revise os campos e salve.', { id: t });
        } else {
          toast.error(data?.error || 'Não consegui identificar os dados do MEXX neste PDF.', { id: t });
        }
        return;
      }

      const extracted = mergeExtractedData(data.data as ExtractedMexxData, localData);
      onExtracted(extracted);
      setSuccess(true);
      toast.success('Chamado extraído! Revise os campos e salve.', { id: t });
    } catch (e) {
      console.error(e);
      if (pdfText) {
        const localData = extractLocalMexxData(pdfText);
        if (hasUsefulMexxData(localData)) {
          onExtracted(localData);
          setSuccess(true);
          toast.success('Chamado extraído localmente. Revise os campos e salve.', { id: t });
        } else {
          toast.error('Não consegui identificar os dados do MEXX neste PDF.', { id: t });
        }
        return;
      }
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
