import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Variables de entorno ────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// ─── Validación (solo loguear, nunca crashear) ───────────────────────────────
if (typeof window === 'undefined') {
  // Server-side checks
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[supabase] ⚠️  NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no configuradas')
  }
  if (!supabaseServiceKey) {
    console.error('[supabase] ⚠️  SUPABASE_SERVICE_ROLE_KEY no configurada (necesaria para APIs server-side)')
  }
}

// ─── Cliente público (browser / auth) ────────────────────────────────────────
// Solo crear si las claves públicas están disponibles
let _supabase: SupabaseClient | null = null
export const supabase: SupabaseClient = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Devolver un proxy que no crashea en el browser si faltan env vars
    if (typeof window !== 'undefined') {
      console.error('[supabase] ⚠️  Variables de Supabase no configuradas. Login y Dashboard no funcionarán.')
    }
    // Crear con placeholders — fallarán las peticiones pero no crasheará la app
    return createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return _supabase
})()

// ─── Cliente admin (server-side only, bypasses RLS) ──────────────────────────
// NUNCA se crea en el browser — supabaseServiceKey no tiene NEXT_PUBLIC_ prefix
let _supabaseAdmin: SupabaseClient | null = null

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Lazy init: solo crear el cliente admin la primera vez que se usa (server-side)
    if (!_supabaseAdmin) {
      if (typeof window !== 'undefined') {
        throw new Error('[supabase] supabaseAdmin no debe usarse en el browser')
      }
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('[supabase] SUPABASE_SERVICE_ROLE_KEY no configurada')
      }
      _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    }
    return (_supabaseAdmin as any)[prop]
  },
})

// ─── Helper: crear cliente Realtime para el browser ──────────────────────────
export function createRealtimeClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[supabase] No se puede crear cliente Realtime sin variables de entorno')
    return supabase // fallback al cliente placeholder
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
}