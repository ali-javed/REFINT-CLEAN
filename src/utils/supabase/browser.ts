import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getBrowserSupabaseClient() {
  if (cached) return cached;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing for client-side auth');
  }
  cached = createClient(supabaseUrl, supabaseAnonKey);
  return cached;
}
