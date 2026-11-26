export const SCRIPT_PRODUCTS = [
  'SEI',
  'Tramita.GOV',
  'Protocolo Integrado',
  'Protocolo.GOV',
  'Módulo de Estatística',
  'Módulo de Assinatura Eletrônica',
  'NUP',
  'Módulo Gestão Documental',
] as const;

export type ScriptProduct = typeof SCRIPT_PRODUCTS[number];

export const PNCP_SCRIPT_PRODUCTS = [
  'PNCP - Contratações',
  'PNCP - Atas de Registro de Preço',
  'PNCP - Contratos',
  'PNCP - Plano de Contratações Anual',
  'PNCP - Integração / API',
  'PNCP - Acesso e Cadastro',
] as const;

export const productsForDomain = (estruturante?: string): readonly string[] =>
  estruturante === 'PNCP' ? PNCP_SCRIPT_PRODUCTS : SCRIPT_PRODUCTS;
