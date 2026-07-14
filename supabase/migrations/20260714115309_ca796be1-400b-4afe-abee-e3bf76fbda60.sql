CREATE TABLE public.cortana_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pergunta TEXT NOT NULL,
  resposta_preview TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC,
  mode TEXT DEFAULT 'online',
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cortana_queries TO authenticated;
GRANT ALL ON public.cortana_queries TO service_role;

ALTER TABLE public.cortana_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cortana queries"
ON public.cortana_queries FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cortana_queries_user_created ON public.cortana_queries(user_id, created_at DESC);