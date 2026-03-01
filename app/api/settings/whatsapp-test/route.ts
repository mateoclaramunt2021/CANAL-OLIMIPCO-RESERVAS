import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ─── POST: Probar conexión con WhatsApp Business API ────────────────────────
// Lee las credenciales de la tabla settings y hace una llamada de prueba

export async function POST(req: NextRequest) {
  try {
    // Leer credenciales de settings
    const { data } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TOKEN'])

    const settings: Record<string, string> = {}
    for (const row of data || []) {
      settings[row.key] = row.value
    }

    const phoneNumberId = settings.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID
    const token = settings.WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN

    if (!phoneNumberId || !token) {
      return NextResponse.json({
        ok: false,
        error: 'Faltan credenciales. Configura WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_TOKEN.',
      })
    }

    // Verificar contra la API de Meta — obtener info del número
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return NextResponse.json({
        ok: false,
        error: `Meta API error: ${errBody?.error?.message || res.statusText}`,
        code: errBody?.error?.code,
      })
    }

    const info = await res.json()

    return NextResponse.json({
      ok: true,
      phone: info.display_phone_number || info.verified_name || phoneNumberId,
      name: info.verified_name || null,
      quality: info.quality_rating || null,
    })
  } catch (err) {
    console.error('[whatsapp-test] Error:', err)
    return NextResponse.json({
      ok: false,
      error: 'Error de conexión con Meta API',
    }, { status: 500 })
  }
}
