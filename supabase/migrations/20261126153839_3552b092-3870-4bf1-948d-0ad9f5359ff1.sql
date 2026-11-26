ALTER TABLE public.kb_documents ADD COLUMN IF NOT EXISTS dominio text NOT NULL DEFAULT 'PEN';
ALTER TABLE public.cortana_queries ADD COLUMN IF NOT EXISTS dominio text NOT NULL DEFAULT 'PEN';
CREATE INDEX IF NOT EXISTS idx_kb_documents_dominio ON public.kb_documents(dominio);