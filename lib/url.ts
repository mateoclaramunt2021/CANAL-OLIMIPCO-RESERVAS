import { NextRequest } from 'next/server'

/**
 * Get the correct base URL from the request, using the host header
 * to avoid Netlify deploy-preview URLs in redirects.
 */
export function getBaseUrl(req: NextRequest): string {
  // Prefer x-forwarded-host (set by proxies/CDN), then host header
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const proto = req.headers.get('x-forwarded-proto') || 'https'

  if (host) {
    return `${proto}://${host}`
  }

  // Fallback to env var if set
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }

  // Last resort: use req.url origin (may be Netlify deploy URL)
  const url = new URL(req.url)
  return url.origin
}

/**
 * Build a redirect URL using the correct host.
 */
export function buildUrl(path: string, req: NextRequest): URL {
  return new URL(path, getBaseUrl(req))
}
