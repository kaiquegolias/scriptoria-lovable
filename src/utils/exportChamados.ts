import { Chamado } from '@/components/chamados/ChamadoCard';

const STATUS_LABELS: Record<string, string> = {
  agendados: 'Agendados',
  agendados_planner: 'Agendados PLANNER',
  agendados_aguardando: 'Aguardando devolutiva',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
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

  const escapeCSV = (val: string) => {
    if (!val) return '';
    // Always wrap in quotes and escape inner quotes for safety
    return `"${val.replace(/"/g, '""')}"`;
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
    new Date(c.dataCriacao).toLocaleDateString('pt-BR'),
    new Date(c.dataAtualizacao).toLocaleDateString('pt-BR'),
    c.dataLimite ? new Date(c.dataLimite).toLocaleDateString('pt-BR') : '',
  ]);

  // Use semicolon separator for Excel/LibreOffice compatibility with pt-BR locale
  const csvContent =
    '\uFEFF' +
    headers.map(escapeCSV).join(';') +
    '\n' +
    rows.map((row) => row.map(escapeCSV).join(';')).join('\n');

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
