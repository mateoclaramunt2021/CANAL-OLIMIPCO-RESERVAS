import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Not set')

let supabase: any
if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'dummy_anon_key' || supabaseAnonKey.includes('dummy')) {
  console.warn('Using dummy Supabase keys. Please set real keys in .env.local')
  // Create a mock client for testing
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

console.log('Supabase Service Key:', supabaseServiceKey ? 'Set' : 'Not set')

let supabaseAdmin: any
if (!supabaseServiceKey || supabaseServiceKey.includes('dummy')) {
  console.warn('Using dummy service key. DB operations will fail.')
  supabaseAdmin = {
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
        in: () => ({
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
    })
  }
} else {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
}

export { supabase, supabaseAdmin }