import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(value?: string) {
  if (!value) return '';
  return value.replace(/\/rest\/v1\/?$/, '').trim();
}

function getSupabaseUrl() {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);