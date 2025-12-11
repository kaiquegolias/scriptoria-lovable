-- Create knowledge base documents table for WikiPEN content
CREATE TABLE public.kb_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'wiki_pen',
  category TEXT,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Users can view kb documents" 
ON public.kb_documents 
FOR SELECT 
TO authenticated
USING (true);

-- Create index for better search
CREATE INDEX idx_kb_documents_source ON public.kb_documents(source);
CREATE INDEX idx_kb_documents_category ON public.kb_documents(category);
CREATE INDEX idx_kb_documents_keywords ON public.kb_documents USING GIN(keywords);

-- Create AI analysis cache table for supervisor
CREATE TABLE public.ai_analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_type TEXT NOT NULL,
  metrics_snapshot JSONB NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Enable RLS
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read cache
CREATE POLICY "Users can view AI analysis cache" 
ON public.ai_analysis_cache 
FOR SELECT 
TO authenticated
USING (true);

-- System can insert/update cache
CREATE POLICY "System can manage cache" 
ON public.ai_analysis_cache 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add update trigger for kb_documents
CREATE TRIGGER update_kb_documents_updated_at
BEFORE UPDATE ON public.kb_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();