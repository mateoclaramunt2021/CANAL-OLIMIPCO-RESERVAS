import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendText } from '@/lib/whatsapp'

// ─── GET: Get messages for a specific phone number ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone')
    if (!phone) {
      return NextResponse.json({ error: 'Se requiere ?phone=' }, { status: 400 })
    }

    // Find reservations for this phone
    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('customer_phone', phone)

    const resIds = (reservations || []).map(r => r.id)
    if (resIds.length === 0) {
      return NextResponse.json({ ok: true, messages: [] })
    }

    // Get all messages for these reservations
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, reservation_id, direction, body, created_at')
      .in('reservation_id', resIds)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, messages: messages || [] })
  } catch (err) {
    console.error('[messages API] GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST: Send a manual message to a phone number ──────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json()
    if (!phone || !message) {
      return NextResponse.json({ error: 'Se requiere phone y message' }, { status: 400 })
    }

    // Send via WhatsApp
    const result = await sendText(phone, message)

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Error enviando WhatsApp' }, { status: 500 })
    }

    // Save to messages table
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (reservation) {
      await supabaseAdmin.from('messages').insert({
        reservation_id: reservation.id,
        direction: 'outbound',
        body: message,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[messages API] POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
