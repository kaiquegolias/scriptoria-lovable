
import { createClient } from '@supabase/supabase-js';

// Definir as variáveis de ambiente do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iydttpxppmjdtcrohlfj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZHR0cHhwcG1qZHRjcm9obGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODk4MzYsImV4cCI6MjA1ODY2NTgzNn0.D8FFyI8eXETfD4wPZESeIgPxHWMLgs_bRyBIsVVMXWg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'scriptflow-auth-token',
  }
});

export default supabase;
