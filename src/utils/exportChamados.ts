import { Chamado } from '@/components/chamados/ChamadoCard';

const STATUS_LABELS: Record<string, string> = {
  agendados: 'Agendados',
  agendados_planner: 'Agendados PLANNER',
  agendados_aguardando: 'Aguardando devolutiva',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  excluido: 'Excluído',
};

const escapeCSV = (val: unknown): string => {
  const str = val == null ? '' : String(val);
  if (!str) return '""';
  const cleaned = str.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
  return `"${cleaned.replace(/"/g, '""')}"`;
};

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('pt-BR');
  } catch {
    return '';
  }
};

const formatCampos = (c?: Record<string, string>): string => {
  if (!c) return '';
  return Object.entries(c).map(([k, v]) => `${k}: ${v}`).join(' | ');
};

export function exportChamadosCSV(chamados: Chamado[], filename = 'chamados') {
  if (!chamados || chamados.length === 0) {
    console.warn('Nenhum chamado para exportar.');
    return;
  }

  const headers = [
    'ID', 'Nº Chamado MEXX', 'Título', 'Status', 'Estruturante', 'Nível', 'Assunto',
    'Acompanhamento', 'Produto PEN', 'Módulo PEN', 'PO', 'PO Substituto', 'Rep. Técnico',
    'Solicitante', 'E-mail', 'Telefone', 'CPF', 'Órgão',
    'Prioridade', 'Categoria', 'Tipo', 'Time Atendimento', 'Responsável',
    'SLA Atendimento', 'SLA Solução', 'Tem Anexo', 'Descrição Completa',
    'Campos Personalizados', 'Links',
    'Data Abertura Portal', 'Previsão Solução', 'Data Criação', 'Data Atualização', 'Data Limite',
  ];

  const rows = chamados.map((c) => [
    c.id,
    c.numeroChamado || '',
    c.titulo,
    STATUS_LABELS[c.status] || c.status,
    c.estruturante,
    c.nivel,
    c.assunto || '',
    c.acompanhamento,
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
    c.descricaoCompleta || '',
    formatCampos(c.camposPersonalizados),
    (c.links || []).join(' | '),
    formatDate(c.dataAberturaPortal),
    formatDate(c.previsaoSolucao),
    formatDate(c.dataCriacao),
    formatDate(c.dataAtualizacao),
    formatDate(c.dataLimite),
  ]);

  const csvContent =
    '\uFEFF' +
    headers.map(escapeCSV).join(';') +
    '\r\n' +
    rows.map((row) => row.map(escapeCSV).join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
