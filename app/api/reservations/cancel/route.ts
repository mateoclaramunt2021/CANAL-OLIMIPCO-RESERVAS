import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCancellationConfirmation } from '@/lib/email'

// ─── GET: Buscar reserva por número para verificar ──────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ref = searchParams.get('ref')
  const phone = searchParams.get('phone')

  if (!ref) {
    return NextResponse.json({ ok: false, error: 'Número de reserva requerido' }, { status: 400 })
  }

  try {
    // Buscar por reservation_number
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('id, reservation_number, customer_name, customer_phone, customer_email, fecha, hora_inicio, personas, event_type, status')
      .eq('reservation_number', ref.toUpperCase())
      .single()

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Reserva no encontrada. Verifica el número.' }, { status: 404 })
    }

    // Si se proporcionó teléfono, verificar que coincide
    if (phone) {
      const cleanPhone = phone.replace(/\s/g, '').replace(/^\+34/, '')
      const dbPhone = (data.customer_phone || '').replace(/\s/g, '').replace(/^\+34/, '')
      if (cleanPhone !== dbPhone) {
        return NextResponse.json({ ok: false, error: 'El teléfono no coincide con la reserva.' }, { status: 403 })
      }
    }

    // Devolver datos parciales (sin exponer todo)
    return NextResponse.json({
      ok: true,
      reservation: {
        reservation_number: data.reservation_number,
        customer_name: data.customer_name,
        fecha: data.fecha,
        hora: data.hora_inicio,
        personas: data.personas,
        event_type: data.event_type,
        status: data.status,
      }
    })
  } catch (err) {
    console.error('[cancel GET] Error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST: Cancelar reserva ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { ref, phone } = body as { ref?: string; phone?: string }

  if (!ref || !phone) {
    return NextResponse.json({ ok: false, error: 'Número de reserva y teléfono son obligatorios' }, { status: 400 })
  }

  try {
    // Buscar reserva
    const { data: reservation, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('reservation_number', ref.toUpperCase())
      .single()

    if (fetchErr || !reservation) {
      return NextResponse.json({ ok: false, error: 'Reserva no encontrada' }, { status: 404 })
    }

    // Verificar teléfono
    const cleanPhone = phone.replace(/\s/g, '').replace(/^\+34/, '')
    const dbPhone = (reservation.customer_phone || '').replace(/\s/g, '').replace(/^\+34/, '')
    if (cleanPhone !== dbPhone) {
      return NextResponse.json({ ok: false, error: 'El teléfono no coincide con la reserva' }, { status: 403 })
    }

    // Verificar que no esté ya cancelada
    if (reservation.status === 'CANCELED') {
      return NextResponse.json({ ok: false, error: 'Esta reserva ya está cancelada' }, { status: 400 })
    }

    if (reservation.status === 'COMPLETED') {
      return NextResponse.json({ ok: false, error: 'No se puede cancelar una reserva ya completada' }, { status: 400 })
    }

    // Cancelar
    const { error: updateErr } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'CANCELED',
        canceled_reason: 'Cancelada por el cliente desde la web',
      })
      .eq('id', reservation.id)

    if (updateErr) {
      console.error('[cancel POST] Update error:', updateErr)
      return NextResponse.json({ ok: false, error: 'Error al cancelar la reserva' }, { status: 500 })
    }

    // Enviar email de confirmación de cancelación
    if (reservation.customer_email) {
      sendCancellationConfirmation(reservation.customer_email, {
        nombre: reservation.customer_name,
        fecha: reservation.fecha,
        hora: reservation.hora_inicio,
        reservationNumber: ref.toUpperCase(),
      }).catch(err => console.error('[cancel POST] Email error:', err))
    }

    console.log(`[cancel POST] Reserva ${ref} cancelada por el cliente`)

    return NextResponse.json({
      ok: true,
      message: `Reserva ${ref} cancelada correctamente`,
    })
  } catch (err) {
    console.error('[cancel POST] Error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
