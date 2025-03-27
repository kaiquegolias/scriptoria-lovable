
import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente devem ser configuradas no .env com os dados do seu projeto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
