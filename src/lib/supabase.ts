import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'comercialmayoristas@ushuaiajeans.com.co';

function buildClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    return null;
  }
}

// Retorna null si faltan las variables de entorno (para que la UI muestre un
// aviso de configuración en vez de romper). Los componentes solo se montan
// cuando la página verificó que el cliente existe.
export const supabase = buildClient() as SupabaseClient;