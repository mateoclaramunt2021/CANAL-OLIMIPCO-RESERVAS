import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { whatsAppProvider } from '@/lib/providers'
import { z } from 'zod'

const schema = z.object({ reservation_id: z.string(), message: z.string() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reservation_id, message } = schema.parse(body)

    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('clients (phone)')
      .eq('id', reservation_id)
      .single()

    if (!reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })

    await whatsAppProvider.sendMessage(reservation.clients.phone, message)

    await supabaseAdmin
      .from('messages')
      .insert({
        reservation_id,
        channel: 'whatsapp',
        direction: 'outbound',
        content: message
      })

    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}