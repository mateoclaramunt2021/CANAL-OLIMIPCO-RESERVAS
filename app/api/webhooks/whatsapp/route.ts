import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        for (const message of change.value.messages || []) {
          const phone = message.from
          const content = message.text?.body || ''

          // Buscar reserva por teléfono
          const { data: client } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('phone', phone)
            .single()

          if (client) {
            const { data: reservation } = await supabaseAdmin
              .from('reservations')
              .select('id')
              .eq('client_id', client.id)
              .in('status', ['pending_payment', 'confirmed', 'pending_final'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (reservation) {
              await supabaseAdmin
                .from('messages')
                .insert({
                  reservation_id: reservation.id,
                  channel: 'whatsapp',
                  direction: 'inbound',
                  content,
                  raw_payload: message
                })
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}