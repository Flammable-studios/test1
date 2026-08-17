import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase integration for JobTag.
 *
 * When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, the app
 * uses Supabase for authentication (Supabase Auth) and data (the
 * `profiles` and `jobs` tables). Run `supabase/schema.sql` in your
 * Supabase project's SQL editor to create the schema.
 *
 * Required in the Keys tab:
 *   VITE_SUPABASE_URL       - your project URL (https://<ref>.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  - the public anon key (sb_publishable_...)
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once both Supabase env vars are configured. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  return client;
}