import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Brain, Sparkles, Landmark, ShieldCheck } from 'lucide-react';
import CortanaChat from '@/components/cortana/CortanaChat';
import CortanaTraining from '@/components/cortana/CortanaTraining';
import { CortanaDomain, CortanaDomainProvider, DOMAIN_META } from '@/context/CortanaDomainContext';
import { cn } from '@/lib/utils';

const AGENTS: { id: CortanaDomain; icon: React.ElementType }[] = [
  { id: 'PEN', icon: Sparkles },
  { id: 'PNCP', icon: Landmark },
];

const Cortana: React.FC = () => {
  const { user } = useAuth();
  const [domain, setDomain] = useState<CortanaDomain>(() =>
    (localStorage.getItem('thoth:agent') as CortanaDomain) || 'PEN');

  if (!user) return <Navigate to="/" replace />;

  const pick = (d: CortanaDomain) => { setDomain(d); localStorage.setItem('thoth:agent', d); };
  const meta = DOMAIN_META[domain];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-accent/40 p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3 w-3" /> Thoth 3.0 · Agentes isolados
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{meta.name}</h1>
            <p className="text-sm text-muted-foreground">{meta.tagline} — conhecimento 100% separado por domínio.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background/70 p-1.5 backdrop-blur border border-border/60">
            {AGENTS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => pick(id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  domain === id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {id === 'PEN' ? 'Cortana PEN' : 'adaPNCP'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CortanaDomainProvider domain={domain} key={domain}>
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid w-full max-w-sm grid-cols-2 h-11 rounded-2xl">
            <TabsTrigger value="chat" className="flex items-center gap-2 text-sm rounded-xl">
              <MessageSquare className="h-4 w-4" /> Chat
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2 text-sm rounded-xl">
              <Brain className="h-4 w-4" /> Treinamento {domain}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat"><CortanaChat /></TabsContent>
          <TabsContent value="training"><CortanaTraining /></TabsContent>
        </Tabs>
      </CortanaDomainProvider>
    </div>
  );
};

export default Cortana;
