-- Criar enum para severidade de logs
CREATE TYPE public.log_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Criar enum para tipo de evento
CREATE TYPE public.log_event_type AS ENUM (
  'chamado_created', 'chamado_updated', 'chamado_deleted', 'chamado_status_changed',
  'script_created', 'script_updated', 'script_deleted', 'script_executed',
  'user_login', 'user_logout', 'user_signup',
  'error', 'system', 'custom'
);

-- Tabela de logs do sistema
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  event_type public.log_event_type NOT NULL,
  severity public.log_severity NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'system',
  entity_type TEXT,
  entity_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT
);

-- Criar enum para status de alerta
CREATE TYPE public.alert_status AS ENUM ('active', 'paused', 'triggered');

-- Tabela de alertas configuráveis
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  condition_query TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  status public.alert_status NOT NULL DEFAULT 'active',
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_internal BOOLEAN NOT NULL DEFAULT true,
  email_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_message TEXT,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0
);

-- Tabela de histórico de alertas disparados
CREATE TABLE public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  matched_logs_count INTEGER NOT NULL DEFAULT 0,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_error TEXT,
  sample_logs JSONB DEFAULT '[]'::jsonb
);

-- Tabela de consultas salvas
CREATE TABLE public.saved_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_logs (todos usuários autenticados podem ver)
CREATE POLICY "Authenticated users can view all logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Políticas RLS para alerts
CREATE POLICY "Users can view all alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.alerts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Políticas RLS para alert_history
CREATE POLICY "Users can view all alert history"
ON public.alert_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert alert history"
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Políticas RLS para saved_queries
CREATE POLICY "Users can view their own queries"
ON public.saved_queries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own queries"
ON public.saved_queries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queries"
ON public.saved_queries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queries"
ON public.saved_queries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_system_logs_timestamp ON public.system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX idx_system_logs_entity ON public.system_logs(entity_type, entity_id);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alert_history_alert_id ON public.alert_history(alert_id);
CREATE INDEX idx_alert_history_triggered_at ON public.alert_history(triggered_at DESC);

-- Habilitar realtime para system_logs
ALTER TABLE public.system_logs REPLICA IDENTITY FULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_queries_updated_at
BEFORE UPDATE ON public.saved_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();