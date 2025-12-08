import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface ScriptLibraryItem {
  id: string;
  title: string;
  description: string | null;
  content: string;
  tags: string[];
  sistema: string | null;
  versao: string | null;
  pre_condicoes: string | null;
  scripts_relacionados: string[];
  usage_count: number;
  success_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScriptInput {
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  sistema?: string;
  versao?: string;
  pre_condicoes?: string;
  scripts_relacionados?: string[];
}

export function useScriptsLibrary() {
  const [scripts, setScripts] = useState<ScriptLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchScripts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scripts_library')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setScripts((data as ScriptLibraryItem[]) || []);
    } catch (error) {
      console.error('Error fetching scripts library:', error);
      toast.error('Erro ao buscar biblioteca de scripts.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createScript = useCallback(async (input: CreateScriptInput) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('scripts_library')
        .insert({
          ...input,
          tags: input.tags || [],
          scripts_relacionados: input.scripts_relacionados || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newScript = data as ScriptLibraryItem;
      setScripts(prev => [newScript, ...prev]);
      toast.success('Script adicionado à biblioteca!');

      // Trigger indexing
      await indexScript(newScript.id);

      return newScript;
    } catch (error) {
      console.error('Error creating script:', error);
      toast.error('Erro ao criar script.');
      return null;
    }
  }, [user]);

  const updateScript = useCallback(async (id: string, input: Partial<CreateScriptInput>) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('scripts_library')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedScript = data as ScriptLibraryItem;
      setScripts(prev => prev.map(s => s.id === id ? updatedScript : s));
      toast.success('Script atualizado!');

      // Trigger re-indexing
      await indexScript(id);

      return updatedScript;
    } catch (error) {
      console.error('Error updating script:', error);
      toast.error('Erro ao atualizar script.');
      return null;
    }
  }, [user]);

  const deleteScript = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('scripts_library')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setScripts(prev => prev.filter(s => s.id !== id));
      toast.success('Script removido da biblioteca!');

      // Remove from vector index
      await supabase.from('kb_vectors').delete().eq('source_id', id);

      return true;
    } catch (error) {
      console.error('Error deleting script:', error);
      toast.error('Erro ao remover script.');
      return false;
    }
  }, [user]);

  const searchScripts = useCallback(async (query: string, tags?: string[]) => {
    try {
      let supabaseQuery = supabase
        .from('scripts_library')
        .select('*')
        .order('usage_count', { ascending: false });

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`
        );
      }

      if (tags && tags.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('tags', tags);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return (data as ScriptLibraryItem[]) || [];
    } catch (error) {
      console.error('Error searching scripts:', error);
      return [];
    }
  }, []);

  const incrementUsage = useCallback(async (id: string, success: boolean) => {
    try {
      const script = scripts.find(s => s.id === id);
      if (!script) return;

      const newUsageCount = script.usage_count + 1;
      const newSuccessRate = success 
        ? ((script.success_rate * script.usage_count) + 100) / newUsageCount
        : (script.success_rate * script.usage_count) / newUsageCount;

      await supabase
        .from('scripts_library')
        .update({
          usage_count: newUsageCount,
          success_rate: newSuccessRate,
        })
        .eq('id', id);

      setScripts(prev => prev.map(s => 
        s.id === id 
          ? { ...s, usage_count: newUsageCount, success_rate: newSuccessRate }
          : s
      ));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [scripts]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  return {
    scripts,
    loading,
    createScript,
    updateScript,
    deleteScript,
    searchScripts,
    incrementUsage,
    refreshScripts: fetchScripts,
  };
}

// Helper function to index a script for similarity matching
async function indexScript(scriptId: string) {
  try {
    const { data: script } = await supabase
      .from('scripts_library')
      .select('id, title, content, tags, description')
      .eq('id', scriptId)
      .single();

    if (!script) return;

    // Generate simple TF-IDF-like tokens
    const text = `${script.title || ''} ${script.description || ''} ${script.content || ''}`;
    const tokens = generateTokens(text);

    // Upsert vector entry
    await supabase
      .from('kb_vectors')
      .upsert({
        source_type: 'script',
        source_id: script.id,
        title: script.title,
        content_preview: (script.content || '').substring(0, 200),
        tokens,
        keywords: script.tags || [],
      }, { onConflict: 'source_id' });
  } catch (error) {
    console.error('Error indexing script:', error);
  }
}

function generateTokens(text: string): Record<string, number> {
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúàèìòùãõâêîôûç]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Normalize to TF
  const total = words.length;
  const tokens: Record<string, number> = {};
  Object.entries(frequency).forEach(([word, count]) => {
    tokens[word] = count / total;
  });

  return tokens;
}
