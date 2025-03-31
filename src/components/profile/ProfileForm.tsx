
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Building, Briefcase, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, UserProfile } from '@/hooks/useProfile';

const ProfileForm = () => {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  
  const [formState, setFormState] = useState({
    nome: '',
    empresa: '',
    cargo: '',
    telefone: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setFormState({
        nome: profile.nome || '',
        empresa: profile.empresa || '',
        cargo: profile.cargo || '',
        telefone: profile.telefone || '',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para atualizar seu perfil.');
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(formState);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Dados do perfil</CardTitle>
        <CardDescription>
          Atualize suas informações pessoais
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center">
              <UserCircle2 className="mr-2 h-4 w-4" /> Nome
            </Label>
            <Input
              id="nome"
              name="nome"
              value={formState.nome}
              onChange={handleChange}
              placeholder="Seu nome completo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="empresa" className="flex items-center">
              <Building className="mr-2 h-4 w-4" /> Empresa
            </Label>
            <Input
              id="empresa"
              name="empresa"
              value={formState.empresa}
              onChange={handleChange}
              placeholder="Nome da sua empresa"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cargo" className="flex items-center">
              <Briefcase className="mr-2 h-4 w-4" /> Cargo
            </Label>
            <Input
              id="cargo"
              name="cargo"
              value={formState.cargo}
              onChange={handleChange}
              placeholder="Seu cargo ou função"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center">
              <Phone className="mr-2 h-4 w-4" /> Telefone
            </Label>
            <Input
              id="telefone"
              name="telefone"
              value={formState.telefone}
              onChange={handleChange}
              placeholder="Seu telefone de contato"
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-sm text-foreground/70">
            Último acesso: {new Date(user?.last_sign_in_at || '').toLocaleString('pt-BR')}
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">◌</span>
                Salvando...
              </>
            ) : 'Salvar alterações'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileForm;
