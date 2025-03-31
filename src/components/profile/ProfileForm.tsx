
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from 'lucide-react';

interface ProfileData {
  nome: string;
  empresa: string;
  cargo: string;
  telefone: string;
}

const ProfileForm: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    nome: '',
    empresa: '',
    cargo: '',
    telefone: ''
  });

  // Fetch existing profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGSQL_ERROR_NO_DATA_FOUND') {
          throw error;
        }
        
        if (data) {
          setProfileData({
            nome: data.nome || '',
            empresa: data.empresa || '',
            cargo: data.cargo || '',
            telefone: data.telefone || ''
          });
        } else {
          // Set email as default name if no profile exists
          setProfileData({
            nome: user.email?.split('@')[0] || '',
            empresa: '',
            cargo: '',
            telefone: ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para atualizar seu perfil');
      return;
    }
    
    try {
      setSaving(true);
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            nome: profileData.nome,
            empresa: profileData.empresa,
            cargo: profileData.cargo,
            telefone: profileData.telefone,
          })
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              nome: profileData.nome,
              empresa: profileData.empresa,
              cargo: profileData.cargo,
              telefone: profileData.telefone,
            }
          ]);
          
        if (error) throw error;
      }
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };
  
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Você precisa estar logado para visualizar seu perfil.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg font-medium">Carregando perfil...</p>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <div className="mx-auto bg-primary/10 h-24 w-24 rounded-full flex items-center justify-center mb-4">
          <User size={48} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{profileData.nome || user.email?.split('@')[0]}</h1>
        <p className="text-foreground/70">{user.email}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 glass p-6 rounded-xl">
        <div className="space-y-2">
          <label htmlFor="nome" className="block text-sm font-medium">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={profileData.nome}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="Seu nome"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="empresa" className="block text-sm font-medium">
            Empresa
          </label>
          <input
            id="empresa"
            name="empresa"
            type="text"
            value={profileData.empresa}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="Nome da sua empresa"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="cargo" className="block text-sm font-medium">
            Cargo
          </label>
          <input
            id="cargo"
            name="cargo"
            type="text"
            value={profileData.cargo}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="Seu cargo"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="telefone" className="block text-sm font-medium">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            value={profileData.telefone}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="Seu telefone"
          />
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
