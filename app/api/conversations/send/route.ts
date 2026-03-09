import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendText } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const phone = (form.get('phone') as string)?.trim()
    const message = (form.get('message') as string)?.trim()

    if (!phone || !message) {
      return NextResponse.redirect(new URL(`/dashboard/whatsapp?phone=${phone || ''}&error=Mensaje+vacío`, req.url))
    }

    // Send via WhatsApp API
    await sendText(phone, message)

    // Find a reservation for this phone to record the message
    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('customer_phone', phone)
      .limit(1)

    if (reservations && reservations.length > 0) {
      await supabaseAdmin.from('messages').insert({
        reservation_id: reservations[0].id,
        direction: 'outbound',
        body: message,
      })
    }

    return NextResponse.redirect(new URL(`/dashboard/whatsapp?phone=${encodeURIComponent(phone)}&ok=enviado`, req.url))
  } catch (err: any) {
    console.error('[API conversations send]', err)
    const phone = ''
    try {
      const form = await req.formData()
      return NextResponse.redirect(new URL(`/dashboard/whatsapp?phone=${form.get('phone') || ''}&error=${encodeURIComponent(err.message)}`, req.url))
    } catch {
      return NextResponse.redirect(new URL(`/dashboard/whatsapp?error=${encodeURIComponent(err.message)}`, req.url))
    }
  }
}
