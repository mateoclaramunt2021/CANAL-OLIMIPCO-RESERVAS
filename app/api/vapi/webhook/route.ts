import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sanitize } from '@/lib/security'
import { notifyVapiCallEnded } from '@/lib/telegram'
import { sendGroupReservationLinkSMS, sendSMS } from '@/lib/sms'

// ─── VAPI Server URL / Webhook ──────────────────────────────────────────────
// Este endpoint recibe las function calls de VAPI y los end-of-call reports.
// Configúralo en VAPI como "Server URL" del asistente.
//
// Functions disponibles para el asistente VAPI:
//   1. createReservation  → Crea una reserva normal (1-6 pers)
//   2. checkAvailability  → Consulta disponibilidad para fecha/hora
//   3. getMenuInfo        → Devuelve info de menús disponibles
//   4. cancelReservation  → Cancela una reserva por referencia
//   5. sendGroupLink      → Envía SMS con enlace web para reserva de grupo
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://canalolimpicorestaurante.com'

// ─── Router central de funciones ─────────────────────────────────────────────
// Acepta tanto nombres en inglés (prompt) como en español (VAPI dashboard)
async function routeFunctionCall(
  name: string,
  parameters: Record<string, any>,
  vapiPayload: any
): Promise<{ result: string }> {
  switch (name) {
    case 'createReservation':
    case 'crear_reserva':
    case 'agendar_reunion': {
      const res = await handleCreateReservation(parameters, vapiPayload)
      const data = await res.json()
      return { result: data.result }
    }
    case 'checkAvailability':
    case 'comprobar_disponibilidad': {
      const res = await handleCheckAvailability(parameters)
      const data = await res.json()
      return { result: data.result }
    }
    case 'getMenuInfo':
    case 'obtener_menu': {
      const res = await handleGetMenuInfo()
      const data = await res.json()
      return { result: data.result }
    }
    case 'cancelReservation':
    case 'cancelar_reserva': {
      const res = await handleCancelReservation(parameters)
      const data = await res.json()
      return { result: data.result }
    }
    case 'sendGroupLink':
    case 'enviar_enlace_grupo': {
      const res = await handleSendGroupLink(parameters, vapiPayload)
      const data = await res.json()
      return { result: data.result }
    }
    default:
      console.error(`[VAPI] Función no reconocida: ${name}`)
      return { result: `Función ${name} no reconocida` }
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const messageType = payload.message?.type

    // ── Function Call de VAPI (formato antiguo: function-call) ──
    if (messageType === 'function-call') {
      const { name, parameters } = payload.message.functionCall
      console.log(`[VAPI] Function call: ${name}`, parameters)
      const result = await routeFunctionCall(name, parameters, payload)
      return NextResponse.json(result)
    }

    // ── Tool Calls de VAPI (formato nuevo: tool-calls) ──
    if (messageType === 'tool-calls') {
      const toolCalls = payload.message.toolCallList || payload.message.toolWithToolCallList || []
      console.log(`[VAPI] Tool calls: ${toolCalls.length} calls`, JSON.stringify(toolCalls.map((t: any) => t.function?.name || t.name || t.toolCall?.name)))

      const results = []
      for (const toolCall of toolCalls) {
        // VAPI puede enviar en dos formatos:
        // toolCallList: { id, name, parameters }
        // toolWithToolCallList: { name, toolCall: { id, parameters } }
        const name = toolCall.function?.name || toolCall.name || toolCall.toolCall?.name
        const parameters = toolCall.function?.arguments || toolCall.parameters || toolCall.toolCall?.parameters || {}
        const toolCallId = toolCall.id || toolCall.toolCall?.id

        console.log(`[VAPI] Processing tool call: ${name}`, parameters)
        const result = await routeFunctionCall(name, parameters, payload)
        results.push({ name, toolCallId, result: result.result })
      }

      return NextResponse.json({ results })
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

    const refText = data.reservation_number || data.reservation_id || ''

    return NextResponse.json({
      result: `Reserva creada correctamente. La referencia es ${refText}. Le acabo de enviar un SMS de confirmación a su teléfono. Despídete de forma cálida.`,
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
  const { reservation_id } = params

  if (!reservation_id) {
    return NextResponse.json({
      result: 'Necesito el código de reserva para cancelarla. Pide al cliente que te diga los 4 números que recibió por SMS.',
    })
  }

  try {
    // Buscar por reservation_number (código de 4 dígitos)
    const { data: reservations, error } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('reservation_number', String(reservation_id).trim())
      .in('status', ['HOLD_BLOCKED', 'CONFIRMED', 'PENDING_PAYMENT'])
      .limit(1)

    const reservation = reservations?.[0]

    if (error || !reservation) {
      return NextResponse.json({
        result: 'No he encontrado ninguna reserva activa con ese código. Pide al cliente que compruebe los 4 números de su SMS de confirmación.',
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
      .eq('id', reservation.id)

    // Enviar SMS de confirmación de cancelación
    const phone = reservation.telefono
    if (phone) {
      const [y, m, d] = (reservation.fecha || '').split('-')
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
      const fechaFormateada = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

      sendSMS(phone, [
        'Canal Olimpico - Reserva Cancelada',
        '',
        `Hola ${reservation.nombre || 'Cliente'}!`,
        `Tu reserva del ${fechaFormateada} a las ${reservation.hora_inicio || ''}h ha sido cancelada.`,
        '',
        'Si ha sido un error, llamanos al 930 347 246.',
        'Un saludo!',
      ].join('\n')).catch(err => console.error('[VAPI] Error enviando SMS cancelación:', err))
    }

    // Comprobar si era evento para avisar de la señal
    const isEvento = reservation.event_type && reservation.event_type !== 'RESERVA_NORMAL'
    const avisoSenal = isEvento ? ' Si la cancelación es con menos de setenta y dos horas de antelación, se pierde la señal.' : ''

    return NextResponse.json({
      result: `Reserva cancelada correctamente. Le he enviado un SMS de confirmación.${avisoSenal} Despídete amablemente.`,
    })
  } catch (err) {
    console.error('[VAPI] Error cancelando reserva:', err)
    return NextResponse.json({
      result: 'Hubo un error al cancelar la reserva. Por favor, inténtalo más tarde.',
    })
  }
}

// ─── Handler: Enviar enlace SMS para reserva de grupo ────────────────────────
// Cuando el cliente quiere reservar para grupo/evento, en vez de hacer todo
// por teléfono, le enviamos un SMS con un enlace a la web donde puede
// completarlo cómodamente (elegir menú, pagar señal, etc.)
async function handleSendGroupLink(
  params: Record<string, any>,
  vapiPayload: any
) {
  const { nombre } = params

  // Obtener teléfono del caller ID de Twilio/VAPI
  const callerNumber = vapiPayload.message?.call?.customer?.number || params.telefono || null

  if (!callerNumber) {
    return NextResponse.json({
      result: 'No tengo el número de teléfono del cliente. Pídele su número para poder enviarle el enlace por SMS.',
    })
  }

  const safeName = nombre ? sanitize(String(nombre)) : 'Cliente'

  try {
    const sent = await sendGroupReservationLinkSMS(callerNumber, {
      nombre: safeName,
      phone: callerNumber,
    })

    if (sent) {
      return NextResponse.json({
        result: `Perfecto. Le acabo de enviar un SMS al ${callerNumber} con un enlace para completar la reserva de grupo. Ahí podrá elegir el menú, la fecha, el número de personas y pagar la señal cómodamente desde el móvil. Despídete de forma cálida y dile que si tiene dudas puede volver a llamar.`,
      })
    } else {
      return NextResponse.json({
        result: 'No se ha podido enviar el SMS. Dile al cliente que puede entrar directamente en canalolimpicorestaurante.com para hacer la reserva de grupo, o que vuelva a intentarlo.',
      })
    }
  } catch (err) {
    console.error('[VAPI] Error enviando SMS grupo:', err)
    return NextResponse.json({
      result: 'Hubo un error técnico al enviar el SMS. Dile al cliente que puede entrar en la web canalolimpicorestaurante.com para hacer la reserva de grupo.',
    })
  }
}
