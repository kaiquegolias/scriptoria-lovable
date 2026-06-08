import React, { useState, useMemo, useEffect } from 'react';
import { X, Download, FileSpreadsheet, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Chamado } from './ChamadoCard';
import { exportChamadosXLSX, ExportFilters } from '@/utils/exportChamados';
import { exportProductivityXLSX } from '@/utils/exportProductivity';
import { useAuth } from '@/context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  chamados: Chamado[];
  encerrados?: boolean;
}

type Tab = 'chamados' | 'produtividade';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const ExportDialog: React.FC<Props> = ({ open, onClose, chamados, encerrados }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('chamados');
  const [loading, setLoading] = useState(false);

  // Chamados export
  const [dateField, setDateField] = useState<ExportFilters['dateField']>('dataCriacao');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [produto, setProduto] = useState('');
  const [estruturante, setEstruturante] = useState('');

  // Produtividade
  const [prodFrom, setProdFrom] = useState(daysAgo(30));
  const [prodTo, setProdTo] = useState(today());
  const [meusApenas, setMeusApenas] = useState(true);

  const produtos = useMemo(
    () => Array.from(new Set(chamados.map(c => c.penProduto).filter(Boolean))).sort() as string[],
    [chamados]
  );

  if (!open) return null;

  const handleExportChamados = async () => {
    try {
      setLoading(true);
      exportChamadosXLSX(
        chamados,
        { dateField, dateFrom, dateTo, produto, estruturante },
        encerrados ? 'chamados_encerrados' : 'chamados'
      );
      toast.success('Exportação gerada com sucesso!');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao exportar');
    } finally {
      setLoading(false);
    }
  };

  const handleExportProductivity = async () => {
    if (!prodFrom || !prodTo) {
      toast.error('Selecione o período');
      return;
    }
    try {
      setLoading(true);
      const res = await exportProductivityXLSX({
        from: prodFrom,
        to: prodTo,
        userId: meusApenas ? user?.id : undefined,
      });
      toast.success(
        `Relatório gerado! Novos: ${res.novos} • Encerrados: ${res.encerrados} • Fila: ${res.fila}`
      );
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-primary/10 to-accent/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-md">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Exportar Dados</h2>
              <p className="text-xs text-muted-foreground">Excel formatado, pronto para análise</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-muted/30">
          <button
            onClick={() => setTab('chamados')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'chamados' ? 'bg-card text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileSpreadsheet size={16} /> Chamados
          </button>
          <button
            onClick={() => setTab('produtividade')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'produtividade' ? 'bg-card text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 size={16} /> Produtividade
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'chamados' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gera um arquivo <strong>.xlsx</strong> com aba de resumo, lista completa e uma aba por produto. Cabeçalhos coloridos, colunas dimensionadas e filtros automáticos no Excel.
              </p>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filtrar por data</label>
                <select
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                >
                  <option value="dataCriacao">Data de criação</option>
                  <option value="dataAtualizacao">Última atualização</option>
                  <option value="dataAberturaPortal">Abertura no Portal (MEXX)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Hoje', from: today(), to: today() },
                  { label: 'Últimos 7 dias', from: daysAgo(7), to: today() },
                  { label: 'Últimos 30 dias', from: daysAgo(30), to: today() },
                  { label: 'Limpar', from: '', to: '' },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                    className="px-2.5 py-1 text-xs rounded-lg border bg-background hover:bg-muted transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Produto PEN</label>
                  <select
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  >
                    <option value="">Todos</option>
                    {produtos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estruturante</label>
                  <select
                    value={estruturante}
                    onChange={(e) => setEstruturante(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="PNCP">PNCP</option>
                    <option value="PEN">PEN</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'produtividade' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Relatório completo: novos, encerrados, excluídos, atualizados, fila atual com motivo de bloqueio e log de auditoria do período.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={prodFrom}
                    onChange={(e) => setProdFrom(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={prodTo}
                    onChange={(e) => setProdTo(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Hoje', d: 0 },
                  { label: '7 dias', d: 7 },
                  { label: '30 dias', d: 30 },
                  { label: '90 dias', d: 90 },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setProdFrom(daysAgo(p.d)); setProdTo(today()); }}
                    className="px-2.5 py-1 text-xs rounded-lg border bg-background hover:bg-muted transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl border bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meusApenas}
                  onChange={(e) => setMeusApenas(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">Apenas meus chamados</span>
              </label>

              <div className="rounded-xl border bg-accent/20 p-3 text-xs text-muted-foreground space-y-1">
                <p>O arquivo Excel conterá:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li><strong>Resumo</strong> — KPIs, fila por motivo e por responsável</li>
                  <li><strong>Novos / Encerrados / Excluídos / Atualizados</strong></li>
                  <li><strong>Fila Atual</strong> — com motivo e dias parado</li>
                  <li><strong>Auditoria</strong> — todas as ações do período</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border bg-background text-sm hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={tab === 'chamados' ? handleExportChamados : handleExportProductivity}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {loading ? 'Gerando...' : 'Baixar Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
