import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(value?: string) {
  if (!value) return '';
  return value.replace(/\/rest\/v1\/?$/, '').trim();
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan las variables secretas de Supabase en .env.local');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});