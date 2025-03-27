
import React, { useEffect, useState } from 'react';
import { FileText, PhoneCall, CheckCircle, Clock, AlertCircle, BarChart3, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/dashboard/StatCard';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Script } from '@/components/scripts/ScriptCard';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const scriptStorageKey = `scripts-${user?.id || 'guest'}`;
  const chamadoStorageKey = `chamados-${user?.id || 'guest'}`;
  
  const [scripts] = useLocalStorage<Script[]>(scriptStorageKey, []);
  const [chamados] = useLocalStorage<Chamado[]>(chamadoStorageKey, []);
  
  const chamadosEmAberto = chamados.filter(c => c.status !== 'resolvido');
  const chamadosResolvidos = chamados.filter(c => c.status === 'resolvido');
  
  // Estatísticas de chamados
  const chamadosPorEstruturante = chamados.reduce((acc, chamado) => {
    acc[chamado.estruturante] = (acc[chamado.estruturante] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Chamados adicionados hoje
  const hoje = new Date().toISOString().split('T')[0];
  const chamadosHoje = chamados.filter(c => 
    new Date(c.dataCriacao).toISOString().split('T')[0] === hoje
  ).length;
  
  // Chamados resolvidos hoje
  const resolvidos = chamados.filter(c => 
    c.status === 'resolvido' && 
    new Date(c.dataAtualizacao).toISOString().split('T')[0] === hoje
  ).length;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-foreground/70 mb-8">
        Bem-vindo, {user?.name}. Veja um resumo das suas atividades.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Scripts"
          value={scripts.length}
          icon={<FileText size={24} />}
          color="primary"
        />
        
        <StatCard
          title="Chamados em Aberto"
          value={chamadosEmAberto.length}
          description="Aguardando resolução"
          icon={<PhoneCall size={24} />}
          color="warning"
        />
        
        <StatCard
          title="Chamados Encerrados"
          value={chamadosResolvidos.length}
          description="Total finalizado"
          icon={<CheckCircle size={24} />}
          color="success"
        />
        
        <StatCard
          title="Resolvidos Hoje"
          value={resolvidos}
          description={`De ${chamadosHoje} novos chamados hoje`}
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
              <span className="font-medium">{chamadosPorEstruturante['PNCP'] || 0}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-estruturante-pen mr-2"></div>
                <span className="text-sm">PEN</span>
              </div>
              <span className="font-medium">{chamadosPorEstruturante['PEN'] || 0}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-estruturante-other mr-2"></div>
                <span className="text-sm">Outros</span>
              </div>
              <span className="font-medium">{chamadosPorEstruturante['Outros'] || 0}</span>
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
                <span className="text-sm">Abertos</span>
              </div>
              <span className="font-medium">
                {chamados.filter(c => c.status === 'aberto').length}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-status-warning mr-2"></div>
                <span className="text-sm">Em Andamento</span>
              </div>
              <span className="font-medium">
                {chamados.filter(c => c.status === 'em_andamento').length}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                <span className="text-sm">Pendentes</span>
              </div>
              <span className="font-medium">
                {chamados.filter(c => c.status === 'pendente').length}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-status-success mr-2"></div>
                <span className="text-sm">Resolvidos</span>
              </div>
              <span className="font-medium">
                {chamados.filter(c => c.status === 'resolvido').length}
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
