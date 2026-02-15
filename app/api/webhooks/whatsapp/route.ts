import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleIncomingMessage } from '@/lib/conversation'

// ─── GET: Verificación del webhook de Meta ──────────────────────────────────
// Meta envía un GET para verificar que eres el dueño del webhook.
// Tú configuras WHATSAPP_VERIFY_TOKEN con un valor secreto.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[whatsapp-webhook] Verification OK')
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST: Recibir mensajes de WhatsApp ─────────────────────────────────────
// Meta envía cada mensaje del cliente aquí.
// Procesamos con el motor de conversación y respondemos automáticamente.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Responder 200 inmediatamente (Meta requiere respuesta rápida)
    // Procesamos en background

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue

        const value = change.value || {}

        // Ignorar notificaciones de estado (delivered, read, etc.)
        if (!value.messages) continue

        for (const message of value.messages) {
          const phone = message.from
          let content = ''

          // Extraer contenido según tipo de mensaje
          if (message.type === 'text') {
            content = message.text?.body || ''
          } else if (message.type === 'interactive') {
            // Respuesta a botones o listas
            if (message.interactive?.button_reply) {
              content = message.interactive.button_reply.id
            } else if (message.interactive?.list_reply) {
              content = message.interactive.list_reply.id
            }
          } else {
            // Audio, imagen, etc. → no soportado por el bot
            content = '[archivo no soportado]'
          }

          if (!content || !phone) continue

          // Guardar mensaje inbound en historial
          try {
            const { data: reservation } = await supabaseAdmin
              .from('reservations')
              .select('id')
              .eq('customer_phone', phone)
              .in('status', ['HOLD_BLOCKED', 'CONFIRMED'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (reservation) {
              await supabaseAdmin.from('messages').insert({
                reservation_id: reservation.id,
                channel: 'whatsapp',
                direction: 'inbound',
                content,
              })
            }
          } catch {
            // No pasa nada si no se guarda el historial
          }

          // Procesar con el motor de conversación
          try {
            await handleIncomingMessage(phone, content)
          } catch (err) {
            console.error(`[whatsapp-webhook] Error processing message from ${phone}:`, err)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[whatsapp-webhook] Error parsing body:', err)
    return NextResponse.json({ status: 'ok' }) // Siempre 200 para Meta
  }
}