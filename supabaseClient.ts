import { createClient } from '@supabase/supabase-js';

// Prioriza variáveis de ambiente, usa valores hardcoded como fallback para o ambiente de preview
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ LogiFlow: Supabase Keys are missing. The app will fail to fetch data.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);