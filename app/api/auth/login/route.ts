import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVER-SIDE LOGIN — Works without JavaScript (HTML form POST)
   For tablet TPV browsers that can't run React/JS bundles
   ═══════════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  // Get the origin from the request for proper redirects
  const origin = req.nextUrl.origin

  try {
    // Parse form data (application/x-www-form-urlencoded from HTML form)
    const contentType = req.headers.get('content-type') || ''
    let email = ''
    let password = ''

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      email = (formData.get('email') as string || '').trim()
      password = (formData.get('password') as string || '').trim()
    } else {
      const body = await req.json()
      email = (body.email || '').trim()
      password = (body.password || '').trim()
    }

    if (!email || !password) {
      return redirectToLogin(origin, 'El correo y la contraseña son obligatorios', email)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return redirectToLogin(origin, 'Error de configuración del servidor', email)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error.message
      return redirectToLogin(origin, msg, email)
    }

    if (!data.session) {
      return redirectToLogin(origin, 'No se pudo crear la sesión', email)
    }

    // Success! Set session cookies and redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', origin), { status: 303 })

    const maxAge = data.session.expires_in || 3600
    const isSecure = origin.startsWith('https')

    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    // Non-httpOnly flag so client pages can detect logged-in state
    response.cookies.set('sb-logged-in', '1', {
      httpOnly: false,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    return response
  } catch (err: any) {
    console.error('[auth/login] Error:', err)
    const origin2 = req.nextUrl.origin
    return redirectToLogin(origin2, 'Error del servidor: ' + (err?.message || 'desconocido'), '')
  }
}

function redirectToLogin(origin: string, error: string, email: string) {
  const params = new URLSearchParams()
  params.set('error', error)
  if (email) params.set('email', email)
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin), { status: 303 })
}
