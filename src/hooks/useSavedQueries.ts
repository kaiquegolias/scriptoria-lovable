import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface SavedQuery {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  description: string | null;
  query: string;
  is_favorite: boolean;
}

export interface CreateQueryInput {
  name: string;
  description?: string;
  query: string;
  is_favorite?: boolean;
}

export function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchQueries = useCallback(async () => {
    if (!user) {
      setQueries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_queries')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setQueries(data as SavedQuery[] || []);
    } catch (error) {
      console.error('Error fetching saved queries:', error);
      toast.error('Erro ao buscar consultas salvas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createQuery = useCallback(async (input: CreateQueryInput) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description,
          query: input.query,
          is_favorite: input.is_favorite || false,
        })
        .select()
        .single();

      if (error) throw error;

      const newQuery = data as SavedQuery;
      setQueries(prev => [newQuery, ...prev]);
      toast.success('Consulta salva com sucesso!');
      return newQuery;
    } catch (error) {
      console.error('Error creating saved query:', error);
      toast.error('Erro ao salvar consulta.');
      return null;
    }
  }, [user]);

  const updateQuery = useCallback(async (id: string, updates: Partial<CreateQueryInput>) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedQuery = data as SavedQuery;
      setQueries(prev => prev.map(q => q.id === id ? updatedQuery : q));
      toast.success('Consulta atualizada!');
      return updatedQuery;
    } catch (error) {
      console.error('Error updating saved query:', error);
      toast.error('Erro ao atualizar consulta.');
      return null;
    }
  }, [user]);

  const deleteQuery = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('saved_queries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQueries(prev => prev.filter(q => q.id !== id));
      toast.success('Consulta excluída!');
      return true;
    } catch (error) {
      console.error('Error deleting saved query:', error);
      toast.error('Erro ao excluir consulta.');
      return false;
    }
  }, [user]);

  const toggleFavorite = useCallback(async (id: string) => {
    const query = queries.find(q => q.id === id);
    if (!query) return null;

    return updateQuery(id, { is_favorite: !query.is_favorite });
  }, [queries, updateQuery]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  return {
    queries,
    loading,
    createQuery,
    updateQuery,
    deleteQuery,
    toggleFavorite,
    refreshQueries: fetchQueries,
  };
}
