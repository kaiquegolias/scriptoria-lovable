
-- Add soft-delete columns to chamados
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS motivo_exclusao text;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS data_exclusao timestamp with time zone;

-- Create diary_entries table
CREATE TABLE public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  due_time text,
  completed boolean NOT NULL DEFAULT false,
  chamado_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own diary entries"
  ON public.diary_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diary entries"
  ON public.diary_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries"
  ON public.diary_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries"
  ON public.diary_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
