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
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Cortana</h1>
          <p className="text-muted-foreground">Assistente de IA para análise de chamados e base de conhecimento</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Treinar Cortana
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
