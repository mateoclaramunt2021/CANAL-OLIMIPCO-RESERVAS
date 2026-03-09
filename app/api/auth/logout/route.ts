import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVER-SIDE LOGOUT — Clears auth cookies, redirects to /login
   ═══════════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin
  const response = NextResponse.redirect(new URL('/login', origin), { status: 303 })

  // Clear all auth cookies
  response.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 })
  response.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 })
  response.cookies.set('sb-logged-in', '', { path: '/', maxAge: 0 })

  return response
}

// Also support GET for simple link-based logout
export async function GET(req: NextRequest) {
  return POST(req)
}
