/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Security Utilities
   CSRF tokens · Input sanitization · Honeypot validation · Timebomb
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Input Sanitization ──────────────────────────────────────────────────────
// Strip HTML tags, script injections, and control characters

const HTML_TAG_RE = /<\/?[^>]+(>|$)/g
const SCRIPT_RE = /(javascript|on\w+)\s*[:=]/gi
const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/** Sanitize a single string value — strips HTML, scripts, control chars */
export function sanitize(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(HTML_TAG_RE, '')
    .replace(SCRIPT_RE, '')
    .replace(CONTROL_RE, '')
    .trim()
    .slice(0, 1000) // hard length limit
}

/** Sanitize all string values in a flat object */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj }
  for (const key of Object.keys(cleaned)) {
    const val = cleaned[key]
    if (typeof val === 'string') {
      (cleaned as Record<string, unknown>)[key] = sanitize(val)
    }
  }
  return cleaned
}

// ─── Phone Validation ────────────────────────────────────────────────────────
// Only allow digits, spaces, +, -, ()

const PHONE_RE = /^[+\d\s()-]{6,20}$/

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone)
}

// ─── Honeypot Check ──────────────────────────────────────────────────────────
// The form includes a hidden "website" field. Bots fill it; humans don't.

export function isBot(honeypotValue: unknown): boolean {
  return typeof honeypotValue === 'string' && honeypotValue.length > 0
}

// ─── Timebomb / Speed Check ──────────────────────────────────────────────────
// The form stores a timestamp when it loads. If submitted in < 2 seconds, it's a bot.

const MIN_SUBMIT_MS = 2000

export function isTooFast(formLoadedAt: unknown): boolean {
  if (typeof formLoadedAt !== 'number') return true
  return Date.now() - formLoadedAt < MIN_SUBMIT_MS
}

// ─── CSRF Token Generation ───────────────────────────────────────────────────
// Simple HMAC-based token tied to a session/IP. For edge runtime compatibility,
// we use a simplified approach since Web Crypto is available.

const CSRF_SECRET = process.env.CSRF_SECRET || 'canal-olimpico-csrf-2026-default'

export async function generateCsrfToken(sessionId: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${sessionId}:${CSRF_SECRET}:${Math.floor(Date.now() / 3600000)}`)

  // Use SubtleCrypto (available in Edge Runtime)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyCsrfToken(token: string, sessionId: string): Promise<boolean> {
  // Check current hour and previous hour (handles boundary)
  const current = await generateCsrfToken(sessionId)
  if (token === current) return true

  // Check previous hour
  const encoder = new TextEncoder()
  const data = encoder.encode(`${sessionId}:${CSRF_SECRET}:${Math.floor(Date.now() / 3600000) - 1}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const previous = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return token === previous
}

// ─── Validate Reservation Input (comprehensive) ─────────────────────────────

export interface ReservationInput {
  nombre: string
  telefono: string
  fecha: string
  hora: string
  personas: number
  event_type: string
  zona?: 'fuera' | 'dentro'
  menu_code?: string
  extras_horarios?: string[]
  // Anti-bot fields
  _hp?: string      // honeypot
  _ts?: number      // timestamp
}

export function validateReservationInput(input: ReservationInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Anti-bot checks
  if (isBot(input._hp)) {
    errors.push('Solicitud rechazada')
    return { valid: false, errors }
  }

  if (isTooFast(input._ts)) {
    errors.push('Formulario enviado demasiado rápido. Intenta de nuevo.')
    return { valid: false, errors }
  }

  // Required fields
  if (!input.nombre || sanitize(input.nombre).length < 2) {
    errors.push('El nombre es obligatorio (mínimo 2 caracteres)')
  }

  if (!input.telefono || !isValidPhone(input.telefono)) {
    errors.push('Teléfono inválido')
  }

  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    errors.push('Fecha inválida (formato YYYY-MM-DD)')
  }

  if (!input.hora || !/^\d{2}:\d{2}$/.test(input.hora)) {
    errors.push('Hora inválida (formato HH:MM)')
  }

  if (!input.personas || !Number.isInteger(input.personas) || input.personas < 1 || input.personas > 200) {
    errors.push('Número de personas inválido (1-200)')
  }

  const validTypes = ['RESERVA_NORMAL', 'INFANTIL_CUMPLE', 'GRUPO_SENTADO', 'GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA']
  if (!input.event_type || !validTypes.includes(input.event_type)) {
    errors.push('Tipo de evento inválido')
  }

  return { valid: errors.length === 0, errors }
}
