import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Variables de entorno ────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ─── Validación ──────────────────────────────────────────────────────────────
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] ⚠️  NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no configuradas')
}
if (!supabaseServiceKey) {
  console.error('[supabase] ⚠️  SUPABASE_SERVICE_ROLE_KEY no configurada')
}

// ─── Cliente público (browser / auth) ────────────────────────────────────────
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// ─── Cliente admin (server-side, bypasses RLS) ───────────────────────────────
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Helper: crear cliente Realtime para el browser ──────────────────────────
export function createRealtimeClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
}