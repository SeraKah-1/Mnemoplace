// ─── Supabase Client Singleton ────────────────────────────────────────
// Configure via: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env

import { createClient, SupabaseClient, User, Session } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Returns true when both env vars are configured — used to conditionally
// render sync UI without crashing when keys are missing.
export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON;

// Lazy singleton — throws a readable error if keys are missing at call time.
let _client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error(
      "[Mnemoplace] Supabase not configured.\n" +
      "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.\n" +
      "Get them from: Supabase Dashboard → Project Settings → API"
    );
  }
  _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

// ── Auth helpers ─────────────────────────────────────────────────────

export type AuthUser = User;
export type AuthSession = Session;

export async function signInWithGoogle(): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signInWithGitHub(): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<AuthSession | null> {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<AuthUser | null> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
