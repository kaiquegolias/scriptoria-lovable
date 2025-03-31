
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface UserProfile {
  user_id: string;
  nome?: string;
  empresa?: string;
  cargo?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch user profile from Supabase
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is the "no rows returned" error code
        throw error;
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // If no profile exists yet, create one
        await createInitialProfile();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao buscar perfil de usuário.');
    } finally {
      setLoading(false);
    }
  };

  // Create an initial profile for new users
  const createInitialProfile = async () => {
    if (!user) return;

    try {
      const initialProfile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
        user_id: user.id,
        nome: user.email?.split('@')[0] || undefined,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([initialProfile])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Error creating initial profile:', error);
      toast.error('Erro ao criar perfil inicial.');
    }
  };

  // Update user profile
  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user || !profile) {
      toast.error('Você precisa estar logado para atualizar seu perfil.');
      return null;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data as UserProfile);
        toast.success('Perfil atualizado com sucesso!');
        return data as UserProfile;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Load initial data
  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile: fetchProfile
  };
}
