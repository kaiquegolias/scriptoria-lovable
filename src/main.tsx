
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from './integrations/supabase/client'
import { AuthProvider } from './context/AuthContext'

// Ensure Supabase is initialized
if (!supabase) {
  console.error('Supabase client could not be initialized. Check your environment variables.');
}

// Log the environment variables (development only)
if (import.meta.env.DEV) {
  console.log('Supabase URL available:', !!import.meta.env.VITE_SUPABASE_URL);
  console.log('Supabase Anon Key available:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
