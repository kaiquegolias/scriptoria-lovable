import ExcelJS from 'exceljs';
import { Chamado } from '@/components/chamados/ChamadoCard';

const STATUS_LABELS: Record<string, string> = {
  agendados: 'Agendados',
  agendados_planner: 'Agendados PLANNER',
  agendados_aguardando: 'Aguardando devolutiva',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  excluido: 'Excluído',
};

const STATUS_COLORS: Record<string, string> = {
  agendados: 'FFE3F2FD',
  agendados_planner: 'FFE1F5FE',
  agendados_aguardando: 'FFFFF8E1',
  em_andamento: 'FFE8F5E9',
  resolvido: 'FFC8E6C9',
  excluido: 'FFFFCDD2',
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR') : '';

const formatCampos = (c?: Record<string, string>): string =>
  c ? Object.entries(c).map(([k, v]) => `${k}: ${v}`).join('\n') : '';

export interface ExportFilters {
  dateField?: 'dataCriacao' | 'dataAtualizacao' | 'dataAberturaPortal';
  dateFrom?: string;
  dateTo?: string;
  produto?: string;
  estruturante?: string;
}

export const applyExportFilters = (chamados: Chamado[], f: ExportFilters): Chamado[] => {
  let r = chamados;
  const field = f.dateField || 'dataCriacao';
  if (f.dateFrom) {
    const from = new Date(f.dateFrom + 'T00:00:00');
    r = r.filter(c => c[field] && new Date(c[field] as string) >= from);
  }
  if (f.dateTo) {
    const to = new Date(f.dateTo + 'T23:59:59');
    r = r.filter(c => c[field] && new Date(c[field] as string) <= to);
  }
  if (f.produto) r = r.filter(c => (c.penProduto || '').toLowerCase() === f.produto!.toLowerCase());
  if (f.estruturante) r = r.filter(c => c.estruturante === f.estruturante);
  return r;
};

// ---------- Styling helpers ----------
const BRAND = 'FF1F4E78';
const BRAND_LIGHT = 'FFDCE6F1';
const ZEBRA = 'FFF7F9FC';

const styleHeaderRow = (row: ExcelJS.Row, fill = BRAND) => {
  row.height = 32;
  row.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0B7C0' } },
      left: { style: 'thin', color: { argb: 'FFB0B7C0' } },
      right: { style: 'thin', color: { argb: 'FFB0B7C0' } },
      bottom: { style: 'medium', color: { argb: BRAND } },
    };
  });
};

const styleBody = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  statusCol?: number,
) => {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const zebra = (r - startRow) % 2 === 1;
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
      if (zebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
      // Status colored chip
      if (statusCol && col === statusCol) {
        const val = String(cell.value || '');
        const key = Object.keys(STATUS_LABELS).find(k => STATUS_LABELS[k] === val);
        if (key && STATUS_COLORS[key]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[key] } };
          cell.font = { ...cell.font, bold: true };
          cell.alignment = { ...cell.alignment, horizontal: 'center' };
        }
      }
    });
  }
};

// ---------- Sheet builders ----------
interface ColDef { header: string; key: string; width: number; }

const COLS: ColDef[] = [
  { header: 'Nº Chamado', key: 'numeroChamado', width: 14 },
  { header: 'Título', key: 'titulo', width: 42 },
  { header: 'Status', key: 'status', width: 22 },
  { header: 'Estruturante', key: 'estruturante', width: 14 },
  { header: 'Nível', key: 'nivel', width: 9 },
  { header: 'Assunto', key: 'assunto', width: 22 },
  { header: 'Produto PEN', key: 'penProduto', width: 22 },
  { header: 'Módulo PEN', key: 'penModulo', width: 22 },
  { header: 'PO', key: 'penPo', width: 22 },
  { header: 'PO Substituto', key: 'penPoSubstituto', width: 22 },
  { header: 'Rep. Técnico', key: 'penRepresentanteTecnico', width: 22 },
  { header: 'Solicitante', key: 'usuarioNome', width: 26 },
  { header: 'E-mail', key: 'usuarioEmail', width: 28 },
  { header: 'Telefone', key: 'usuarioTelefone', width: 16 },
  { header: 'CPF', key: 'usuarioCpf', width: 16 },
  { header: 'Órgão', key: 'orgao', width: 22 },
  { header: 'Prioridade', key: 'prioridade', width: 14 },
  { header: 'Categoria', key: 'categoria', width: 18 },
  { header: 'Tipo', key: 'tipoChamado', width: 16 },
  { header: 'Time', key: 'timeAtendimento', width: 18 },
  { header: 'Responsável', key: 'responsavel', width: 22 },
  { header: 'SLA Atendimento', key: 'slaAtendimento', width: 18 },
  { header: 'SLA Solução', key: 'slaSolucao', width: 18 },
  { header: 'Anexo', key: 'temAnexo', width: 9 },
  { header: 'Abertura Portal', key: 'dataAberturaPortal', width: 20 },
  { header: 'Criação', key: 'dataCriacao', width: 20 },
  { header: 'Atualização', key: 'dataAtualizacao', width: 20 },
  { header: 'Data Limite', key: 'dataLimite', width: 20 },
  { header: 'Previsão Solução', key: 'previsaoSolucao', width: 20 },
  { header: 'Último Acompanhamento', key: 'acompanhamento', width: 50 },
  { header: 'Descrição Completa', key: 'descricaoCompleta', width: 60 },
  { header: 'Campos Personalizados', key: 'camposPersonalizados', width: 40 },
  { header: 'Links', key: 'links', width: 40 },
];

const rowFromChamado = (c: Chamado) => ({
  numeroChamado: c.numeroChamado || '',
  titulo: c.titulo,
  status: STATUS_LABELS[c.status] || c.status,
  estruturante: c.estruturante,
  nivel: c.nivel,
  assunto: c.assunto || '',
  penProduto: c.penProduto || '',
  penModulo: c.penModulo || '',
  penPo: c.penPo || '',
  penPoSubstituto: c.penPoSubstituto || '',
  penRepresentanteTecnico: c.penRepresentanteTecnico || '',
  usuarioNome: c.usuarioNome || '',
  usuarioEmail: c.usuarioEmail || '',
  usuarioTelefone: c.usuarioTelefone || '',
  usuarioCpf: c.usuarioCpf || '',
  orgao: c.orgao || '',
  prioridade: c.prioridade || '',
  categoria: c.categoria || '',
  tipoChamado: c.tipoChamado || '',
  timeAtendimento: c.timeAtendimento || '',
  responsavel: c.responsavel || '',
  slaAtendimento: c.slaAtendimento || '',
  slaSolucao: c.slaSolucao || '',
  temAnexo: c.temAnexo == null ? '' : c.temAnexo ? 'Sim' : 'Não',
  dataAberturaPortal: fmt(c.dataAberturaPortal),
  dataCriacao: fmt(c.dataCriacao),
  dataAtualizacao: fmt(c.dataAtualizacao),
  dataLimite: fmt(c.dataLimite),
  previsaoSolucao: fmt(c.previsaoSolucao),
  acompanhamento: c.acompanhamento,
  descricaoCompleta: c.descricaoCompleta || '',
  camposPersonalizados: formatCampos(c.camposPersonalizados),
  links: (c.links || []).join('\n'),
});

const buildListSheet = (ws: ExcelJS.Worksheet, chamados: Chamado[]) => {
  ws.columns = COLS.map(c => ({ header: c.header, key: c.key, width: c.width }));
  styleHeaderRow(ws.getRow(1));
  chamados.forEach(c => ws.addRow(rowFromChamado(c)));
  const statusCol = COLS.findIndex(c => c.key === 'status') + 1;
  styleBody(ws, 2, ws.rowCount, statusCol);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };
};

const buildSummarySheet = (ws: ExcelJS.Worksheet, chamados: Chamado[], filters: ExportFilters) => {
  const byStatus: Record<string, number> = {};
  const byEstr: Record<string, number> = {};
  const byProd: Record<string, number> = {};
  const byResp: Record<string, number> = {};
  chamados.forEach(c => {
    const s = STATUS_LABELS[c.status] || c.status;
    byStatus[s] = (byStatus[s] || 0) + 1;
    byEstr[c.estruturante] = (byEstr[c.estruturante] || 0) + 1;
    if (c.penProduto) byProd[c.penProduto] = (byProd[c.penProduto] || 0) + 1;
    if (c.responsavel) byResp[c.responsavel] = (byResp[c.responsavel] || 0) + 1;
  });

  ws.columns = [{ width: 44 }, { width: 18 }];

  // Title
  ws.mergeCells('A1:B1');
  const title = ws.getCell('A1');
  title.value = 'Resumo da Exportação de Chamados';
  title.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  ws.getRow(1).height = 36;

  let row = 3;
  const info: [string, string | number][] = [
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    ['Total de chamados', chamados.length],
    ['Período', `${filters.dateFrom || '—'} até ${filters.dateTo || '—'}`],
    ['Campo de data', filters.dateField || 'dataCriacao'],
    ['Filtro produto', filters.produto || 'Todos'],
    ['Filtro estruturante', filters.estruturante || 'Todos'],
  ];
  info.forEach(([k, v]) => {
    const r = ws.getRow(row++);
    r.getCell(1).value = k;
    r.getCell(2).value = v;
    r.getCell(1).font = { bold: true, color: { argb: BRAND } };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } };
    r.getCell(2).alignment = { horizontal: 'left' };
  });

  const addSection = (title: string, data: [string, number][]) => {
    row++;
    const r = ws.getRow(row++);
    r.getCell(1).value = title;
    r.getCell(2).value = 'Quantidade';
    styleHeaderRow(r);
    data.sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      const rr = ws.getRow(row++);
      rr.getCell(1).value = k;
      rr.getCell(2).value = v;
      rr.getCell(2).alignment = { horizontal: 'right' };
      rr.eachCell(c => {
        c.border = {
          top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        };
      });
    });
  };

  addSection('Por Status', Object.entries(byStatus));
  addSection('Por Estruturante', Object.entries(byEstr));
  addSection('Por Produto PEN', Object.entries(byProd));
  addSection('Por Responsável', Object.entries(byResp));

  ws.views = [{ state: 'frozen', ySplit: 1 }];
};

const downloadBlob = async (wb: ExcelJS.Workbook, filename: string) => {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export async function exportChamadosXLSX(
  chamados: Chamado[],
  filters: ExportFilters = {},
  filename = 'chamados',
) {
  const filtered = applyExportFilters(chamados, filters);
  if (filtered.length === 0) {
    throw new Error('Nenhum chamado encontrado para os filtros selecionados.');
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Thoth';
  wb.created = new Date();

  buildSummarySheet(wb.addWorksheet('Resumo', {
    views: [{ showGridLines: false }],
  }), filtered, filters);

  buildListSheet(wb.addWorksheet('Chamados', {
    views: [{ state: 'frozen', ySplit: 1 }],
  }), filtered);

  const produtos = Array.from(new Set(filtered.map(c => c.penProduto).filter(Boolean))) as string[];
  produtos.slice(0, 15).forEach(prod => {
    const rows = filtered.filter(c => c.penProduto === prod);
    if (rows.length === 0) return;
    const safe = prod.replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Produto';
    buildListSheet(wb.addWorksheet(safe), rows);
  });

  const stamp = new Date().toISOString().slice(0, 10);
  await downloadBlob(wb, `${filename}_${stamp}.xlsx`);
}

export const exportChamadosCSV = exportChamadosXLSX;
