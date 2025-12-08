-- Fix 1: Restrict system_logs INSERT to prevent user impersonation
-- Users can only insert logs for themselves or system logs (user_id = NULL)
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON system_logs;

CREATE POLICY "Users can insert their own logs" ON system_logs
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Fix 2: Set fixed search_path for update_updated_at_column function
-- This prevents search_path manipulation attacks
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;