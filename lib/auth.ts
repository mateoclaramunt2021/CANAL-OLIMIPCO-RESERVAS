import { NextRequest, NextResponse } from 'next/server'

// ─── Verificación de API Key para endpoints de Make/VAPI ─────────────────────
// Env var: MAKE_API_KEY (la misma que configuras en Make.com como header)
//
// Uso en Make.com:
//   Header: Authorization → Bearer TU_CLAVE_SECRETA

export function verifyApiKey(req: NextRequest): { valid: boolean; response?: NextResponse } {
  const apiKey = process.env.MAKE_API_KEY

  // Si no hay key configurada, dejar pasar (desarrollo)
  if (!apiKey) {
    return { valid: true }
  }

  const authHeader = req.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      response: NextResponse.json(
        { ok: false, error: 'Falta header Authorization: Bearer <API_KEY>' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.substring(7) // después de "Bearer "

  if (token !== apiKey) {
    return {
      valid: false,
      response: NextResponse.json(
        { ok: false, error: 'API key inválida' },
        { status: 401 }
      ),
    }
  }

  return { valid: true }
}
