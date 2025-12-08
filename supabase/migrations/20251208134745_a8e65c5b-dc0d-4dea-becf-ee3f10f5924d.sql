-- Fix PUBLIC_DATA_EXPOSURE: Restrict alerts table SELECT to owner only
-- Currently any authenticated user can view all alerts including sensitive email_recipients

DROP POLICY IF EXISTS "Users can view all alerts" ON alerts;

CREATE POLICY "Users can view their own alerts" ON alerts
  FOR SELECT 
  USING (auth.uid() = user_id);