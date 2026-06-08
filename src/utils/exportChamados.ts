import * as XLSX from 'xlsx';
import { Chamado } from '@/components/chamados/ChamadoCard';

const STATUS_LABELS: Record<string, string> = {
  agendados: 'Agendados',
  agendados_planner: 'Agendados PLANNER',
  agendados_aguardando: 'Aguardando devolutiva',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  excluido: 'Excluído',
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('pt-BR');
  } catch {
    return '';
  }
};

const formatDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

const formatCampos = (c?: Record<string, string>): string => {
  if (!c) return '';
  return Object.entries(c).map(([k, v]) => `${k}: ${v}`).join('\n');
};

export interface ExportFilters {
  dateField?: 'dataCriacao' | 'dataAtualizacao' | 'dataAberturaPortal';
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
  produto?: string; // PEN produto, '' = todos
  estruturante?: string;
}

export const applyExportFilters = (chamados: Chamado[], filters: ExportFilters): Chamado[] => {
  let result = chamados;
  const field = filters.dateField || 'dataCriacao';

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom + 'T00:00:00');
    result = result.filter(c => {
      const v = c[field];
      return v && new Date(v) >= from;
    });
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo + 'T23:59:59');
    result = result.filter(c => {
      const v = c[field];
      return v && new Date(v) <= to;
    });
  }
  if (filters.produto) {
    result = result.filter(c => (c.penProduto || '').toLowerCase() === filters.produto!.toLowerCase());
  }
  if (filters.estruturante) {
    result = result.filter(c => c.estruturante === filters.estruturante);
  }
  return result;
};

const HEADERS = [
  'Nº Chamado', 'Título', 'Status', 'Estruturante', 'Nível', 'Assunto',
  'Produto PEN', 'Módulo PEN', 'PO', 'PO Substituto', 'Rep. Técnico',
  'Solicitante', 'E-mail', 'Telefone', 'CPF', 'Órgão',
  'Prioridade', 'Categoria', 'Tipo', 'Time', 'Responsável',
  'SLA Atendimento', 'SLA Solução', 'Tem Anexo',
  'Data Abertura Portal', 'Data Criação', 'Última Atualização',
  'Data Limite', 'Previsão Solução',
  'Acompanhamento', 'Descrição Completa', 'Campos Personalizados', 'Links',
];

const COL_WIDTHS = [
  14, 42, 22, 14, 8, 22,
  22, 22, 22, 22, 22,
  26, 28, 16, 16, 22,
  14, 18, 16, 18, 22,
  18, 18, 10,
  20, 20, 20, 20, 20,
  50, 60, 40, 40,
];

const chamadoToRow = (c: Chamado) => [
  c.numeroChamado || '',
  c.titulo,
  STATUS_LABELS[c.status] || c.status,
  c.estruturante,
  c.nivel,
  c.assunto || '',
  c.penProduto || '',
  c.penModulo || '',
  c.penPo || '',
  c.penPoSubstituto || '',
  c.penRepresentanteTecnico || '',
  c.usuarioNome || '',
  c.usuarioEmail || '',
  c.usuarioTelefone || '',
  c.usuarioCpf || '',
  c.orgao || '',
  c.prioridade || '',
  c.categoria || '',
  c.tipoChamado || '',
  c.timeAtendimento || '',
  c.responsavel || '',
  c.slaAtendimento || '',
  c.slaSolucao || '',
  c.temAnexo == null ? '' : c.temAnexo ? 'Sim' : 'Não',
  formatDate(c.dataAberturaPortal),
  formatDate(c.dataCriacao),
  formatDate(c.dataAtualizacao),
  formatDate(c.dataLimite),
  formatDate(c.previsaoSolucao),
  c.acompanhamento,
  c.descricaoCompleta || '',
  formatCampos(c.camposPersonalizados),
  (c.links || []).join('\n'),
];

const styleHeader = (ws: XLSX.WorkSheet, headerLen: number) => {
  // Apply basic styling: bold + fill on header row. xlsx (community) limits styles, but cell formatting works.
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = 0; C < headerLen; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    const cell = ws[addr];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };
    }
  }
  // Wrap text on all body cells
  for (let R = 1; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell) {
        cell.s = {
          alignment: { vertical: 'top', wrapText: true },
        };
      }
    }
  }
};

const buildSheet = (rows: (string | number)[][], headers = HEADERS, widths = COL_WIDTHS) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = widths.map(w => ({ wch: w }));
  ws['!rows'] = [{ hpt: 32 }];
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  // Freeze pane via SheetJS uses '!views'
  (ws as any)['!views'] = [{ state: 'frozen', ySplit: 1 }];
  styleHeader(ws, headers.length);
  return ws;
};

const summarySheet = (chamados: Chamado[], filters: ExportFilters) => {
  const byStatus: Record<string, number> = {};
  const byEstruturante: Record<string, number> = {};
  const byProduto: Record<string, number> = {};
  const byResponsavel: Record<string, number> = {};

  chamados.forEach(c => {
    const s = STATUS_LABELS[c.status] || c.status;
    byStatus[s] = (byStatus[s] || 0) + 1;
    byEstruturante[c.estruturante] = (byEstruturante[c.estruturante] || 0) + 1;
    if (c.penProduto) byProduto[c.penProduto] = (byProduto[c.penProduto] || 0) + 1;
    if (c.responsavel) byResponsavel[c.responsavel] = (byResponsavel[c.responsavel] || 0) + 1;
  });

  const aoa: (string | number)[][] = [
    ['Resumo da Exportação'],
    [],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    ['Total de chamados', chamados.length],
    ['Período', `${filters.dateFrom || '—'} até ${filters.dateTo || '—'}`],
    ['Campo de data', filters.dateField || 'dataCriacao'],
    ['Filtro produto', filters.produto || 'Todos'],
    ['Filtro estruturante', filters.estruturante || 'Todos'],
    [],
    ['Por Status', 'Quantidade'],
    ...Object.entries(byStatus).sort((a, b) => b[1] - a[1]),
    [],
    ['Por Estruturante', 'Quantidade'],
    ...Object.entries(byEstruturante).sort((a, b) => b[1] - a[1]),
    [],
    ['Por Produto PEN', 'Quantidade'],
    ...Object.entries(byProduto).sort((a, b) => b[1] - a[1]),
    [],
    ['Por Responsável', 'Quantidade'],
    ...Object.entries(byResponsavel).sort((a, b) => b[1] - a[1]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 38 }, { wch: 16 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  // Style title
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  return ws;
};

export function exportChamadosXLSX(
  chamados: Chamado[],
  filters: ExportFilters = {},
  filename = 'chamados'
) {
  const filtered = applyExportFilters(chamados, filters);
  if (filtered.length === 0) {
    throw new Error('Nenhum chamado encontrado para os filtros selecionados.');
  }

  const wb = XLSX.utils.book_new();

  // Summary
  XLSX.utils.book_append_sheet(wb, summarySheet(filtered, filters), 'Resumo');

  // All chamados
  const allRows = filtered.map(chamadoToRow);
  XLSX.utils.book_append_sheet(wb, buildSheet(allRows), 'Chamados');

  // Per produto sheets (max 10 to avoid huge files)
  const produtos = Array.from(new Set(filtered.map(c => c.penProduto).filter(Boolean))) as string[];
  produtos.slice(0, 15).forEach(prod => {
    const rows = filtered.filter(c => c.penProduto === prod).map(chamadoToRow);
    if (rows.length > 0) {
      const safeName = prod.replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Produto';
      XLSX.utils.book_append_sheet(wb, buildSheet(rows), safeName);
    }
  });

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`);
}

// Backwards-compat CSV (kept for any callers)
export function exportChamadosCSV(chamados: Chamado[], filename = 'chamados') {
  exportChamadosXLSX(chamados, {}, filename);
}
