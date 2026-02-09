import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Brain, Sparkles } from 'lucide-react';
import CortanaChat from '@/components/cortana/CortanaChat';
import CortanaTraining from '@/components/cortana/CortanaTraining';

const Cortana: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-md shadow-primary/10 border border-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cortana</h1>
          <p className="text-sm text-muted-foreground">Assistente de IA para análise de chamados e base de conhecimento</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full max-w-sm grid-cols-2 h-11">
          <TabsTrigger value="chat" className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" />
            Treinamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <CortanaChat />
        </TabsContent>

        <TabsContent value="training">
          <CortanaTraining />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cortana;
