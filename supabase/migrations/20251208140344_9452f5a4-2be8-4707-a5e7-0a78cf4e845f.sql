-- =====================================================
-- PHASE 1: Database Schema for Supervisor Enhancements
-- =====================================================

-- 1. Add classificacao column to chamados for exception handling
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS classificacao TEXT;

-- 2. Create scripts_library table (Knowledge Base)
CREATE TABLE IF NOT EXISTS public.scripts_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  sistema TEXT,
  versao TEXT,
  pre_condicoes TEXT,
  scripts_relacionados UUID[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on scripts_library
ALTER TABLE public.scripts_library ENABLE ROW LEVEL SECURITY;

-- Policies for scripts_library (accessible by all authenticated users)
CREATE POLICY "Authenticated users can view scripts_library" 
ON public.scripts_library FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create scripts_library entries" 
ON public.scripts_library FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own scripts_library entries" 
ON public.scripts_library FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own scripts_library entries" 
ON public.scripts_library FOR DELETE 
TO authenticated
USING (auth.uid() = created_by);

-- 3. Create ticket_followups table (audit trail for chamado closures)
CREATE TABLE IF NOT EXISTS public.ticket_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'comment', 'ultimo_acompanhamento', 'status_change'
  content TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ticket_followups
ALTER TABLE public.ticket_followups ENABLE ROW LEVEL SECURITY;

-- Policies for ticket_followups
CREATE POLICY "Users can view followups for their chamados" 
ON public.ticket_followups FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chamados c 
  WHERE c.id = ticket_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can create followups for their chamados" 
ON public.ticket_followups FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.chamados c 
    WHERE c.id = ticket_id AND c.user_id = auth.uid()
  )
);

-- 4. Create notifications_log table (sininho clicks)
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticket_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'viewed', 'clicked', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications_log
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications_log" 
ON public.notifications_log FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their notifications_log" 
ON public.notifications_log FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. Create dismissed_notifications table (to track "marked as seen")
CREATE TABLE IF NOT EXISTS public.dismissed_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticket_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, ticket_id)
);

-- Enable RLS on dismissed_notifications
ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dismissed_notifications" 
ON public.dismissed_notifications FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their dismissed_notifications" 
ON public.dismissed_notifications FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their dismissed_notifications" 
ON public.dismissed_notifications FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 6. Create kb_vectors table for similarity matching (TF-IDF fallback)
CREATE TABLE IF NOT EXISTS public.kb_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- 'script' or 'ticket'
  source_id UUID NOT NULL,
  title TEXT,
  content_preview TEXT,
  tokens JSONB DEFAULT '{}', -- TF-IDF tokens with weights
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on kb_vectors
ALTER TABLE public.kb_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kb_vectors" 
ON public.kb_vectors FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "System can manage kb_vectors" 
ON public.kb_vectors FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Create ticket_suggestions table (feedback loop)
CREATE TABLE IF NOT EXISTS public.ticket_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
  script_id UUID REFERENCES public.scripts_library(id) ON DELETE CASCADE,
  suggested_ticket_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE,
  score NUMERIC(5,4) NOT NULL,
  feedback TEXT, -- 'accepted', 'rejected', null
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  feedback_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on ticket_suggestions
ALTER TABLE public.ticket_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suggestions for their tickets" 
ON public.ticket_suggestions FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chamados c 
  WHERE c.id = ticket_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can update suggestions for their tickets" 
ON public.ticket_suggestions FOR UPDATE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chamados c 
  WHERE c.id = ticket_id AND c.user_id = auth.uid()
));

CREATE POLICY "System can create suggestions" 
ON public.ticket_suggestions FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 8. Create supervisor_health table for health check status
CREATE TABLE IF NOT EXISTS public.supervisor_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsystem TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ok', -- 'ok', 'degraded', 'down'
  last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on supervisor_health
ALTER TABLE public.supervisor_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supervisor_health" 
ON public.supervisor_health FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "System can manage supervisor_health" 
ON public.supervisor_health FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Create audit_log table for comprehensive auditing
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their audit_log entries" 
ON public.audit_log FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit_log entries" 
ON public.audit_log FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 10. Create full-text search index on scripts_library
CREATE INDEX IF NOT EXISTS idx_scripts_library_search 
ON public.scripts_library 
USING gin(to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));

-- 11. Create index on chamados for overdue queries
CREATE INDEX IF NOT EXISTS idx_chamados_overdue 
ON public.chamados (data_limite, status) 
WHERE data_limite IS NOT NULL AND status != 'resolvido';

-- 12. Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_scripts_library_updated_at
BEFORE UPDATE ON public.scripts_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_vectors_updated_at
BEFORE UPDATE ON public.kb_vectors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervisor_health_updated_at
BEFORE UPDATE ON public.supervisor_health
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Insert initial supervisor health subsystems
INSERT INTO public.supervisor_health (subsystem, status, details) VALUES
  ('log_ingestion', 'ok', '{"description": "Log ingestion pipeline"}'),
  ('storage', 'ok', '{"description": "Data storage layer"}'),
  ('query_engine', 'ok', '{"description": "Query processing engine"}'),
  ('alert_service', 'ok', '{"description": "Alert processing service"}'),
  ('realtime_streaming', 'ok', '{"description": "Realtime event streaming"}'),
  ('kb_indexer', 'ok', '{"description": "Knowledge base indexer"}')
ON CONFLICT (subsystem) DO NOTHING;

-- 14. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_health;