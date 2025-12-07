import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient<Database> | null = null;

/**
 * Get a typed Supabase client for browser-side operations
 */
export function getBrowserSupabaseClient() {
  if (cached) return cached;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing for client-side auth');
  }
  cached = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return cached;
}
