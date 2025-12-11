-- Table for persisting dismissed system alerts
CREATE TABLE IF NOT EXISTS public.dismissed_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- Unique constraint to prevent duplicates
ALTER TABLE public.dismissed_alerts ADD CONSTRAINT dismissed_alerts_user_alert_unique UNIQUE (user_id, alert_id);

-- RLS Policies
CREATE POLICY "Users can create their dismissed_alerts" ON public.dismissed_alerts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their dismissed_alerts" ON public.dismissed_alerts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their dismissed_alerts" ON public.dismissed_alerts
FOR DELETE USING (auth.uid() = user_id);