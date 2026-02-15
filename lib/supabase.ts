import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY



let supabase: any
if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'dummy_anon_key' || supabaseAnonKey.includes('dummy')) {
  // Create a mock client for development
  supabase = {
    auth: {
      signInWithPassword: ({ email }: { email: string }) => Promise.resolve({
        data: { user: { id: 'demo-user', email, role: 'admin' }, session: { access_token: 'demo-token' } },
        error: null
      }),
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: { id: 'demo-user', email: 'admin@canalolimpico.com' } }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          })
        }),
        gte: () => ({
          lt: () => Promise.resolve({ data: [], error: null })
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'dummy' }, error: null })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'dummy' }, error: null })
          })
        })
      })
    })
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY



let supabaseAdmin: any
if (!supabaseServiceKey || supabaseServiceKey.includes('dummy')) {
  
  // Mock recursivo que soporta cualquier cadena de llamadas de Supabase
  const mockChain = (): any => {
    const chain: any = {
      eq: () => mockChain(),
      neq: () => mockChain(),
      in: () => mockChain(),
      gte: () => mockChain(),
      lt: () => mockChain(),
      order: () => mockChain(),
      limit: () => mockChain(),
      single: () => Promise.resolve({ data: null, error: null }),
      select: () => mockChain(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    }
    // Hacer que sea thenable (para await directo)
    chain[Symbol.toStringTag] = 'Promise'
    return chain
  }

  supabaseAdmin = {
    from: () => ({
      select: () => mockChain(),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-' + Date.now() }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }
} else {
  supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!)
}

export { supabase, supabaseAdmin }