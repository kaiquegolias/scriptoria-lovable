ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS numero_chamado text,
  ADD COLUMN IF NOT EXISTS usuario_nome text,
  ADD COLUMN IF NOT EXISTS usuario_email text,
  ADD COLUMN IF NOT EXISTS usuario_telefone text,
  ADD COLUMN IF NOT EXISTS usuario_cpf text,
  ADD COLUMN IF NOT EXISTS data_abertura_portal timestamptz,
  ADD COLUMN IF NOT EXISTS prioridade text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS orgao text,
  ADD COLUMN IF NOT EXISTS tem_anexo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS descricao_completa text,
  ADD COLUMN IF NOT EXISTS sla_atendimento text,
  ADD COLUMN IF NOT EXISTS sla_solucao text,
  ADD COLUMN IF NOT EXISTS previsao_solucao timestamptz,
  ADD COLUMN IF NOT EXISTS time_atendimento text,
  ADD COLUMN IF NOT EXISTS tipo_chamado text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS campos_personalizados jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chamados_numero_chamado ON public.chamados(numero_chamado);