// Estrutura de dados dos produtos PEN com seus módulos, POs e Representantes Técnicos
// Baseado na planilha oficial de produtos PEN

export interface PenModule {
  value: string;
  label: string;
  po: string;
  poSubstituto: string;
  representanteTecnico: string;
}

export interface PenProduct {
  value: string;
  label: string;
  modules: PenModule[];
}

export const PEN_PRODUCTS: PenProduct[] = [
  {
    value: 'sei',
    label: 'SEI!',
    modules: [
      { value: 'super_sei', label: 'Super SEI', po: 'Pedro/Duane', poSubstituto: 'Carol', representanteTecnico: 'Cadu' },
      { value: 'mod_gestao_documental', label: 'Módulo Gestão Documental', po: 'Marco Braga', poSubstituto: 'Duane', representanteTecnico: '-' },
      { value: 'mod_resposta', label: 'Módulo de Resposta', po: 'Duane', poSubstituto: 'Carol', representanteTecnico: 'Higo' },
      { value: 'mod_estatistico', label: 'Módulo Estatístico', po: 'Vinícius', poSubstituto: 'Yuri', representanteTecnico: '-' },
      { value: 'mod_incom', label: 'Módulo INCom', po: 'Marco', poSubstituto: '-', representanteTecnico: 'Cadu' },
      { value: 'mod_assinatura', label: 'Módulo Assinatura Eletrônica', po: 'Vinícius', poSubstituto: 'Duane', representanteTecnico: 'Cadu' },
      { value: 'mod_acesso_govbr', label: 'Módulo Acesso GOV.BR', po: 'Carol', poSubstituto: 'Duane', representanteTecnico: 'Cadu' },
      { value: 'mod_wssei', label: 'Módulo WSSEI', po: 'Higo', poSubstituto: 'Cadu', representanteTecnico: 'Linhares' },
    ]
  },
  {
    value: 'tramita_gov',
    label: 'Tramita GOV.BR',
    modules: [
      { value: 'tramita_modulo', label: 'Módulo', po: 'Vinícius', poSubstituto: 'Yuri', representanteTecnico: 'Cadu' },
      { value: 'tramita_api', label: 'API', po: 'Vinícius', poSubstituto: 'Yuri', representanteTecnico: 'Allysson' },
      { value: 'tramita_portal', label: 'Portal', po: 'Vinícius', poSubstituto: 'Cristiana', representanteTecnico: 'Allysson' },
    ]
  },
  {
    value: 'protocolo_govbr',
    label: 'Protocolo GOV.BR',
    modules: [
      { value: 'protocolo_govbr_principal', label: 'Protocolo GOV.BR', po: 'Duane', poSubstituto: 'Carol', representanteTecnico: 'Cadu' },
    ]
  },
  {
    value: 'nup',
    label: 'NUP',
    modules: [
      { value: 'nup_principal', label: 'NUP', po: 'Marco Braga', poSubstituto: 'Duane', representanteTecnico: 'Allysson' },
      { value: 'nipe', label: 'NIPE', po: 'Marco Braga', poSubstituto: 'Duane', representanteTecnico: 'Allysson' },
    ]
  },
  {
    value: 'protocolo_integrado',
    label: 'Protocolo Integrado',
    modules: [
      { value: 'protocolo_integrado_modulo', label: 'Módulo', po: 'Duane', poSubstituto: 'Carol', representanteTecnico: 'Allysson' },
      { value: 'protocolo_integrado_api', label: 'API', po: 'Duane', poSubstituto: 'Carol', representanteTecnico: 'Allysson' },
      { value: 'protocolo_integrado_portal', label: 'Portal', po: 'Duane', poSubstituto: 'Carol', representanteTecnico: 'Allysson' },
    ]
  },
];

export const getProductByValue = (value: string): PenProduct | undefined => {
  return PEN_PRODUCTS.find(p => p.value === value);
};

export const getProductByLabel = (label: string): PenProduct | undefined => {
  return PEN_PRODUCTS.find(p => p.label === label);
};

export const getModuleByValue = (productValue: string, moduleValue: string): PenModule | undefined => {
  const product = getProductByValue(productValue);
  return product?.modules.find(m => m.value === moduleValue);
};

export const getModuleByLabel = (productValue: string, moduleLabel: string): PenModule | undefined => {
  const product = getProductByValue(productValue);
  return product?.modules.find(m => m.label === moduleLabel);
};

export const findProductAndModuleByLabels = (productLabel: string, moduleLabel: string): { product?: PenProduct, module?: PenModule } => {
  const product = getProductByLabel(productLabel);
  if (!product) return {};
  const module = product.modules.find(m => m.label === moduleLabel);
  return { product, module };
};
