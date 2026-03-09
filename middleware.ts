import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Security Middleware
   Rate-limiting · CORS · Headers · Brute-force protection
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── In-memory rate limiter (per edge instance) ──────────────────────────────
const hits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000          // 1 minute window
const MAX_GENERAL = 60            // 60 req/min for public APIs
const MAX_RESERVATIONS = 10       // 10 reservation attempts / min
const MAX_LOGIN = 5               // 5 login attempts / min

function rateLimit(ip: string, bucket: string, max: number): boolean {
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  entry.count++
  if (entry.count > max) return false
  return true
}

// Periodically clean up stale entries (every ~5 min)
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 300_000) return
  lastCleanup = now
  for (const [key, entry] of hits) {
    if (now > entry.resetAt + 60_000) hits.delete(key)
  }
}

// ─── CORS allowed origin ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://reservascanalolimpico.netlify.app',
  'https://canalolimpicorestaurante.com',
  'https://www.canalolimpicorestaurante.com',
  'https://canal-olimpico.vercel.app',
  'http://localhost:3000',
]

// ─── Security headers ────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // CSP removed — was blocking CSS/JS/fonts on tablet TPV browsers.
  // Security is enforced via auth guards, API keys, and rate limiting instead.
}

// ─── Webhook paths (skip rate-limit, validated by their own signatures) ──────
const WEBHOOK_PATHS = [
  '/api/webhooks/stripe',
  '/api/webhooks/whatsapp',
  '/api/webhooks/bapi',
  '/api/vapi/webhook',
]

// ─── Paths that need dashboard auth check ────────────────────────────────────
const PROTECTED_PATHS = ['/dashboard', '/calendar', '/menus', '/payments', '/reservations', '/settings', '/tables', '/employees', '/schedules']

export function middleware(req: NextRequest) {
  cleanup()

  const { pathname } = req.nextUrl
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '0.0.0.0'
  const origin = req.headers.get('origin') || ''

  // ── Preflight CORS ──
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
      res.headers.set('Access-Control-Max-Age', '86400')
    }
    return res
  }

  // ══ Rate-limiting for API routes ══
  if (pathname.startsWith('/api/')) {
    // Skip webhooks (they validate via signatures)
    const isWebhook = WEBHOOK_PATHS.some(p => pathname.startsWith(p))

    if (!isWebhook) {
      // Specific limits
      if (pathname.startsWith('/api/reservations') && req.method === 'POST') {
        if (!rateLimit(ip, 'reservations', MAX_RESERVATIONS)) {
          return NextResponse.json(
            { ok: false, error: 'Demasiadas solicitudes. Espera un minuto.' },
            { status: 429 }
          )
        }
      } else if (pathname === '/api/availability' && req.method === 'POST') {
        if (!rateLimit(ip, 'availability', 30)) {
          return NextResponse.json(
            { ok: false, error: 'Demasiadas consultas. Espera un minuto.' },
            { status: 429 }
          )
        }
      } else {
        if (!rateLimit(ip, 'general', MAX_GENERAL)) {
          return NextResponse.json(
            { ok: false, error: 'Demasiadas solicitudes.' },
            { status: 429 }
          )
        }
      }
    }
  }

  // ══ Login brute-force protection ══
  if (pathname === '/login' && req.method === 'POST') {
    if (!rateLimit(ip, 'login', MAX_LOGIN)) {
      return NextResponse.json(
        { ok: false, error: 'Demasiados intentos de login. Espera un minuto.' },
        { status: 429 }
      )
    }
  }

  // ══ Protected dashboard paths — require sb-access-token cookie ══
  if (PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    const hasAuth = req.cookies.has('sb-access-token')
    if (!hasAuth) {
      const loginUrl = new URL('/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ══ Build response with security headers ══
  const res = NextResponse.next()

  // Security headers on ALL responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }

  // CORS for API routes
  if (pathname.startsWith('/api/') && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // Rate limit info headers
  res.headers.set('X-RateLimit-Policy', 'canal-olimpico-v1')

  return res
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|webp|ico|css|js|html|xml|json|txt)$).*)',
  ],
}
