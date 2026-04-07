import { Chamado } from '@/components/chamados/ChamadoCard';

const STATUS_LABELS: Record<string, string> = {
  agendados: 'Agendados',
  agendados_planner: 'Agendados PLANNER',
  agendados_aguardando: 'Aguardando devolutiva',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  excluido: 'Excluído',
};

export function exportChamadosCSV(chamados: Chamado[], filename = 'chamados') {
  const headers = [
    'ID',
    'Título',
    'Status',
    'Estruturante',
    'Nível',
    'Assunto',
    'Acompanhamento',
    'Produto PEN',
    'Módulo PEN',
    'PO',
    'Links',
    'Data Criação',
    'Data Atualização',
    'Data Limite',
  ];

  const escapeCSV = (val: unknown): string => {
    const str = val == null ? '' : String(val);
    if (!str) return '""';
    // Replace line breaks with spaces to avoid breaking CSV rows
    const cleaned = str.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
    // Always wrap in quotes and escape inner quotes
    return `"${cleaned.replace(/"/g, '""')}"`;
  };

  const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const rows = chamados.map((c) => [
    c.id,
    c.titulo,
    STATUS_LABELS[c.status] || c.status,
    c.estruturante,
    c.nivel,
    c.assunto || '',
    c.acompanhamento,
    c.penProduto || '',
    c.penModulo || '',
    c.penPo || '',
    (c.links || []).join(' | '),
    formatDate(c.dataCriacao),
    formatDate(c.dataAtualizacao),
    formatDate(c.dataLimite),
  ]);

  // Use semicolon separator for Excel/LibreOffice compatibility with pt-BR locale
  const csvContent =
    '\uFEFF' +
    headers.map(h => escapeCSV(h)).join(';') +
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
