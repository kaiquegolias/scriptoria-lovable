import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChamadoCard, { Chamado } from './ChamadoCard';
import ChamadoForm from './ChamadoForm';
import ChamadoModal from './ChamadoModal';
import CloseTicketModal from './CloseTicketModal';
import { toast } from 'sonner';
import { Plus, Search, Download, Layers, Inbox, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { exportChamadosCSV } from '@/utils/exportChamados';
import { useAuth } from '@/context/AuthContext';
import { useChamados } from '@/hooks/useChamados';
import { usePdfImport } from '@/context/PdfImportContext';

interface ChamadoListProps {
  encerrados?: boolean;
  onFinishChamado?: (chamado: Chamado) => void;
}

const ChamadoList: React.FC<ChamadoListProps> = ({ encerrados = false }) => {
  const { user } = useAuth();
  const {
    chamados,
    loading,
    createChamado,
    updateChamado,
    reopenChamado,
    deleteChamado,
  } = useChamados(encerrados);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chamadoToEdit, setChamadoToEdit] = useState<Chamado | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstruturante, setFiltroEstruturante] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [chamadoToClose, setChamadoToClose] = useState<Chamado | null>(null);

  const { status: importStatus, pendingData } = usePdfImport();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open form when extraction is done and user navigates here, or via custom event
  useEffect(() => {
    if (encerrados) return;
    const fromImport = searchParams.get('fromImport');
    if ((fromImport === '1' || importStatus === 'done') && pendingData && !isFormOpen) {
      setChamadoToEdit(undefined);
      setIsFormOpen(true);
      if (fromImport) {
        searchParams.delete('fromImport');
        setSearchParams(searchParams, { replace: true });
      }
    }
    const handler = () => {
      if (!isFormOpen) {
        setChamadoToEdit(undefined);
        setIsFormOpen(true);
      }
    };
    window.addEventListener('open-chamado-form-from-import', handler);
    return () => window.removeEventListener('open-chamado-form-from-import', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importStatus, pendingData, searchParams, encerrados]);

  const chamadosFiltrados = useMemo(
    () =>
      chamados
        .filter(c =>
          c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.acompanhamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.numeroChamado?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
          (c.usuarioNome?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        )
        .filter(c => (filtroEstruturante ? c.estruturante === filtroEstruturante : true))
        .filter(c => (filtroStatus ? c.status === filtroStatus : true)),
    [chamados, searchTerm, filtroEstruturante, filtroStatus]
  );

  const estruturanteCount = chamados.reduce((acc, c) => {
    acc[c.estruturante] = (acc[c.estruturante] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCount = chamados.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const atrasados = chamados.filter(
    c => c.status === 'agendados_aguardando' && c.dataLimite && new Date(c.dataLimite) < new Date()
  ).length;

  const handleOpenForm = () => { setChamadoToEdit(undefined); setIsFormOpen(true); };
  const handleCloseForm = () => { setIsFormOpen(false); setChamadoToEdit(undefined); };
  const handleEditChamado = (c: Chamado) => { setChamadoToEdit(c); setIsFormOpen(true); };

  const handleFinishChamado = (id: string) => {
    const c = chamados.find(x => x.id === id);
    if (c) { setChamadoToClose(c); setSelectedChamado(null); }
  };

  const handleReopenChamado = async (id: string) => {
    if (window.confirm('Deseja reabrir este chamado?')) {
      const updated = await reopenChamado(id);
      if (updated) toast.success('Chamado reaberto com sucesso!');
    }
  };

  const handleSaveChamado = async (
    chamadoData: Omit<Chamado, 'id' | 'dataCriacao' | 'dataAtualizacao'> & { id?: string }
  ) => {
    if (chamadoData.id) {
      const updated = await updateChamado(chamadoData.id, chamadoData);
      if (updated) toast.success('Chamado atualizado com sucesso!');
    } else {
      const created = await createChamado(chamadoData);
      if (created) toast.success('Chamado criado com sucesso!');
    }
    handleCloseForm();
  };

  const handleDeleteChamado = async (id: string, justification?: string) => {
    const deleted = await deleteChamado(id, justification);
    if (deleted && selectedChamado?.id === id) setSelectedChamado(null);
  };

  const hasActiveFilters = !!(searchTerm || filtroEstruturante || filtroStatus);
  const clearFilters = () => { setSearchTerm(''); setFiltroEstruturante(''); setFiltroStatus(''); };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Você precisa estar logado para visualizar chamados.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg font-medium">Carregando chamados...</p>
      </div>
    );
  }

  const stats = encerrados
    ? [
        { label: 'Resolvidos', value: statusCount['resolvido'] || 0, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
        { label: 'PEN', value: estruturanteCount['PEN'] || 0, icon: Layers, color: 'from-violet-500 to-purple-500' },
        { label: 'PNCP', value: estruturanteCount['PNCP'] || 0, icon: Layers, color: 'from-blue-500 to-cyan-500' },
        { label: 'Outros', value: estruturanteCount['Outros'] || 0, icon: Layers, color: 'from-slate-500 to-slate-700' },
      ]
    : [
        { label: 'Total em aberto', value: chamados.length, icon: Inbox, color: 'from-blue-500 to-indigo-500' },
        { label: 'Em andamento', value: statusCount['em_andamento'] || 0, icon: Clock, color: 'from-orange-500 to-amber-500' },
        { label: 'Aguardando', value: statusCount['agendados_aguardando'] || 0, icon: Clock, color: 'from-yellow-500 to-amber-500' },
        { label: 'Atrasados', value: atrasados, icon: AlertTriangle, color: 'from-rose-500 to-red-600' },
      ];

  const statusOptions = encerrados
    ? [{ value: 'resolvido', label: 'Resolvido' }]
    : [
        { value: 'agendados', label: 'Agendados' },
        { value: 'agendados_planner', label: 'Agendados PLANNER' },
        { value: 'agendados_aguardando', label: 'Aguardando devolutiva' },
        { value: 'em_andamento', label: 'Em andamento' },
      ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-xl`} />
              <div className="relative flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</div>
                  <div className="text-2xl font-bold leading-tight">{s.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por título, acompanhamento, nº ou solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filtroEstruturante}
              onChange={(e) => setFiltroEstruturante(e.target.value)}
              className="px-3 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
            >
              <option value="">Todos estruturantes</option>
              <option value="PNCP">PNCP ({estruturanteCount['PNCP'] || 0})</option>
              <option value="PEN">PEN ({estruturanteCount['PEN'] || 0})</option>
              <option value="Outros">Outros ({estruturanteCount['Outros'] || 0})</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
            >
              <option value="">Todos status</option>
              {statusOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label} ({statusCount[o.value] || 0})
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2.5 rounded-xl border bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
              >
                <X size={14} /> Limpar
              </button>
            )}

            {chamadosFiltrados.length > 0 && (
              <button
                onClick={() => exportChamadosCSV(chamadosFiltrados, encerrados ? 'chamados_encerrados' : 'chamados')}
                className="px-3 py-2.5 rounded-xl border bg-background text-sm flex items-center gap-1.5 hover:bg-muted transition-colors"
              >
                <Download size={16} />
                Exportar
              </button>
            )}

            {!encerrados && (
              <button
                onClick={handleOpenForm}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground text-sm font-medium flex items-center gap-1.5 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:opacity-95 transition-all"
              >
                <Plus size={16} />
                Novo Chamado
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
            <span>{chamadosFiltrados.length} de {chamados.length} chamados</span>
          </div>
        )}
      </div>

      {/* List */}
      {chamadosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          {hasActiveFilters ? (
            <>
              <p className="text-lg font-medium">Nenhum chamado encontrado</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Tente ajustar os filtros ou{' '}
                <button onClick={clearFilters} className="text-primary hover:underline">
                  limpá-los
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">
                {encerrados ? 'Nenhum chamado encerrado' : 'Nenhum chamado em aberto'}
              </p>
              {!encerrados && (
                <p className="text-muted-foreground mt-1 text-sm">
                  Comece agora mesmo{' '}
                  <button onClick={handleOpenForm} className="text-primary hover:underline">
                    criando seu primeiro chamado
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {chamadosFiltrados.map((chamado) => (
            <ChamadoCard
              key={chamado.id}
              chamado={chamado}
              onEdit={handleEditChamado}
              onDelete={handleDeleteChamado}
              onFinish={!encerrados ? handleFinishChamado : undefined}
              onReopen={encerrados ? handleReopenChamado : undefined}
              onViewDetails={(c) => setSelectedChamado(c)}
            />
          ))}
        </div>
      )}

      {isFormOpen && (
        <ChamadoForm onClose={handleCloseForm} onSave={handleSaveChamado} chamado={chamadoToEdit} />
      )}

      {selectedChamado && (
        <ChamadoModal
          chamado={selectedChamado}
          onClose={() => setSelectedChamado(null)}
          onEdit={handleEditChamado}
          onDelete={handleDeleteChamado}
          onFinish={!encerrados ? handleFinishChamado : undefined}
          onReopen={encerrados ? handleReopenChamado : undefined}
        />
      )}

      <CloseTicketModal
        open={!!chamadoToClose}
        onOpenChange={(open) => !open && setChamadoToClose(null)}
        chamado={chamadoToClose}
        onSuccess={() => setChamadoToClose(null)}
      />
    </div>
  );
};

export default ChamadoList;
