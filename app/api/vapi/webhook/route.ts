import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sanitize } from '@/lib/security'
import { notifyVapiCallEnded } from '@/lib/telegram'

// ─── VAPI Server URL / Webhook ──────────────────────────────────────────────
// Este endpoint recibe las function calls de VAPI y los end-of-call reports.
// Configúralo en VAPI como "Server URL" del asistente.
//
// Functions disponibles para el asistente VAPI:
//   1. createReservation  → Crea una reserva nueva
//   2. checkAvailability  → Consulta disponibilidad para fecha/hora
//   3. getMenuInfo        → Devuelve info de menús disponibles
//   4. cancelReservation  → Cancela una reserva por referencia
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reservascanalolimpico.netlify.app'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const messageType = payload.message?.type

    // ── Function Call de VAPI ──
    if (messageType === 'function-call') {
      const { name, parameters } = payload.message.functionCall
      console.log(`[VAPI] Function call: ${name}`, parameters)

      switch (name) {
        case 'createReservation':
          return await handleCreateReservation(parameters, payload)
        case 'checkAvailability':
          return await handleCheckAvailability(parameters)
        case 'getMenuInfo':
          return await handleGetMenuInfo()
        case 'cancelReservation':
          return await handleCancelReservation(parameters)
        default:
          return NextResponse.json({ result: `Función ${name} no reconocida` })
      }
    }

    // ── End of Call Report ──
    if (messageType === 'end-of-call-report') {
      console.log('[VAPI] End of call report:', {
        endedReason: payload.message.endedReason,
        duration: payload.message.durationSeconds,
        cost: payload.message.cost,
      })

      // Guardar el call log si hay reservation_id en los metadata
      const callData: Record<string, unknown> = {
        vapi_call_id: payload.message.call?.id || null,
        duration: payload.message.durationSeconds || 0,
        transcript: payload.message.transcript || null,
        summary: payload.message.summary || null,
        created_at: new Date().toISOString(),
      }

      await supabaseAdmin
        .from('call_logs')
        .insert(callData)

      // Telegram notification
      notifyVapiCallEnded({
        callId: payload.message.call?.id || undefined,
        phone: payload.message.call?.customer?.number || undefined,
        duration: payload.message.durationSeconds || undefined,
        summary: payload.message.summary || undefined,
        endedReason: payload.message.endedReason || undefined,
      }).catch(err => console.error('[VAPI webhook] Telegram error:', err))

      return NextResponse.json({ ok: true })
    }

    // ── Status Update ──
    if (messageType === 'status-update') {
      console.log('[VAPI] Status update:', payload.message.status)
      return NextResponse.json({ ok: true })
    }

    // ── Hang notification ──
    if (messageType === 'hang') {
      console.log('[VAPI] Hang detected')
      return NextResponse.json({ ok: true })
    }

    // Default
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[VAPI webhook] Error:', err)
    return NextResponse.json({ error: 'Error procesando webhook VAPI' }, { status: 500 })
  }
}

// ─── Handler: Crear Reserva ──────────────────────────────────────────────────
async function handleCreateReservation(
  params: Record<string, any>,
  vapiPayload: any
) {
  const { nombre, telefono, email, fecha, hora, personas, event_type, zona, menu_code } = params

  // Sanitize VAPI inputs
  const safeName = nombre ? sanitize(String(nombre)) : 'Cliente VAPI'

  // Si VAPI no extrajo el teléfono, intentar sacarlo del call metadata
  const callerNumber = vapiPayload.message?.call?.customer?.number || null
  const phone = telefono || callerNumber || '000000000' // fallback para no fallar validación

  console.log('[VAPI] createReservation params:', { nombre: safeName, phone, email, fecha, hora, personas, event_type, callerNumber })

  // Llamar a nuestra propia API de reservas
  try {
    const res = await fetch(`${SITE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: safeName,
        telefono: phone,
        email: email || undefined,
        fecha,   // YYYY-MM-DD
        hora,    // HH:mm
        personas: Number(personas) || 2,
        event_type: event_type || 'RESERVA_NORMAL',
        zona: zona || undefined,
        menu_code: menu_code || undefined,
      }),
    })

    const data = await res.json()
    console.log('[VAPI] createReservation response:', { status: res.status, ok: data.ok, error: data.error, reservation_id: data.reservation_id })

    if (!data.ok) {
      return NextResponse.json({
        result: `No se ha podido crear la reserva: ${data.error}. Díselo al cliente y pregunta si quiere cambiar algo.`,
      })
    }

    const isEvento = params.event_type && params.event_type !== 'RESERVA_NORMAL'
    const refText = data.reservation_id ? `La referencia es ${data.reservation_id}.` : ''
    const pagoText = data.stripe_url
      ? 'Se le enviará un email con el enlace para pagar la señal.'
      : 'Se le enviará un email de confirmación.'

    return NextResponse.json({
      result: `Reserva creada correctamente. ${refText} ${isEvento ? pagoText : 'Se le enviará confirmación por email.'} Despídete de forma cálida.`,
    })
  } catch (err) {
    console.error('[VAPI] Error creando reserva:', err)
    return NextResponse.json({
      result: 'Hubo un error técnico al crear la reserva. Por favor, inténtalo de nuevo.',
    })
  }
}

// ─── Handler: Consultar Disponibilidad ───────────────────────────────────────
async function handleCheckAvailability(params: Record<string, any>) {
  const { fecha, hora, personas, zona, event_type } = params

  try {
    // La API de disponibilidad usa POST con body JSON
    const res = await fetch(`${SITE_URL}/api/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha,
        hora: hora || '14:00',
        personas: Number(personas) || 2,
        event_type: event_type || 'RESERVA_NORMAL',
        zona: zona || undefined,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[VAPI] Availability API error:', data)
      return NextResponse.json({
        result: `No he podido comprobar la disponibilidad. ${data.error || 'Error interno'}. Pregunta al cliente si quiere intentarlo con otra fecha u hora.`,
      })
    }

    if (data.available) {
      const zonaText = zona ? ` en zona ${zona}` : ''
      return NextResponse.json({
        result: `Hay disponibilidad para ${personas} personas el ${fecha} a las ${hora}${zonaText}. Confirma con el cliente si quiere reservar.`,
      })
    } else {
      // Construir alternativas si las hay
      let altText = ''
      if (data.alternatives && data.alternatives.length > 0) {
        altText = ` Hay disponibilidad a las: ${data.alternatives.join(', ')}.`
      }
      return NextResponse.json({
        result: `${data.message || 'No hay disponibilidad a esa hora.'} ${altText} Ofrece las alternativas al cliente o pregunta si quiere otra fecha.`,
      })
    }
  } catch (err) {
    console.error('[VAPI] Error consultando disponibilidad:', err)
    return NextResponse.json({
      result: 'Ha habido un error técnico comprobando la disponibilidad. Dile al cliente que lo sientes y pregunta si quiere probar con otra fecha.',
    })
  }
}

// ─── Handler: Info de Menús ──────────────────────────────────────────────────
async function handleGetMenuInfo() {
  try {
    const res = await fetch(`${SITE_URL}/api/menu_catalog`)
    const data = await res.json()

    const menus = data.menus || []
    if (menus.length === 0) {
      return NextResponse.json({
        result: 'Menús disponibles: Menú infantil a catorce con cincuenta por persona. Menú grupo a veintinueve o treinta y cuatro euros por persona. Menú pica-pica a treinta o treinta y cuatro euros por persona. Los eventos requieren una señal del cuarenta por ciento. Ofrece solo los menús relevantes al tipo de evento del cliente.',
      })
    }

    const menuText = menus
      .map((m: any) => `${m.name}: ${m.price_per_person} euros por persona`)
      .join('. ')

    return NextResponse.json({
      result: `Menús disponibles: ${menuText}. Los eventos requieren señal del cuarenta por ciento. Ofrece solo los relevantes al tipo de evento del cliente.`,
    })
  } catch {
    return NextResponse.json({
      result: 'Menús disponibles: Menú infantil a catorce con cincuenta por persona. Menú grupo a veintinueve o treinta y cuatro euros por persona. Menú pica-pica a treinta o treinta y cuatro euros por persona. Los eventos requieren una señal del cuarenta por ciento.',
    })
  }
}

// ─── Handler: Cancelar Reserva ───────────────────────────────────────────────
async function handleCancelReservation(params: Record<string, any>) {
  const { reservation_id, telefono } = params

  if (!reservation_id) {
    return NextResponse.json({
      result: 'Necesito la referencia de la reserva para cancelarla. Pide al cliente que te dé el número de referencia que recibió por WhatsApp.',
    })
  }

  try {
    // Buscar la reserva
    const { data: reservation, error } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservation_id)
      .single()

    if (error || !reservation) {
      return NextResponse.json({
        result: `No se ha encontrado ninguna reserva con esa referencia. Pide al cliente que compruebe el número de referencia.`,
      })
    }

    if (reservation.status === 'CANCELED') {
      return NextResponse.json({
        result: 'Esa reserva ya estaba cancelada previamente. Informa al cliente.',
      })
    }

    // Cancelar
    await supabaseAdmin
      .from('reservations')
      .update({ status: 'CANCELED', canceled_reason: 'Cancelada por llamada telefónica' })
      .eq('id', reservation_id)

    // Comprobar si era evento para avisar de la señal
    const isEvento = reservation.event_type && reservation.event_type !== 'RESERVA_NORMAL'
    const avisoSenal = isEvento ? ' Si la cancelación es con menos de setenta y dos horas de antelación, se pierde la señal.' : ''

    return NextResponse.json({
      result: `Reserva cancelada correctamente. Se enviará confirmación por WhatsApp.${avisoSenal} Despídete amablemente.`,
    })
  } catch (err) {
    console.error('[VAPI] Error cancelando reserva:', err)
    return NextResponse.json({
      result: 'Hubo un error al cancelar la reserva. Por favor, inténtalo más tarde.',
    })
  }
}
