// Estrutura de dados dos produtos PEN com seus módulos e POs

export interface PenModule {
  value: string;
  label: string;
  po: string;
  poSubstituto: string;
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
      { value: 'mod_gestao_documental', label: 'Módulo Gestão Documental SEI', po: 'Marco Braga', poSubstituto: 'Duane' },
      { value: 'mod_resposta', label: 'Módulo de Resposta', po: 'Duane', poSubstituto: 'Carol' },
      { value: 'mod_estatistico', label: 'Módulo Estatístico', po: 'Vinícius', poSubstituto: 'Yuri' },
      { value: 'mod_incom', label: 'Módulo INCom', po: 'M', poSubstituto: 'Cadu' },
      { value: 'mod_assinatura', label: 'Módulo Assinatura Eletrônica', po: 'Vinícius', poSubstituto: 'Duane' },
      { value: 'mod_acesso_govbr', label: 'Módulo Acesso GOV.BR', po: 'Carol', poSubstituto: 'Duane' },
    ]
  },
  {
    value: 'tramita_gov',
    label: 'Tramita GOV',
    modules: [
      { value: 'integracao_tramita', label: 'Integração ao Tramita GOV', po: 'Duane', poSubstituto: 'Carol' },
    ]
  },
  {
    value: 'protocolo_govbr',
    label: 'protocolo.gov.br',
    modules: [
      { value: 'protocolo_modulo', label: 'Módulo', po: 'Duane', poSubstituto: 'Carol' },
      { value: 'protocolo_api', label: 'API', po: 'Duane', poSubstituto: 'Carol' },
      { value: 'protocolo_portal', label: 'Portal', po: 'Duane', poSubstituto: 'Carol' },
    ]
  },
  {
    value: 'nup',
    label: 'NUP',
    modules: [
      { value: 'nup_principal', label: 'NUP', po: 'Marco Braga', poSubstituto: 'Duane' },
      { value: 'nipe', label: 'NIPE', po: 'Duane', poSubstituto: 'Duane' },
    ]
  },
  {
    value: 'protocolo_integrado',
    label: 'Protocolo Integrado',
    modules: [
      { value: 'protocolo_integrado_modulo', label: 'Protocolo Integrado', po: 'Duane', poSubstituto: 'Carol' },
    ]
  },
  {
    value: 'wssei',
    label: 'Módulo REST WSSEI',
    modules: [
      { value: 'mod_wssei', label: 'Módulo WSSEI', po: 'Higo', poSubstituto: 'Cadu' },
    ]
  },
];

export const getProductByValue = (value: string): PenProduct | undefined => {
  return PEN_PRODUCTS.find(p => p.value === value);
};

export const getModuleByValue = (productValue: string, moduleValue: string): PenModule | undefined => {
  const product = getProductByValue(productValue);
  return product?.modules.find(m => m.value === moduleValue);
};
