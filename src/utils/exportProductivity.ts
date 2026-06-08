import * as XLSX from 'xlsx';
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
  from: string; // yyyy-mm-dd
  to: string;   // yyyy-mm-dd
  userId?: string; // se omitido, todos
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '');

const headerStyle = (ws: XLSX.WorkSheet, cols: number) => {
  for (let C = 0; C < cols; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2E7D32' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }
};

export async function exportProductivityXLSX(range: ProductivityRange) {
  const fromIso = new Date(range.from + 'T00:00:00').toISOString();
  const toIso = new Date(range.to + 'T23:59:59').toISOString();

  // Fetch all chamados (we'll classify)
  let chamadosQuery = supabase.from('chamados').select('*');
  if (range.userId) chamadosQuery = chamadosQuery.eq('user_id', range.userId);
  const { data: chamados, error: cErr } = await chamadosQuery;
  if (cErr) throw cErr;

  const allChamados = chamados || [];

  // Novos no período (data_criacao)
  const novos = allChamados.filter(c => c.data_criacao >= fromIso && c.data_criacao <= toIso);

  // Encerrados no período (status resolvido + data_atualizacao no período)
  const encerrados = allChamados.filter(
    c => c.status === 'resolvido' && c.data_atualizacao >= fromIso && c.data_atualizacao <= toIso
  );

  // Excluídos no período
  const excluidos = allChamados.filter(
    c => c.status === 'excluido' && c.data_exclusao && c.data_exclusao >= fromIso && c.data_exclusao <= toIso
  );

  // Atualizados (qualquer alteração no período, excluindo os criados no período)
  const atualizados = allChamados.filter(
    c => c.data_atualizacao >= fromIso && c.data_atualizacao <= toIso && c.data_criacao < fromIso
  );

  // Fila atual (ativos não resolvidos/excluídos)
  const fila = allChamados.filter(c => c.status !== 'resolvido' && c.status !== 'excluido');

  // Audit log no período
  let auditQuery = supabase
    .from('audit_log')
    .select('*')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: false });
  if (range.userId) auditQuery = auditQuery.eq('user_id', range.userId);
  const { data: audit } = await auditQuery;
  const auditRows = audit || [];

  const wb = XLSX.utils.book_new();

  // ============ Sheet 1: Resumo ============
  const filaPorMotivo: Record<string, number> = {};
  fila.forEach(c => {
    const motivo = QUEUE_REASON[c.status] || c.status;
    filaPorMotivo[motivo] = (filaPorMotivo[motivo] || 0) + 1;
  });

  const filaPorResponsavel: Record<string, number> = {};
  fila.forEach(c => {
    const r = c.responsavel || '— sem responsável —';
    filaPorResponsavel[r] = (filaPorResponsavel[r] || 0) + 1;
  });

  const resumo: (string | number)[][] = [
    ['Relatório de Produtividade'],
    [],
    ['Período', `${new Date(range.from).toLocaleDateString('pt-BR')} até ${new Date(range.to).toLocaleDateString('pt-BR')}`],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Indicador', 'Quantidade'],
    ['Chamados novos (criados no período)', novos.length],
    ['Chamados encerrados no período', encerrados.length],
    ['Chamados excluídos no período', excluidos.length],
    ['Chamados atualizados no período (sem contar novos)', atualizados.length],
    ['Total em fila (não resolvidos)', fila.length],
    ['Eventos de auditoria no período', auditRows.length],
    [],
    ['Fila por motivo', 'Quantidade'],
    ...Object.entries(filaPorMotivo).sort((a, b) => b[1] - a[1]),
    [],
    ['Fila por responsável', 'Quantidade'],
    ...Object.entries(filaPorResponsavel).sort((a, b) => b[1] - a[1]),
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo['!cols'] = [{ wch: 48 }, { wch: 16 }];
  wsResumo['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  if (wsResumo['A1']) {
    wsResumo['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2E7D32' } },
      alignment: { horizontal: 'center' },
    };
  }
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Helper to build chamados list sheet
  const buildList = (rows: any[]) => {
    const headers = ['Nº', 'Título', 'Status', 'Estruturante', 'Produto', 'PO', 'Responsável', 'Criado em', 'Atualizado em', 'Data Limite'];
    const aoa = [
      headers,
      ...rows.map(c => [
        c.numero_chamado || '',
        c.titulo,
        STATUS_LABELS[c.status] || c.status,
        c.estruturante,
        c.pen_produto || '',
        c.pen_po || '',
        c.responsavel || '',
        fmt(c.data_criacao),
        fmt(c.data_atualizacao),
        fmt(c.data_limite),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [14, 42, 22, 14, 22, 22, 22, 20, 20, 20].map(w => ({ wch: w }));
    (ws as any)['!views'] = [{ state: 'frozen', ySplit: 1 }];
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
    headerStyle(ws, headers.length);
    return ws;
  };

  XLSX.utils.book_append_sheet(wb, buildList(novos), 'Novos');
  XLSX.utils.book_append_sheet(wb, buildList(encerrados), 'Encerrados');
  XLSX.utils.book_append_sheet(wb, buildList(excluidos), 'Excluídos');
  XLSX.utils.book_append_sheet(wb, buildList(atualizados), 'Atualizados');

  // Fila com motivo
  const filaHeaders = ['Nº', 'Título', 'Status / Motivo na fila', 'Responsável', 'Produto', 'Data Limite', 'Dias parado'];
  const now = Date.now();
  const filaAoa = [
    filaHeaders,
    ...fila.map(c => {
      const updated = new Date(c.data_atualizacao).getTime();
      const dias = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
      return [
        c.numero_chamado || '',
        c.titulo,
        QUEUE_REASON[c.status] || STATUS_LABELS[c.status] || c.status,
        c.responsavel || '',
        c.pen_produto || '',
        fmt(c.data_limite),
        dias,
      ];
    }),
  ];
  const wsFila = XLSX.utils.aoa_to_sheet(filaAoa);
  wsFila['!cols'] = [14, 42, 32, 22, 22, 20, 12].map(w => ({ wch: w }));
  (wsFila as any)['!views'] = [{ state: 'frozen', ySplit: 1 }];
  wsFila['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: filaHeaders.length - 1 } }) };
  headerStyle(wsFila, filaHeaders.length);
  XLSX.utils.book_append_sheet(wb, wsFila, 'Fila Atual');

  // Audit log
  const auditHeaders = ['Data', 'Usuário', 'Ação', 'Entidade', 'ID Entidade'];
  const auditAoa = [
    auditHeaders,
    ...auditRows.map(a => [fmt(a.created_at), a.user_email || '', a.action, a.entity_type, a.entity_id || '']),
  ];
  const wsAudit = XLSX.utils.aoa_to_sheet(auditAoa);
  wsAudit['!cols'] = [20, 30, 24, 18, 38].map(w => ({ wch: w }));
  (wsAudit as any)['!views'] = [{ state: 'frozen', ySplit: 1 }];
  wsAudit['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: auditHeaders.length - 1 } }) };
  headerStyle(wsAudit, auditHeaders.length);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Auditoria');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `produtividade_${stamp}.xlsx`);

  return {
    novos: novos.length,
    encerrados: encerrados.length,
    excluidos: excluidos.length,
    atualizados: atualizados.length,
    fila: fila.length,
  };
}
