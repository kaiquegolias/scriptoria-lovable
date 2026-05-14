import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { supabase } from '@/integrations/supabase/client';

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

export interface PdfExtractionResult {
  text: string;
  pageImages: string[];
}

export const extractPdfContent = async (
  file: File,
  onProgress?: (pct: number) => void
): Promise<PdfExtractionResult> => {
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
        const ti = item as { str: string; transform?: number[] };
        return { str: ti.str.trim(), x: ti.transform?.[4] ?? 0, y: ti.transform?.[5] ?? 0 };
      })
      .sort((a, b) => Math.abs(b.y - a.y) > 4 ? b.y - a.y : a.x - b.x);

    const lines: string[] = [];
    positionedItems.forEach((item) => {
      const last = lines[lines.length - 1];
      const previous = positionedItems[positionedItems.indexOf(item) - 1];
      if (!last || (previous && Math.abs(previous.y - item.y) > 4)) lines.push(item.str);
      else lines[lines.length - 1] = `${last} ${item.str}`;
    });
    pages.push(lines.join('\n'));

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
    onProgress?.(Math.round((pageNumber / pdf.numPages) * 70));
  }

  return { text: pages.join('\n\n').trim(), pageImages };
};

const parseBrazilianDate = (value?: string) => {
  if (!value) return '';
  const m = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return value.trim();
  const [, d, mo, y, h = '00', mi = '00', s = '00'] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
};

const extractByLabel = (text: string, labels: string[], stopLabels: string[] = []) => {
  const esc = (l: string) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escLabels = labels.map(esc).join('|');
  const escStops = stopLabels.map(esc).join('|');
  const stop = escStops ? `(?=\\n\\s*(?:${escStops})\\s*:?|$)` : '(?=\\n|$)';
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${escLabels})\\s*:?\\s*([\\s\\S]*?)${stop}`, 'i');
  return text.match(regex)?.[1]?.replace(/\s+/g, ' ').trim() || '';
};

export const extractLocalMexxData = (text: string): ExtractedMexxData => {
  const stops = ['Campos Personalizados', 'Anexos', 'Histórico', 'Comentários', 'Interações', 'SLA', 'Atendimento', 'Descrição'];
  const numero = text.match(/(?:N[º°o.]|Número do chamado|Chamado)\s*[:#-]?\s*(\d{4,})/i)?.[1] || '';
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const descricao = extractByLabel(text, ['Descrição', 'Descricao'], ['Campos Personalizados', 'Anexos', 'Histórico', 'Comentários', 'Interações']) || text.slice(0, 1200);
  const camposPersonalizados: Record<string, string> = {};
  const block = text.split(/Campos Personalizados/i)[1]?.split(/(?:Anexos|Histórico|Comentários|Interações)/i)[0] || '';
  block.split('\n').forEach((line) => {
    const m = line.match(/^\s*([^:]{3,80})\s*:\s*(.+)$/);
    if (m) camposPersonalizados[m[1].trim()] = m[2].trim();
  });

  return {
    numero_chamado: numero,
    titulo: numero ? `Chamado MEXX Nº ${numero}` : 'Chamado importado do MEXX',
    usuario_nome: extractByLabel(text, ['Nome do usuário', 'Nome do usuario', 'Solicitante', 'Usuário', 'Usuario'], stops),
    usuario_email: email,
    usuario_telefone: extractByLabel(text, ['Telefone', 'Celular'], stops),
    usuario_cpf: text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/)?.[0] || '',
    data_abertura: parseBrazilianDate(extractByLabel(text, ['Data da abertura', 'Data de abertura', 'Aberto em', 'Criado em'], stops)),
    responsavel: extractByLabel(text, ['Responsável', 'Responsavel'], stops) || 'KAIQUE MATHEUS NEVES MACHADO',
    prioridade: extractByLabel(text, ['Prioridade'], stops),
    categoria: extractByLabel(text, ['Categoria'], stops),
    orgao: extractByLabel(text, ['Órgão', 'Orgao', 'Nome do órgão', 'Nome do orgao'], stops),
    descricao,
    tem_anexo: /\b(anexo|anexos|arquivo anexado|evid[eê]ncias? anexad[ao]s?)\b/i.test(text) && !/sem anexo|não possui anexo|nao possui anexo/i.test(text),
    sla_atendimento: extractByLabel(text, ['SLA Atendimento', 'SLA de Atendimento'], stops),
    sla_solucao: extractByLabel(text, ['SLA Solução', 'SLA Solucao', 'SLA de Solução', 'SLA de Solucao'], stops),
    previsao_solucao: extractByLabel(text, ['Previsão de solução', 'Previsao de solucao'], stops),
    time_atendimento: extractByLabel(text, ['Time de atendimento', 'Time Atendimento'], stops),
    tipo_chamado: extractByLabel(text, ['Tipo de chamado', 'Tipo Chamado'], stops),
    status_portal: extractByLabel(text, ['Status', 'Status portal', 'Status do portal'], stops),
    chave_ativacao: extractByLabel(text, ['Chave de ativação', 'Chave de ativacao'], stops),
    campos_personalizados: camposPersonalizados,
  };
};

export const mergeExtractedData = (primary: ExtractedMexxData, fallback: ExtractedMexxData): ExtractedMexxData => ({
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

export const hasUsefulMexxData = (data: ExtractedMexxData) => Boolean(
  data.numero_chamado || data.usuario_nome || data.usuario_email || data.orgao || data.descricao ||
  (data.campos_personalizados && Object.keys(data.campos_personalizados).length > 0)
);

export interface RunMexxExtractionResult {
  data: ExtractedMexxData;
  source: 'ai' | 'local';
}

export const runMexxExtraction = async (
  file: File,
  onProgress?: (pct: number) => void
): Promise<RunMexxExtractionResult> => {
  onProgress?.(5);
  const pdfContent = await extractPdfContent(file, onProgress);
  const localData = pdfContent.text ? extractLocalMexxData(pdfContent.text) : {} as ExtractedMexxData;
  onProgress?.(75);

  try {
    const { data, error } = await supabase.functions.invoke('extract-mexx-pdf', {
      body: { pdfText: pdfContent.text, pageImages: pdfContent.pageImages, fileName: file.name },
    });
    onProgress?.(95);

    if (error || data?.fallback || data?.error || !data?.data) {
      console.warn('IA indisponível, usando extração local:', error || data?.error);
      if (hasUsefulMexxData(localData)) {
        onProgress?.(100);
        return { data: localData, source: 'local' };
      }
      throw new Error(data?.error || 'Não foi possível identificar dados do MEXX neste PDF.');
    }

    const merged = mergeExtractedData(data.data as ExtractedMexxData, localData);
    onProgress?.(100);
    return { data: merged, source: 'ai' };
  } catch (e) {
    if (hasUsefulMexxData(localData)) {
      onProgress?.(100);
      return { data: localData, source: 'local' };
    }
    throw e;
  }
};
