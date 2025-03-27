
import React from 'react';
import ScriptList from '@/components/scripts/ScriptList';

const Scripts = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Gerenciamento de Scripts</h1>
      <p className="text-foreground/70 mb-8">
        Crie e organize seus scripts e respostas padrão.
      </p>
      
      <ScriptList />
    </div>
  );
};

export default Scripts;
