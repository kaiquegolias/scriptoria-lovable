
import React, { useEffect, useState } from 'react';
import { FileText, PhoneCall, CheckCircle, Clock, AlertCircle, BarChart3, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/dashboard/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

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
    chamadosByStatus: {} as Record<string, number>
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Get scripts count
        const { data: scripts, error: scriptsError } = await supabase
          .from('scripts')
          .select('id', { count: 'exact' });
        
        if (scriptsError) throw scriptsError;
        
        // Get chamados counts
        const { data: chamados, error: chamadosError } = await supabase
          .from('chamados')
          .select('*');
        
        if (chamadosError) throw chamadosError;
        
        // Process chamados data
        const chamadosOpen = chamados.filter(c => c.status !== 'resolvido');
        const chamadosClosed = chamados.filter(c => c.status === 'resolvido');
        
        // Get today's chamados
        const today = new Date().toISOString().split('T')[0];
        const chamadosToday = chamados.filter(c => 
          new Date(c.data_criacao).toISOString().split('T')[0] === today
        ).length;
        
        // Get resolved today
        const resolvedToday = chamados.filter(c => 
          c.status === 'resolvido' && 
          new Date(c.data_atualizacao).toISOString().split('T')[0] === today
        ).length;
        
        // Count by estruturante
        const chamadosByEstruturante = chamados.reduce((acc, chamado) => {
          acc[chamado.estruturante] = (acc[chamado.estruturante] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Count by status
        const chamadosByStatus = chamados.reduce((acc, chamado) => {
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
          chamadosByStatus
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  // Get display name from user email or use a default greeting
  const userDisplayName = user?.email?.split('@')[0] || 'usuário';

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fade-in text-center">
        <h1 className="text-2xl font-bold mb-4">Bem-vindo ao ScriptFlow</h1>
        <p className="mb-8">Por favor, faça login para acessar seu dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fade-in text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg font-medium">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-foreground/70 mb-8">
        Bem-vindo, {userDisplayName}. Veja um resumo das suas atividades.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Scripts"
          value={stats.scriptsCount}
          icon={<FileText size={24} />}
          color="primary"
        />
        
        <StatCard
          title="Chamados em Aberto"
          value={stats.chamadosOpenCount}
          description="Aguardando resolução"
          icon={<PhoneCall size={24} />}
          color="warning"
        />
        
        <StatCard
          title="Chamados Encerrados"
          value={stats.chamadosClosedCount}
          description="Total finalizado"
          icon={<CheckCircle size={24} />}
          color="success"
        />
        
        <StatCard
          title="Resolvidos Hoje"
          value={stats.resolvedToday}
          description={`De ${stats.chamadosToday} novos chamados hoje`}
          icon={<Clock size={24} />}
          color="info"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Chamados por Estruturante</h2>
            <Link to="/chamados" className="text-sm text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-estruturante-pncp mr-2"></div>
                <span className="text-sm">PNCP</span>
              </div>
              <span className="font-medium">{stats.chamadosByEstruturante['PNCP'] || 0}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-estruturante-pen mr-2"></div>
                <span className="text-sm">PEN</span>
              </div>
              <span className="font-medium">{stats.chamadosByEstruturante['PEN'] || 0}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-estruturante-other mr-2"></div>
                <span className="text-sm">Outros</span>
              </div>
              <span className="font-medium">{stats.chamadosByEstruturante['Outros'] || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Status dos Chamados</h2>
            <Link to="/chamados" className="text-sm text-primary hover:underline">
              Ver detalhes →
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-status-info mr-2"></div>
                <span className="text-sm">Agendados</span>
              </div>
              <span className="font-medium">
                {stats.chamadosByStatus['agendados'] || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                <span className="text-sm">Agendados PLANNER</span>
              </div>
              <span className="font-medium">
                {stats.chamadosByStatus['agendados_planner'] || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm">Aguardando devolutiva</span>
              </div>
              <span className="font-medium">
                {stats.chamadosByStatus['agendados_aguardando'] || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-status-warning mr-2"></div>
                <span className="text-sm">Em Andamento</span>
              </div>
              <span className="font-medium">
                {stats.chamadosByStatus['em_andamento'] || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-status-success mr-2"></div>
                <span className="text-sm">Resolvidos</span>
              </div>
              <span className="font-medium">
                {stats.chamadosByStatus['resolvido'] || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          to="/scripts" 
          className="glass p-6 rounded-xl text-center hover-lift flex flex-col items-center justify-center gap-3"
        >
          <div className="bg-primary/10 p-3 rounded-full">
            <FileText size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-medium">Gerenciar Scripts</h3>
          <p className="text-sm text-foreground/70">
            Crie e organize seus scripts e respostas padrão
          </p>
        </Link>
        
        <Link 
          to="/chamados" 
          className="glass p-6 rounded-xl text-center hover-lift flex flex-col items-center justify-center gap-3"
        >
          <div className="bg-primary/10 p-3 rounded-full">
            <PhoneCall size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-medium">Gerenciar Chamados</h3>
          <p className="text-sm text-foreground/70">
            Acompanhe e atualize o status dos seus chamados
          </p>
        </Link>
        
        <Link 
          to="/chamados-encerrados" 
          className="glass p-6 rounded-xl text-center hover-lift flex flex-col items-center justify-center gap-3"
        >
          <div className="bg-primary/10 p-3 rounded-full">
            <CheckCircle size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-medium">Chamados Encerrados</h3>
          <p className="text-sm text-foreground/70">
            Visualize o histórico de chamados finalizados
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
