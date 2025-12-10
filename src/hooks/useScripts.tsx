
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Script } from '@/components/scripts/ScriptCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useScripts() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch scripts from Supabase
  const fetchScripts = async () => {
    if (!user) {
      setScripts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching scripts:', error);
        setScripts([]);
        setLoading(false);
        return;
      }

      const formattedScripts: Script[] = (data || []).map(item => ({
        id: item.id,
        nome: item.nome,
        estruturante: item.estruturante as 'PNCP' | 'PEN' | 'Outros',
        nivel: item.nivel as 'N1' | 'N2' | 'N3',
        situacao: item.situacao,
        modelo: item.modelo,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      setScripts(formattedScripts);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching scripts:', error);
      setScripts([]);
      setLoading(false);
    }
  };

  // Create a new script
  const createScript = async (scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar scripts.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('scripts')
        .insert([
          {
            user_id: user.id,
            nome: scriptData.nome,
            estruturante: scriptData.estruturante,
            nivel: scriptData.nivel,
            situacao: scriptData.situacao,
            modelo: scriptData.modelo
          }
        ])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const newScript: Script = {
          id: data.id,
          nome: data.nome,
          estruturante: data.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: data.nivel as 'N1' | 'N2' | 'N3',
          situacao: data.situacao,
          modelo: data.modelo,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };

        setScripts([newScript, ...scripts]);
        return newScript;
      }
    } catch (error) {
      console.error('Error creating script:', error);
      toast.error('Erro ao criar script.');
    }
    return null;
  };

  // Update an existing script
  const updateScript = async (id: string, scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para atualizar scripts.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('scripts')
        .update({
          nome: scriptData.nome,
          estruturante: scriptData.estruturante,
          nivel: scriptData.nivel,
          situacao: scriptData.situacao,
          modelo: scriptData.modelo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const updatedScript: Script = {
          id: data.id,
          nome: data.nome,
          estruturante: data.estruturante as 'PNCP' | 'PEN' | 'Outros',
          nivel: data.nivel as 'N1' | 'N2' | 'N3',
          situacao: data.situacao,
          modelo: data.modelo,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };

        setScripts(scripts.map(script => script.id === id ? updatedScript : script));
        return updatedScript;
      }
    } catch (error) {
      console.error('Error updating script:', error);
      toast.error('Erro ao atualizar script.');
    }
    return null;
  };

  // Delete a script
  const deleteScript = async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para excluir scripts.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('scripts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setScripts(scripts.filter(script => script.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting script:', error);
      toast.error('Erro ao excluir script.');
      return false;
    }
  };

  // Load initial data
  useEffect(() => {
    fetchScripts();
  }, [user]);

  return {
    scripts,
    loading,
    createScript,
    updateScript,
    deleteScript,
    refreshScripts: fetchScripts
  };
}
