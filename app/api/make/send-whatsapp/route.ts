import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// ─── POST: Enviar WhatsApp por teléfono (para Make/VAPI) ────────────────────
// Make solo tiene el teléfono del cliente, no el reservation_id.
//
// Request:
//   POST /api/make/send-whatsapp
//   Header: Authorization: Bearer <MAKE_API_KEY>
//   Body: { "telefono": "+34...", "mensaje": "Hola, tu reserva..." }
//
// Response:
//   { "ok": true, "message": "Mensaje enviado" }

export async function POST(req: NextRequest) {
  // Verificar API key
  const auth = verifyApiKey(req)
  if (!auth.valid) return auth.response!

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const { telefono, mensaje } = body as {
    telefono?: string
    mensaje?: string
  }

  if (!telefono || typeof telefono !== 'string' || telefono.trim() === '') {
    return NextResponse.json({ ok: false, error: 'telefono es obligatorio' }, { status: 400 })
  }

  if (!mensaje || typeof mensaje !== 'string' || mensaje.trim() === '') {
    return NextResponse.json({ ok: false, error: 'mensaje es obligatorio' }, { status: 400 })
  }

  try {
    // Enviar por WhatsApp Business API (Meta)
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const token = process.env.WHATSAPP_TOKEN

    if (!phoneNumberId || !token) {
      console.error('[make/send-whatsapp] WhatsApp credentials not configured')
      return NextResponse.json({ ok: false, error: 'WhatsApp no configurado en el servidor' }, { status: 500 })
    }

    const waResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefono.trim(),
          type: 'text',
          text: { body: mensaje.trim() },
        }),
      }
    )

    if (!waResponse.ok) {
      const errBody = await waResponse.text()
      console.error('[make/send-whatsapp] WhatsApp API error:', errBody)
      return NextResponse.json({ ok: false, error: 'Error al enviar WhatsApp' }, { status: 502 })
    }

    // Guardar mensaje en historial (opcional — buscar reserva por teléfono)
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('customer_phone', telefono.trim())
      .in('status', ['HOLD_BLOCKED', 'CONFIRMED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (reservation) {
      await supabaseAdmin.from('messages').insert({
        reservation_id: reservation.id,
        channel: 'whatsapp',
        direction: 'outbound',
        content: mensaje.trim(),
      })
    }

    return NextResponse.json({
      ok: true,
      message: 'Mensaje enviado',
      reservation_id: reservation?.id ?? null,
    })
  } catch (err) {
    console.error('[make/send-whatsapp] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
