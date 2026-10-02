/**
 * Supabase Client — Server-side and Client-side initialization
 * Uses service-role key on the server for full access.
 * Uses anon key on the client for RLS-protected access.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Server-side client (service role — bypasses RLS) ──

let serverClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set DEMO_STATIC=1 to use JSON fallback, or configure Supabase credentials.'
    );
  }

  serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return serverClient;
}

// ── Client-side client (anon key — RLS enforced) ──

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}

// ── Demo mode check ──

export function isDemoStatic(): boolean {
  if (process.env.DEMO_STATIC === '1') return true;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return true;
  }
  return false;
}
