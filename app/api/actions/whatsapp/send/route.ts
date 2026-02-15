import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendText } from '@/lib/whatsapp'
import { z } from 'zod'

const schema = z.object({
  to: z.string().optional(),
  reservation_id: z.string().optional(),
  message: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, reservation_id, message } = schema.parse(body)

    let phone = to

    // Si no viene 'to' pero sí reservation_id, buscar el teléfono
    if (!phone && reservation_id) {
      const { data: reservation } = await supabaseAdmin
        .from('reservations')
        .select('customer_phone')
        .eq('id', reservation_id)
        .single()

      if (!reservation?.customer_phone) {
        return NextResponse.json({ error: 'Reserva no encontrada o sin teléfono' }, { status: 404 })
      }
      phone = reservation.customer_phone
    }

    if (!phone) {
      return NextResponse.json({ error: 'Se requiere "to" o "reservation_id"' }, { status: 400 })
    }

    await sendText(phone, message)

    if (reservation_id) {
      await supabaseAdmin
        .from('messages')
        .insert({
          reservation_id,
          direction: 'outbound',
          body: message,
        })
    }

    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error('[whatsapp/send]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}