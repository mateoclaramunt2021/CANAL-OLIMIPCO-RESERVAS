import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findBestTable } from '@/core/tables'
import { checkMinAdvance, calculateQuote, findMenu, PAYMENT_DEADLINE_DAYS } from '@/core/menus'
import { sendReservationConfirmation, sendPaymentLink } from '@/lib/whatsapp'
import { getStripe } from '@/lib/stripe'

// ─── Tipos válidos de evento ─────────────────────────────────────────────────
const VALID_EVENT_TYPES = [
  'RESERVA_NORMAL',
  'INFANTIL_CUMPLE',
  'GRUPO_SENTADO',
  'GRUPO_PICA_PICA',
  'NOCTURNA_EXCLUSIVA',
] as const

const EVENT_TYPES_REQUIRING_PAYMENT = [
  'INFANTIL_CUMPLE',
  'GRUPO_SENTADO',
  'GRUPO_PICA_PICA',
  'NOCTURNA_EXCLUSIVA',
]

const ACTIVE_STATUSES = ['HOLD_BLOCKED', 'CONFIRMED']

// ─── POST: Crear reserva ────────────────────────────────────────────────────
// RESERVA_NORMAL → asigna mesa + WhatsApp confirmación directa
// GRUPO/EVENTO → calcula total + señal 40% + genera link Stripe + WhatsApp con link

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const { nombre, telefono, fecha, hora, personas, event_type, zona, menu_code, extras_horarios } = body as {
    nombre?: string
    telefono?: string
    fecha?: string
    hora?: string
    personas?: number
    event_type?: string
    zona?: 'fuera' | 'dentro'
    menu_code?: string
    extras_horarios?: string[]  // ['01:00-02:00', '02:00-03:00']
  }

  // Validaciones
  const errors: string[] = []

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '')
    errors.push('nombre es obligatorio')

  if (!telefono || typeof telefono !== 'string' || telefono.trim() === '')
    errors.push('telefono es obligatorio')

  if (!fecha || typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    errors.push('fecha es obligatoria y debe tener formato YYYY-MM-DD')

  if (!hora || typeof hora !== 'string' || !/^\d{2}:\d{2}$/.test(hora))
    errors.push('hora es obligatoria y debe tener formato HH:mm')

  if (personas == null || typeof personas !== 'number' || !Number.isInteger(personas) || personas < 1)
    errors.push('personas es obligatorio y debe ser un número entero mayor a 0')

  if (!event_type || !VALID_EVENT_TYPES.includes(event_type as typeof VALID_EVENT_TYPES[number]))
    errors.push(`event_type es obligatorio. Valores válidos: ${VALID_EVENT_TYPES.join(', ')}`)

  // Para eventos con pago, menu_code es obligatorio
  if (event_type && EVENT_TYPES_REQUIRING_PAYMENT.includes(event_type) && !menu_code) {
    errors.push('menu_code es obligatorio para eventos de grupo')
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, error: errors.join('. ') }, { status: 400 })
  }

  // ── Verificar antelación mínima (4h para mesa, 5 días para eventos) ──
  const advance = checkMinAdvance(fecha!, hora!, event_type as string)
  if (!advance.ok) {
    return NextResponse.json({ ok: false, error: advance.message }, { status: 400 })
  }

  // Calcular hora_fin (bloque de 2 horas)
  const [h, m] = hora!.split(':').map(Number)
  const finMinutes = h * 60 + m + 120
  const hora_fin = `${String(Math.floor((finMinutes % 1440) / 60)).padStart(2, '0')}:${String(finMinutes % 60).padStart(2, '0')}`

  try {
    // ── Variables de precio (para grupos) ──
    let total_amount: number | null = null
    let deposit_amount: number | null = null
    let selectedMenuCode: string | null = menu_code || null

    // ── Calcular precio si es evento con pago ──
    if (event_type && EVENT_TYPES_REQUIRING_PAYMENT.includes(event_type) && menu_code) {
      const quote = calculateQuote(menu_code, personas!, extras_horarios)
      if ('error' in quote) {
        return NextResponse.json({ ok: false, error: quote.error }, { status: 400 })
      }
      total_amount = quote.total
      deposit_amount = quote.deposit
    }

    // ── Asignar mesa si es RESERVA_NORMAL ──
    let table_id: string | null = null

    if (event_type === 'RESERVA_NORMAL') {
      const { data: existing } = await supabaseAdmin
        .from('reservations')
        .select('table_id, hora_inicio, hora_fin')
        .eq('fecha', fecha)
        .in('status', ACTIVE_STATUSES)

      const slotStart = h * 60 + m
      const slotEnd = slotStart + 120

      const occupiedIds = (existing ?? [])
        .filter((r: any) => {
          if (!r.hora_inicio || !r.table_id) return false
          const [rh, rm] = r.hora_inicio.split(':').map(Number)
          const rStart = rh * 60 + rm
          const rEnd = r.hora_fin
            ? (() => { const [eh, em] = r.hora_fin.split(':').map(Number); return eh * 60 + em })()
            : rStart + 120
          return slotStart < rEnd && slotEnd > rStart
        })
        .map((r: any) => r.table_id)

      const mesa = findBestTable(personas!, occupiedIds, zona)
      if (!mesa) {
        return NextResponse.json({
          ok: false,
          error: `No hay mesa disponible para ${personas} personas${zona ? ` en zona ${zona}` : ''} a esa hora`,
        }, { status: 409 })
      }
      table_id = mesa.id
    }

    // ── Insertar reserva ──
    const reservationData: Record<string, any> = {
      customer_name: nombre!.trim(),
      customer_phone: telefono!.trim(),
      fecha: fecha,
      hora_inicio: hora,
      hora_fin: hora_fin,
      personas: personas,
      event_type: event_type,
      table_id: table_id,
      status: event_type === 'RESERVA_NORMAL' ? 'CONFIRMED' : 'HOLD_BLOCKED',
      total_amount: total_amount,
      deposit_amount: deposit_amount,
      menu_code: selectedMenuCode,
      payment_deadline: event_type !== 'RESERVA_NORMAL'
        ? new Date(Date.now() + PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null,
      created_at: new Date().toISOString(),
    }

    if (event_type === 'NOCTURNA_EXCLUSIVA') {
      reservationData.is_exclusive = true
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('reservations')
      .insert(reservationData)
      .select('id')
      .single()

    if (dbError) {
      console.error('[reservations POST] Supabase error:', dbError)
      return NextResponse.json({ ok: false, error: 'Error al guardar la reserva' }, { status: 500 })
    }

    const reservationId = data.id

    // ── Post-creación: WhatsApp automático ──
    let stripeUrl: string | null = null

    if (event_type === 'RESERVA_NORMAL') {
      // → WhatsApp de confirmación directa
      const mesa = table_id ? findBestTable(personas!, [], zona) : null
      sendReservationConfirmation(telefono!.trim(), {
        nombre: nombre!.trim(),
        fecha: fecha!,
        hora: hora!,
        personas: personas!,
        tableId: table_id,
        zone: zona || null,
        reservationId,
      }).catch(err => console.error('[reservations POST] WhatsApp error:', err))

    } else if (deposit_amount && deposit_amount > 0) {
      // → Generar link de Stripe + WhatsApp con link de pago
      try {
        const stripe = getStripe()
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Señal Reserva — ${findMenu(menu_code!)?.name || 'Evento'}`,
                description: `${personas} personas, ${fecha} ${hora}h`,
              },
              unit_amount: Math.round(deposit_amount * 100),
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://canal-olimpico.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://canal-olimpico.vercel.app'}/cancel`,
          metadata: { reservation_id: reservationId },
          expires_at: Math.floor(Date.now() / 1000) + (PAYMENT_DEADLINE_DAYS * 24 * 60 * 60),
        })

        stripeUrl = session.url

        // Guardar URL en la reserva
        await supabaseAdmin
          .from('reservations')
          .update({ stripe_checkout_url: session.url, stripe_session_id: session.id })
          .eq('id', reservationId)

        // Enviar WhatsApp con link de pago
        sendPaymentLink(telefono!.trim(), {
          nombre: nombre!.trim(),
          fecha: fecha!,
          hora: hora!,
          personas: personas!,
          menuName: findMenu(menu_code!)?.name || 'Menú seleccionado',
          total: total_amount!,
          deposit: deposit_amount,
          paymentUrl: session.url!,
          deadlineDays: PAYMENT_DEADLINE_DAYS,
          reservationId,
        }).catch(err => console.error('[reservations POST] WhatsApp payment error:', err))

      } catch (stripeErr) {
        console.error('[reservations POST] Stripe error:', stripeErr)
        // La reserva se creó, pero no se generó Stripe. No es fatal.
      }
    }

    return NextResponse.json({
      ok: true,
      reservation_id: reservationId,
      message: event_type === 'RESERVA_NORMAL'
        ? 'Reserva confirmada. Se ha enviado WhatsApp de confirmación.'
        : `Reserva creada. Se ha enviado WhatsApp con link de pago (señal ${deposit_amount}€).`,
      table_id: table_id,
      total_amount,
      deposit_amount,
      stripe_url: stripeUrl,
      payment_deadline: reservationData.payment_deadline,
    })
  } catch (err) {
    console.error('[reservations POST] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── PATCH: Modificar reserva ────────────────────────────────────────────────
// Permite cambiar: fecha, hora, personas, event_type, zona, status, nombre, telefono

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const { reservation_id, ...updates } = body as {
    reservation_id?: string
    nombre?: string
    telefono?: string
    fecha?: string
    hora?: string
    personas?: number
    event_type?: string
    zona?: 'fuera' | 'dentro'
    status?: string
  }

  if (!reservation_id || typeof reservation_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'reservation_id es obligatorio' }, { status: 400 })
  }

  // Validar campos opcionales si se envían
  const errors: string[] = []
  if (updates.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(updates.fecha))
    errors.push('fecha debe tener formato YYYY-MM-DD')
  if (updates.hora && !/^\d{2}:\d{2}$/.test(updates.hora))
    errors.push('hora debe tener formato HH:mm')
  if (updates.personas != null && (typeof updates.personas !== 'number' || updates.personas < 1))
    errors.push('personas debe ser un número mayor a 0')
  if (updates.event_type && !VALID_EVENT_TYPES.includes(updates.event_type as typeof VALID_EVENT_TYPES[number]))
    errors.push(`event_type inválido. Valores: ${VALID_EVENT_TYPES.join(', ')}`)
  if (updates.status && !['HOLD_BLOCKED', 'CONFIRMED', 'CANCELED', 'COMPLETED'].includes(updates.status))
    errors.push('status inválido. Valores: HOLD_BLOCKED, CONFIRMED, CANCELED, COMPLETED')

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, error: errors.join('. ') }, { status: 400 })
  }

  try {
    // Obtener reserva actual
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservation_id)
      .single()

    if (fetchErr || !current) {
      return NextResponse.json({ ok: false, error: 'Reserva no encontrada' }, { status: 404 })
    }

    // Construir updates para Supabase
    const dbUpdates: Record<string, unknown> = {}

    if (updates.nombre) dbUpdates.customer_name = updates.nombre.trim()
    if (updates.telefono) dbUpdates.customer_phone = updates.telefono.trim()
    if (updates.fecha) dbUpdates.fecha = updates.fecha
    if (updates.hora) {
      dbUpdates.hora_inicio = updates.hora
      const [uh, um] = updates.hora.split(':').map(Number)
      const ufin = uh * 60 + um + 120
      dbUpdates.hora_fin = `${String(Math.floor((ufin % 1440) / 60)).padStart(2, '0')}:${String(ufin % 60).padStart(2, '0')}`
    }
    if (updates.personas != null) dbUpdates.personas = updates.personas
    if (updates.event_type) dbUpdates.event_type = updates.event_type
    if (updates.status) dbUpdates.status = updates.status

    // Si cambian fecha/hora/personas/zona → reasignar mesa
    const needsTableReassign =
      (updates.fecha || updates.hora || updates.personas != null || updates.zona) &&
      (updates.event_type || current.event_type) === 'RESERVA_NORMAL'

    if (needsTableReassign) {
      const checkFecha = updates.fecha || current.fecha
      const checkHora = updates.hora || current.hora_inicio
      const checkPersonas = updates.personas ?? current.personas

      if (checkFecha && checkHora && checkPersonas) {
        const [ch, cm] = checkHora.split(':').map(Number)
        const slotStart = ch * 60 + cm
        const slotEnd = slotStart + 120

        const { data: existing } = await supabaseAdmin
          .from('reservations')
          .select('table_id, hora_inicio, hora_fin')
          .eq('fecha', checkFecha)
          .in('status', ACTIVE_STATUSES)
          .neq('id', reservation_id) // excluir la propia reserva

        const occupiedIds = (existing ?? [])
          .filter((r: any) => {
            if (!r.hora_inicio || !r.table_id) return false
            const [rh, rm] = r.hora_inicio.split(':').map(Number)
            const rStart = rh * 60 + rm
            const rEnd = r.hora_fin
              ? (() => { const [eh, em] = r.hora_fin.split(':').map(Number); return eh * 60 + em })()
              : rStart + 120
            return slotStart < rEnd && slotEnd > rStart
          })
          .map((r: any) => r.table_id)

        const mesa = findBestTable(checkPersonas, occupiedIds, updates.zona)
        if (!mesa) {
          return NextResponse.json({
            ok: false,
            error: `No hay mesa disponible para ${checkPersonas} personas con los nuevos datos`,
          }, { status: 409 })
        }
        dbUpdates.table_id = mesa.id
      }
    }

    // Si cambian a un tipo de evento → quitar mesa
    if (updates.event_type && updates.event_type !== 'RESERVA_NORMAL') {
      dbUpdates.table_id = null
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json({ ok: false, error: 'No se envió ningún campo para actualizar' }, { status: 400 })
    }

    const { error: updateErr } = await supabaseAdmin
      .from('reservations')
      .update(dbUpdates)
      .eq('id', reservation_id)

    if (updateErr) {
      console.error('[reservations PATCH] Supabase error:', updateErr)
      return NextResponse.json({ ok: false, error: 'Error al actualizar la reserva' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Reserva actualizada',
      updated_fields: Object.keys(dbUpdates),
      table_id: dbUpdates.table_id ?? current.table_id,
    })
  } catch (err) {
    console.error('[reservations PATCH] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const fecha = searchParams.get('fecha')

    let query = supabaseAdmin
      .from('reservations')
      .select('*')

    if (status) query = query.eq('status', status)
    if (startDate) query = query.gte('fecha', startDate)
    if (fecha) query = query.eq('fecha', fecha)

    query = query.order('fecha', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('[reservations GET] Supabase error:', error.message, error.details, error.hint)
      return NextResponse.json(
        { error: error.message, details: error.details || null },
        { status: 500 }
      )
    }

    console.log(`[reservations GET] OK — ${(data || []).length} reservas devueltas`)
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[reservations GET] Unexpected error:', err?.message || err)
    return NextResponse.json(
      { error: 'Error interno al obtener reservas' },
      { status: 500 }
    )
  }
}