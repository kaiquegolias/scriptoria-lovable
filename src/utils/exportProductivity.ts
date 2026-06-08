import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  agendados: 'Agendados',
  agendados_planner: 'Agendados PLANNER',
  agendados_aguardando: 'Aguardando devolutiva',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  excluido: 'Excluído',
};

const QUEUE_REASON: Record<string, string> = {
  agendados: 'Agendado, aguardando início',
  agendados_planner: 'Agendado no PLANNER',
  agendados_aguardando: 'Aguardando devolutiva do solicitante / 3º',
  em_andamento: 'Em atendimento ativo',
};

export interface ProductivityRange {
  from: string;
  to: string;
  userId?: string;
}

const BRAND = 'FF2E7D32';
const BRAND_LIGHT = 'FFE8F5E9';
const ZEBRA = 'FFF7F9FC';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '');

const styleHeaderRow = (row: ExcelJS.Row) => {
  row.height = 32;
  row.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0B7C0' } },
      left: { style: 'thin', color: { argb: 'FFB0B7C0' } },
      right: { style: 'thin', color: { argb: 'FFB0B7C0' } },
      bottom: { style: 'medium', color: { argb: BRAND } },
    };
  });
};

const styleBody = (ws: ExcelJS.Worksheet, startRow: number, endRow: number) => {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const zebra = (r - startRow) % 2 === 1;
    row.height = 22;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
      if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    });
  }
};

const buildList = (ws: ExcelJS.Worksheet, rows: any[]) => {
  ws.columns = [
    { header: 'Nº', key: 'numero', width: 14 },
    { header: 'Título', key: 'titulo', width: 42 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Estruturante', key: 'estr', width: 14 },
    { header: 'Produto', key: 'prod', width: 22 },
    { header: 'PO', key: 'po', width: 22 },
    { header: 'Responsável', key: 'resp', width: 22 },
    { header: 'Criado em', key: 'criado', width: 20 },
    { header: 'Atualizado em', key: 'atualizado', width: 20 },
    { header: 'Data Limite', key: 'limite', width: 20 },
  ];
  styleHeaderRow(ws.getRow(1));
  rows.forEach(c =>
    ws.addRow({
      numero: c.numero_chamado || '',
      titulo: c.titulo,
      status: STATUS_LABELS[c.status] || c.status,
      estr: c.estruturante,
      prod: c.pen_produto || '',
      po: c.pen_po || '',
      resp: c.responsavel || '',
      criado: fmt(c.data_criacao),
      atualizado: fmt(c.data_atualizacao),
      limite: fmt(c.data_limite),
    }),
  );
  styleBody(ws, 2, ws.rowCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };
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

export async function exportProductivityXLSX(range: ProductivityRange) {
  const fromIso = new Date(range.from + 'T00:00:00').toISOString();
  const toIso = new Date(range.to + 'T23:59:59').toISOString();

  let q = supabase.from('chamados').select('*');
  if (range.userId) q = q.eq('user_id', range.userId);
  const { data: chamados, error } = await q;
  if (error) throw error;
  const all = chamados || [];

  const novos = all.filter(c => c.data_criacao >= fromIso && c.data_criacao <= toIso);
  const encerrados = all.filter(c => c.status === 'resolvido' && c.data_atualizacao >= fromIso && c.data_atualizacao <= toIso);
  const excluidos = all.filter(c => c.status === 'excluido' && c.data_exclusao && c.data_exclusao >= fromIso && c.data_exclusao <= toIso);
  const atualizados = all.filter(c => c.data_atualizacao >= fromIso && c.data_atualizacao <= toIso && c.data_criacao < fromIso);
  const fila = all.filter(c => c.status !== 'resolvido' && c.status !== 'excluido');

  let aq = supabase.from('audit_log').select('*').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false });
  if (range.userId) aq = aq.eq('user_id', range.userId);
  const { data: audit } = await aq;
  const auditRows = audit || [];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Thoth';
  wb.created = new Date();

  // ===== Resumo =====
  const ws = wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 48 }, { width: 22 }];

  ws.mergeCells('A1:B1');
  const title = ws.getCell('A1');
  title.value = 'Relatório de Produtividade';
  title.font = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  ws.getRow(1).height = 40;

  let row = 3;
  const info: [string, string | number][] = [
    ['Período', `${new Date(range.from).toLocaleDateString('pt-BR')} até ${new Date(range.to).toLocaleDateString('pt-BR')}`],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ];
  info.forEach(([k, v]) => {
    const r = ws.getRow(row++);
    r.getCell(1).value = k;
    r.getCell(2).value = v;
    r.getCell(1).font = { bold: true, color: { argb: BRAND } };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } };
  });

  row++;
  const kpiHeader = ws.getRow(row++);
  kpiHeader.getCell(1).value = 'Indicador';
  kpiHeader.getCell(2).value = 'Quantidade';
  styleHeaderRow(kpiHeader);

  const kpis: [string, number, string][] = [
    ['Chamados novos (criados no período)', novos.length, 'FFE8F5E9'],
    ['Chamados encerrados no período', encerrados.length, 'FFDCE6F1'],
    ['Chamados excluídos no período', excluidos.length, 'FFFFCDD2'],
    ['Atualizados no período (sem contar novos)', atualizados.length, 'FFFFF8E1'],
    ['Total em fila (não resolvidos)', fila.length, 'FFE3F2FD'],
    ['Eventos de auditoria no período', auditRows.length, 'FFEDE7F6'],
  ];
  kpis.forEach(([k, v, color]) => {
    const r = ws.getRow(row++);
    r.height = 26;
    r.getCell(1).value = k;
    r.getCell(2).value = v;
    r.getCell(1).font = { bold: true, size: 11 };
    r.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        left: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        right: { style: 'thin', color: { argb: 'FFD0D7DE' } },
      };
    });
  });

  const addSection = (titleText: string, data: [string, number][]) => {
    row++;
    const r = ws.getRow(row++);
    r.getCell(1).value = titleText;
    r.getCell(2).value = 'Quantidade';
    styleHeaderRow(r);
    const start = row;
    data.sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      const rr = ws.getRow(row++);
      rr.getCell(1).value = k;
      rr.getCell(2).value = v;
      rr.getCell(2).alignment = { horizontal: 'right' };
    });
    styleBody(ws, start, row - 1);
  };

  const filaPorMotivo: Record<string, number> = {};
  fila.forEach(c => {
    const m = QUEUE_REASON[c.status] || c.status;
    filaPorMotivo[m] = (filaPorMotivo[m] || 0) + 1;
  });
  const filaPorResp: Record<string, number> = {};
  fila.forEach(c => {
    const r = c.responsavel || '— sem responsável —';
    filaPorResp[r] = (filaPorResp[r] || 0) + 1;
  });

  addSection('Fila por motivo', Object.entries(filaPorMotivo));
  addSection('Fila por responsável', Object.entries(filaPorResp));

  // ===== Listas =====
  buildList(wb.addWorksheet('Novos'), novos);
  buildList(wb.addWorksheet('Encerrados'), encerrados);
  buildList(wb.addWorksheet('Excluídos'), excluidos);
  buildList(wb.addWorksheet('Atualizados'), atualizados);

  // Fila atual com dias parado
  const wsFila = wb.addWorksheet('Fila Atual');
  wsFila.columns = [
    { header: 'Nº', key: 'numero', width: 14 },
    { header: 'Título', key: 'titulo', width: 42 },
    { header: 'Motivo na fila', key: 'motivo', width: 36 },
    { header: 'Responsável', key: 'resp', width: 22 },
    { header: 'Produto', key: 'prod', width: 22 },
    { header: 'Data Limite', key: 'limite', width: 20 },
    { header: 'Dias parado', key: 'dias', width: 14 },
  ];
  styleHeaderRow(wsFila.getRow(1));
  const now = Date.now();
  fila.forEach(c => {
    const updated = new Date(c.data_atualizacao).getTime();
    const dias = Math.floor((now - updated) / 86400000);
    wsFila.addRow({
      numero: c.numero_chamado || '',
      titulo: c.titulo,
      motivo: QUEUE_REASON[c.status] || STATUS_LABELS[c.status] || c.status,
      resp: c.responsavel || '',
      prod: c.pen_produto || '',
      limite: fmt(c.data_limite),
      dias,
    });
  });
  styleBody(wsFila, 2, wsFila.rowCount);
  // Color days-idle column
  for (let r = 2; r <= wsFila.rowCount; r++) {
    const cell = wsFila.getRow(r).getCell(7);
    const d = Number(cell.value) || 0;
    const color = d > 14 ? 'FFFFCDD2' : d > 7 ? 'FFFFF8E1' : 'FFE8F5E9';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
  }
  wsFila.views = [{ state: 'frozen', ySplit: 1 }];
  wsFila.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };

  // Auditoria
  const wsAudit = wb.addWorksheet('Auditoria');
  wsAudit.columns = [
    { header: 'Data', key: 'data', width: 22 },
    { header: 'Usuário', key: 'user', width: 30 },
    { header: 'Ação', key: 'acao', width: 26 },
    { header: 'Entidade', key: 'ent', width: 18 },
    { header: 'ID Entidade', key: 'eid', width: 38 },
  ];
  styleHeaderRow(wsAudit.getRow(1));
  auditRows.forEach(a =>
    wsAudit.addRow({
      data: fmt(a.created_at),
      user: a.user_email || '',
      acao: a.action,
      ent: a.entity_type,
      eid: a.entity_id || '',
    }),
  );
  styleBody(wsAudit, 2, wsAudit.rowCount);
  wsAudit.views = [{ state: 'frozen', ySplit: 1 }];
  wsAudit.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  const stamp = new Date().toISOString().slice(0, 10);
  await downloadBlob(wb, `produtividade_${stamp}.xlsx`);

  return {
    novos: novos.length,
    encerrados: encerrados.length,
    excluidos: excluidos.length,
    atualizados: atualizados.length,
    fila: fila.length,
  };
}
