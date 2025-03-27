
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from './integrations/supabase/client'

// Ensure Supabase is initialized
if (!supabase) {
  console.error('Supabase client could not be initialized. Check your environment variables.');
}

createRoot(document.getElementById("root")!).render(<App />);
