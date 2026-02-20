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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://canal-olimpico.vercel.app'

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
  const { nombre, telefono, fecha, hora, personas, event_type, zona, menu_code } = params

  // Sanitize VAPI inputs
  const safeName = nombre ? sanitize(String(nombre)) : 'Cliente VAPI'

  // Si VAPI no extrajo el teléfono, intentar sacarlo del call metadata
  const phone = telefono || vapiPayload.message?.call?.customer?.number || null

  // Llamar a nuestra propia API de reservas
  try {
    const res = await fetch(`${SITE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: safeName,
        telefono: phone,
        fecha,   // YYYY-MM-DD
        hora,    // HH:mm
        personas: Number(personas) || 2,
        event_type: event_type || 'RESERVA_NORMAL',
        zona: zona || undefined,
        menu_code: menu_code || undefined,
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({
        result: `No se pudo crear la reserva: ${data.error}`,
      })
    }

    return NextResponse.json({
      result: `Reserva creada correctamente. Referencia: ${data.reservation_id}. ${
        data.table_id ? `Mesa asignada: ${data.table_id}.` : ''
      } ${
        data.stripe_url ? `Se ha enviado un enlace de pago por WhatsApp.` : 'Confirmación enviada por WhatsApp.'
      }`,
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
  const { fecha, hora, personas, zona } = params

  try {
    const queryParams = new URLSearchParams()
    if (fecha) queryParams.set('date', fecha)
    if (hora) queryParams.set('time', hora)
    if (personas) queryParams.set('guests', String(personas))
    if (zona) queryParams.set('zona', zona)

    const res = await fetch(`${SITE_URL}/api/availability?${queryParams.toString()}`)
    const data = await res.json()

    if (data.available) {
      return NextResponse.json({
        result: `Sí, hay disponibilidad para ${personas} personas el ${fecha} a las ${hora}h${zona ? ` en zona ${zona}` : ''}. ¿Quieres que haga la reserva?`,
      })
    } else {
      return NextResponse.json({
        result: data.message || `Lo siento, no hay disponibilidad para ${personas} personas en esa fecha y hora. ¿Quieres probar otra fecha u hora?`,
      })
    }
  } catch (err) {
    console.error('[VAPI] Error consultando disponibilidad:', err)
    return NextResponse.json({
      result: 'No pude verificar la disponibilidad en este momento. ¿Quieres intentarlo con otra fecha?',
    })
  }
}

// ─── Handler: Info de Menús ──────────────────────────────────────────────────
async function handleGetMenuInfo() {
  try {
    const res = await fetch(`${SITE_URL}/api/menu_catalog`)
    const data = await res.json()

    const menuText = (data.menus || [])
      .map((m: any) => `• ${m.name}: ${m.price_per_person}€ por persona`)
      .join('\n')

    return NextResponse.json({
      result: `Estos son nuestros menús disponibles:\n${menuText}\n\nTodos los eventos requieren una señal del 40%. ¿Cuál te interesa?`,
    })
  } catch {
    return NextResponse.json({
      result: 'Tenemos menús desde 14,50€ (infantil) hasta 34€ por persona. ¿Te cuento más?',
    })
  }
}

// ─── Handler: Cancelar Reserva ───────────────────────────────────────────────
async function handleCancelReservation(params: Record<string, any>) {
  const { reservation_id, telefono } = params

  if (!reservation_id) {
    return NextResponse.json({
      result: 'Necesito la referencia de la reserva para poder cancelarla. ¿La tienes?',
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
        result: `No encontré ninguna reserva con referencia ${reservation_id}. ¿Puedes verificar el número?`,
      })
    }

    if (reservation.status === 'CANCELED') {
      return NextResponse.json({
        result: 'Esa reserva ya estaba cancelada.',
      })
    }

    // Cancelar
    await supabaseAdmin
      .from('reservations')
      .update({ status: 'CANCELED', canceled_reason: 'Cancelada por llamada VAPI' })
      .eq('id', reservation_id)

    return NextResponse.json({
      result: `Reserva ${reservation_id} cancelada correctamente. Se lo confirmaremos por WhatsApp.`,
    })
  } catch (err) {
    console.error('[VAPI] Error cancelando reserva:', err)
    return NextResponse.json({
      result: 'Hubo un error al cancelar la reserva. Por favor, inténtalo más tarde.',
    })
  }
}
