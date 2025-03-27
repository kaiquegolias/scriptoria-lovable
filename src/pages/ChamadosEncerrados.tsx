
import React from 'react';
import ChamadoList from '@/components/chamados/ChamadoList';

const ChamadosEncerrados = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Chamados Encerrados</h1>
      <p className="text-foreground/70 mb-8">
        Visualize o histórico de chamados finalizados.
      </p>
      
      <ChamadoList encerrados={true} />
    </div>
  );
};

export default ChamadosEncerrados;
