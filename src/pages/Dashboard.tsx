import React, { useEffect, useState } from 'react';
import { FileText, PhoneCall, CheckCircle, Clock, Calendar, BarChart3, Sparkles, BookOpen, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    scriptsCount: 0,
    chamadosOpenCount: 0,
    chamadosClosedCount: 0,
    chamadosToday: 0,
    resolvedToday: 0,
    chamadosByEstruturante: {} as Record<string, number>,
    chamadosByStatus: {} as Record<string, number>,
    diaryPendingCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data: scripts } = await supabase
          .from('scripts')
          .select('id', { count: 'exact' });
        
        const { data: chamados } = await supabase
          .from('chamados')
          .select('*');
        
        const { data: diary } = await supabase
          .from('diary_entries')
          .select('id')
          .eq('completed', false);
        
        if (chamados) {
          const activeChamados = chamados.filter(c => c.status !== 'excluido');
          const chamadosOpen = activeChamados.filter(c => c.status !== 'resolvido');
          const chamadosClosed = activeChamados.filter(c => c.status === 'resolvido');
          
          const today = new Date().toISOString().split('T')[0];
          const chamadosToday = activeChamados.filter(c => 
            new Date(c.data_criacao).toISOString().split('T')[0] === today
          ).length;
          
          const resolvedToday = activeChamados.filter(c => 
            c.status === 'resolvido' && 
            new Date(c.data_atualizacao).toISOString().split('T')[0] === today
          ).length;
          
          const chamadosByEstruturante = chamadosOpen.reduce((acc, chamado) => {
            acc[chamado.estruturante] = (acc[chamado.estruturante] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const chamadosByStatus = activeChamados.reduce((acc, chamado) => {
            acc[chamado.status] = (acc[chamado.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          setStats({
            scriptsCount: scripts?.length || 0,
            chamadosOpenCount: chamadosOpen.length,
            chamadosClosedCount: chamadosClosed.length,
            chamadosToday,
            resolvedToday,
            chamadosByEstruturante,
            chamadosByStatus,
            diaryPendingCount: diary?.length || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const userDisplayName = user?.email?.split('@')[0] || 'usuário';

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fade-in text-center">
        <h1 className="text-2xl font-bold mb-4">Bem-vindo ao Thoth</h1>
        <p className="mb-8">Por favor, faça login para acessar seu dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 animate-fade-in text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { title: 'Chamados Abertos', value: stats.chamadosOpenCount, icon: PhoneCall, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Encerrados', value: stats.chamadosClosedCount, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Resolvidos Hoje', value: stats.resolvedToday, icon: Clock, color: 'text-primary', bg: 'bg-primary/10', sub: `${stats.chamadosToday} novos hoje` },
    { title: 'Scripts', value: stats.scriptsCount, icon: FileText, color: 'text-accent-foreground', bg: 'bg-accent' },
  ];

  const quickLinks = [
    { to: '/chamados', title: 'Chamados', desc: 'Gerenciar chamados ativos', icon: PhoneCall, color: 'text-primary', bg: 'bg-primary/10' },
    { to: '/scripts', title: 'Scripts', desc: 'Seus scripts e respostas', icon: FileText, color: 'text-accent-foreground', bg: 'bg-accent' },
    { to: '/diario', title: 'Diário', desc: `${stats.diaryPendingCount} tarefas pendentes`, icon: Calendar, color: 'text-warning', bg: 'bg-warning/10' },
    { to: '/chamados-encerrados', title: 'Encerrados', desc: 'Histórico de finalizados', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { to: '/cortana', title: 'Cortana', desc: 'Assistente inteligente', icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
    { to: '/biblioteca', title: 'Biblioteca', desc: 'Base de conhecimento', icon: BookOpen, color: 'text-accent-foreground', bg: 'bg-accent' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          className="text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Olá, {userDisplayName} 👋
        </motion.h1>
        <p className="text-muted-foreground mt-1">Veja um resumo das suas atividades.</p>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border/60 rounded-2xl p-5 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.title}</p>
            {card.sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{card.sub}</p>}
          </motion.div>
        ))}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border/60 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold">Por Estruturante</h2>
            <Link to="/chamados" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'PNCP', color: 'bg-estruturante-pncp', count: stats.chamadosByEstruturante['PNCP'] || 0 },
              { name: 'PEN', color: 'bg-estruturante-pen', count: stats.chamadosByEstruturante['PEN'] || 0 },
              { name: 'Outros', color: 'bg-estruturante-other', count: stats.chamadosByEstruturante['Outros'] || 0 },
            ].map(item => {
              const total = stats.chamadosOpenCount || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 bg-accent rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border/60 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold">Status dos Chamados</h2>
            <Link to="/chamados" className="text-xs text-primary hover:underline flex items-center gap-1">
              Detalhes <ArrowRight size={12} />
            </Link>
          </div>
          
          <div className="space-y-3">
            {[
              { label: 'Agendados', key: 'agendados', color: 'bg-status-info' },
              { label: 'Agendados PLANNER', key: 'agendados_planner', color: 'bg-purple-500' },
              { label: 'Aguardando devolutiva', key: 'agendados_aguardando', color: 'bg-yellow-500' },
              { label: 'Em Andamento', key: 'em_andamento', color: 'bg-status-warning' },
              { label: 'Resolvidos', key: 'resolvido', color: 'bg-status-success' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="font-semibold text-sm tabular-nums">
                  {stats.chamadosByStatus[item.key] || 0}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Quick Links */}
      <h2 className="text-base font-semibold mb-4">Acesso Rápido</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map((link, i) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.04 }}
          >
            <Link
              to={link.to}
              className="bg-card border border-border/60 rounded-2xl p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2.5 h-full"
            >
              <div className={`p-2.5 rounded-xl ${link.bg}`}>
                <link.icon size={20} className={link.color} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{link.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
