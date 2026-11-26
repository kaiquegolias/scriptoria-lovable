import React, { createContext, useContext } from 'react';

export type CortanaDomain = 'PEN' | 'PNCP';

export const DOMAIN_META: Record<CortanaDomain, { name: string; short: string; tagline: string }> = {
  PEN: { name: 'Cortana PEN', short: 'Cortana', tagline: 'Especialista no Processo Eletrônico Nacional' },
  PNCP: { name: 'Agente de apoio ao PNCP (adaPNCP)', short: 'adaPNCP', tagline: 'Especialista no Portal Nacional de Contratações Públicas' },
};

const Ctx = createContext<CortanaDomain>('PEN');

export const CortanaDomainProvider: React.FC<{ domain: CortanaDomain; children: React.ReactNode }> = ({ domain, children }) => (
  <Ctx.Provider value={domain}>{children}</Ctx.Provider>
);

export const useCortanaDomain = () => useContext(Ctx);
