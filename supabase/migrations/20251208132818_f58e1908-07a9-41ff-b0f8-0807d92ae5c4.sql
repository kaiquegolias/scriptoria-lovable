-- Fix PUBLIC_DATA_EXPOSURE: Restrict system_logs SELECT to user's own logs
DROP POLICY IF EXISTS "Authenticated users can view all logs" ON system_logs;

CREATE POLICY "Users can view their own logs" ON system_logs
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);