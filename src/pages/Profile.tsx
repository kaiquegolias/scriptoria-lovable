
import React from 'react';
import ProfileForm from '@/components/profile/ProfileForm';

const Profile = () => {
  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">Meu Perfil</h1>
      <p className="text-foreground/70 mb-8">
        Gerencie suas informações pessoais
      </p>
      
      <ProfileForm />
    </div>
  );
};

export default Profile;
