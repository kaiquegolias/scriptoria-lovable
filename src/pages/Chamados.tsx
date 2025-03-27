
import React from 'react';
import ChamadoList from '@/components/chamados/ChamadoList';

const Chamados = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Gerenciamento de Chamados</h1>
      <p className="text-foreground/70 mb-8">
        Acompanhe e atualize o status dos seus chamados.
      </p>
      
      <ChamadoList />
    </div>
  );
};

export default Chamados;
