import React, { useEffect, useState } from 'react';
import { FileText, PhoneCall, CheckCircle, Clock, Calendar, Sparkles, BookOpen, ArrowRight, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchAllRows } from '@/lib/fetchAll';
import { Button } from '@/components/ui/button';

type Row = { status: string; estruturante: string; data_criacao: string; data_atualizacao: string; data_limite: string | null };

const STATUS_ITEMS = [
  { label: 'Agendados', key: 'agendados', color: 'bg-primary' },
  { label: 'Agendados PLANNER', key: 'agendados_planner', color: 'bg-accent-foreground' },
  { label: 'Aguardando devolutiva', key: 'agendados_aguardando', color: 'bg-warning' },
  { label: 'Em andamento', key: 'em_andamento', color: 'bg-success' },
];

const sameDay = (iso: string | null | undefined, ref: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [scriptsCount, setScriptsCount] = useState(0);
  const [diaryPending, setDiaryPending] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [chamados, scripts, diary] = await Promise.all([
        fetchAllRows<Row>(() => supabase.from('chamados').select('status, estruturante, data_criacao, data_atualizacao, data_limite').order('id')),
        supabase.from('scripts').select('id', { count: 'exact', head: true }),
        supabase.from('diary_entries').select('id', { count: 'exact', head: true }).eq('completed', false),
      ]);
      setRows(chamados);
      setScriptsCount(scripts.count || 0);
      setDiaryPending(diary.count || 0);
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
      setError('Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Bem-vindo ao Thoth</h1>
        <p className="text-muted-foreground">Faça login para acessar seu painel.</p>
      </div>
    );
  }

  const now = new Date();
  const active = rows.filter(c => c.status !== 'excluido');
  const deleted = rows.length - active.length;
  const open = active.filter(c => c.status !== 'resolvido');
  const closed = active.filter(c => c.status === 'resolvido');
  const overdue = open.filter(c => c.data_limite && new Date(c.data_limite) < now).length;
  const newToday = active.filter(c => sameDay(c.data_criacao, now)).length;
  const resolvedToday = closed.filter(c => sameDay(c.data_atualizacao, now)).length;
  const byStatus = open.reduce<Record<string, number>>((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
  const estr = ['PEN', 'PNCP', 'Outros'].map(name => ({
    name,
    open: open.filter(c => c.estruturante === name).length,
    closed: closed.filter(c => c.estruturante === name).length,
  }));
  const userDisplayName = user.email?.split('@')[0] || 'usuário';

  const statCards = [
    { title: 'Na fila', value: open.length, icon: PhoneCall, tone: 'text-primary bg-primary/10', sub: `${overdue} vencido(s)` },
    { title: 'Encerrados', value: closed.length, icon: CheckCircle, tone: 'text-success bg-success/10', sub: `${resolvedToday} hoje` },
    { title: 'Novos hoje', value: newToday, icon: Clock, tone: 'text-warning bg-warning/10', sub: now.toLocaleDateString('pt-BR') },
    { title: 'Excluídos', value: deleted, icon: Trash2, tone: 'text-destructive bg-destructive/10', sub: 'fora da contagem' },
  ];

  const quickLinks = [
    { to: '/chamados', title: 'Chamados', desc: 'Fila ativa', icon: PhoneCall },
    { to: '/scripts', title: 'Scripts', desc: `${scriptsCount} cadastrados`, icon: FileText },
    { to: '/diario', title: 'Diário', desc: `${diaryPending} pendente(s)`, icon: Calendar },
    { to: '/chamados-encerrados', title: 'Encerrados', desc: 'Histórico', icon: CheckCircle },
    { to: '/cortana', title: 'Assistentes IA', desc: 'Cortana e adaPNCP', icon: Sparkles },
    { to: '/biblioteca', title: 'Biblioteca', desc: 'Base de conhecimento', icon: BookOpen },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Painel</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Olá, {userDisplayName}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Resumo da sua operação em tempo real.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" /> {error}
          <Button size="sm" variant="ghost" onClick={load} className="ml-auto">Tentar novamente</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border/60 rounded-2xl p-5">
            <div className={`inline-flex p-2.5 rounded-xl ${card.tone}`}><card.icon size={18} /></div>
            <p className="text-3xl font-bold mt-3 tabular-nums">{loading ? '—' : card.value}</p>
            <p className="text-sm font-medium mt-1">{card.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{loading ? '' : card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border/60 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold">Fila por estruturante</h2>
            <Link to="/chamados" className="text-xs text-primary hover:underline flex items-center gap-1">Ver fila <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-5">
            {estr.map(item => {
              const pct = open.length ? Math.round((item.open / open.length) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex justify-between items-baseline mb-1.5 text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground tabular-nums">{item.open} na fila · {item.closed} encerrados</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold">Status da fila</h2>
            <span className="text-xs text-muted-foreground">{open.length} ativo(s)</span>
          </div>
          <div className="space-y-2">
            {STATUS_ITEMS.map(item => (
              <div key={item.key} className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-muted/40">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="font-semibold text-sm tabular-nums">{loading ? '—' : byStatus[item.key] || 0}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-destructive/5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-sm">Vencidos</span>
              </div>
              <span className="font-semibold text-sm tabular-nums text-destructive">{loading ? '—' : overdue}</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-base font-semibold mb-4">Acesso rápido</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map(link => (
          <Link key={link.to} to={link.to}
            className="group bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all flex flex-col gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary w-fit"><link.icon size={18} /></div>
            <div>
              <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{link.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
