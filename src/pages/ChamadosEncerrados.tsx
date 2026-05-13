
import React from 'react';
import ChamadoList from '@/components/chamados/ChamadoList';
import { Archive } from 'lucide-react';

const ChamadosEncerrados = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-accent/40 to-background p-6 mb-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full mb-2">
              Histórico
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Chamados Encerrados</h1>
            <p className="text-foreground/70 mt-1">
              Visualize o histórico completo de chamados finalizados.
            </p>
          </div>
        </div>
      </div>

      <ChamadoList encerrados={true} />
    </div>
  );
};

export default ChamadosEncerrados;
