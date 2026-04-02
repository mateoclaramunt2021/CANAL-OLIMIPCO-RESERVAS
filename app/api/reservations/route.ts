import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findBestTable } from '@/core/tables'
import { checkMinAdvance, calculateQuote, findMenu, PAYMENT_DEADLINE_DAYS, canCancel } from '@/core/menus'
import { sendReservationConfirmation, sendBankTransferPayment, notifyRestaurantNewReservation } from '@/lib/email'
import { sanitize, sanitizeObject, isValidPhone, isBot, isTooFast } from '@/lib/security'
import { notifyNewReservation } from '@/lib/telegram'
import { sendReservationConfirmationSMS, sendBankTransferSMS } from '@/lib/sms'

// ─── Generar código de reserva corto (4 dígitos) ─────────────────────────────
// Formato: 4 dígitos (ej: 4521) — fácil de decir y entender por teléfono
async function generateReservationNumber(): Promise<string> {
  const MAX_ATTEMPTS = 20

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000)) // 1000-9999

    // Verificar que no esté en uso en reservas activas futuras
    const { data } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('reservation_number', code)
      .in('status', ['HOLD_BLOCKED', 'CONFIRMED', 'PENDING_PAYMENT'])
      .gte('fecha', new Date().toISOString().split('T')[0])
      .limit(1)

    if (!data || data.length === 0) {
      return code
    }
  }

  // Fallback extremo: usar timestamp
  return String(Date.now()).slice(-4)
}

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

// Todos los eventos usan transferencia bancaria
const BANK_TRANSFER_EVENT_TYPES = [
  'INFANTIL_CUMPLE',
  'GRUPO_SENTADO',
  'GRUPO_PICA_PICA',
  'NOCTURNA_EXCLUSIVA',
]

const ACTIVE_STATUSES = ['HOLD_BLOCKED', 'CONFIRMED']

const VALID_CAKE_CHOICES = ['oreo', 'kinder', 'nutella', 'sin_gluten'] as const

// ─── POST: Crear reserva ────────────────────────────────────────────────────
// RESERVA_NORMAL → asigna mesa + SMS confirmación directa
// GRUPO/EVENTO → calcula total + señal 40% + SMS con datos transferencia bancaria

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const { nombre, telefono, email, fecha, hora, personas, event_type, zona, menu_code, extras_horarios, cake_choice, drink_tickets, _hp, _ts } = body as {
    nombre?: string
    telefono?: string
    email?: string
    fecha?: string
    hora?: string
    personas?: number
    event_type?: string
    zona?: 'fuera' | 'dentro'
    menu_code?: string
    extras_horarios?: string[]  // ['01:00-02:00', '02:00-03:00']
    cake_choice?: string        // 'oreo' | 'kinder' | 'nutella' | 'sin_gluten'
    drink_tickets?: number      // Tickets de bebida extra (3€ c/u)
    _hp?: string                // honeypot anti-bot
    _ts?: number                // timestamp anti-bot
  }

  // ── Anti-bot checks ──
  if (isBot(_hp)) {
    return NextResponse.json({ ok: false, error: 'Solicitud rechazada' }, { status: 403 })
  }
  if (_ts !== undefined && isTooFast(_ts)) {
    return NextResponse.json({ ok: false, error: 'Formulario enviado demasiado rápido' }, { status: 429 })
  }

  // Validaciones
  const errors: string[] = []

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '')
    errors.push('nombre es obligatorio')

  if (!telefono || typeof telefono !== 'string' || telefono.trim() === '') {
    // Permitir crear sin teléfono si hay email (caso VAPI)
    if (!email) errors.push('telefono o email es obligatorio')
  } else if (!isValidPhone(telefono)) {
    errors.push('formato de teléfono inválido')
  }

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

  // cake_choice obligatorio para cumples infantiles
  if (event_type === 'INFANTIL_CUMPLE') {
    if (!cake_choice || !VALID_CAKE_CHOICES.includes(cake_choice as typeof VALID_CAKE_CHOICES[number])) {
      errors.push(`cake_choice es obligatorio para cumpleaños infantil. Valores: ${VALID_CAKE_CHOICES.join(', ')}`)
    }
  }

  // drink_tickets validación
  if (drink_tickets != null && (typeof drink_tickets !== 'number' || drink_tickets < 0 || !Number.isInteger(drink_tickets))) {
    errors.push('drink_tickets debe ser un número entero >= 0')
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
      const quote = calculateQuote(menu_code, personas!, extras_horarios, drink_tickets || 0)
      if ('error' in quote) {
        return NextResponse.json({ ok: false, error: quote.error }, { status: 400 })
      }
      total_amount = quote.total
      deposit_amount = quote.deposit

      // Validación mínimo 1000€ para NOCTURNA_EXCLUSIVA
      if (event_type === 'NOCTURNA_EXCLUSIVA' && total_amount < 1000) {
        return NextResponse.json({
          ok: false,
          error: `Las reservas nocturnas exclusivas requieren un mínimo de 1000€. Total actual: ${total_amount}€. Aumenta el número de personas o añade extras.`,
        }, { status: 400 })
      }
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
    const safeName = sanitize(nombre!.trim())
    const safePhone = telefono!.trim()
    const safeEmail = email ? email.trim().toLowerCase() : null

    const reservationData: Record<string, any> = {
      customer_name: safeName,
      customer_phone: safePhone,
      customer_email: safeEmail,
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
      menu_payload: {
        ...(menu_code ? { menu_code } : {}),
        ...(drink_tickets ? { drink_tickets } : {}),
        ...(cake_choice ? { cake_choice } : {}),
        ...(extras_horarios?.length ? { extras_horarios } : {}),
      },
      payment_deadline: event_type !== 'RESERVA_NORMAL'
        ? new Date(Date.now() + PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null,
      created_at: new Date().toISOString(),
    }

    // Generar número de reserva
    let reservationNumber: string | null = null
    try {
      reservationNumber = await generateReservationNumber()
      reservationData.reservation_number = reservationNumber
    } catch (err) {
      console.warn('[reservations POST] Could not generate reservation_number:', err)
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

    // ── Telegram notification (fire & forget) ──
    notifyNewReservation({
      reservationId,
      nombre: safeName,
      telefono: safePhone,
      fecha: fecha!,
      hora: hora!,
      personas: personas!,
      eventType: event_type as string,
      menuName: selectedMenuCode ? findMenu(selectedMenuCode)?.name : undefined,
      total: total_amount,
      deposit: deposit_amount,
      source: 'web',
    }).catch(err => console.error('[reservations POST] Telegram error:', err))

    // ── Post-creación: SMS al cliente + Email al restaurante ──
    let emailStatus = { clientEmail: false, restaurantEmail: false, smsSent: false, error: '' }

    // → Email al restaurante siempre
    try {
      await notifyRestaurantNewReservation({
        nombre: safeName,
        telefono: safePhone,
        email: safeEmail,
        fecha: fecha!,
        hora: hora!,
        personas: personas!,
        eventType: event_type as string,
        tableId: table_id,
        reservationId,
        reservationNumber,
      })
      emailStatus.restaurantEmail = true
    } catch (err: any) {
      console.error('[reservations POST] ❌ Restaurant email error:', err?.message || err)
      emailStatus.error += `Restaurante: ${err?.message || 'Error'}. `
    }

    if (event_type === 'RESERVA_NORMAL') {
      // → SMS de confirmación al cliente (canal principal)
      if (safePhone) {
        try {
          const smsSent = await sendReservationConfirmationSMS(safePhone, {
            nombre: safeName,
            fecha: fecha!,
            hora: hora!,
            personas: personas!,
            reservationNumber,
          })
          emailStatus.smsSent = smsSent
        } catch (err: any) {
          console.error('[reservations POST] ❌ SMS error:', err?.message || err)
          emailStatus.error += `SMS: ${err?.message || 'Error'}. `
        }
      }

      // → Email de confirmación (secundario, solo si hay email)
      if (safeEmail) {
        try {
          await sendReservationConfirmation(safeEmail, {
            nombre: safeName,
            fecha: fecha!,
            hora: hora!,
            personas: personas!,
            tableId: table_id,
            zone: zona || null,
            reservationId,
            reservationNumber,
          })
          emailStatus.clientEmail = true
        } catch (err: any) {
          console.error('[reservations POST] ❌ Client email error:', err?.message || err)
          emailStatus.error += `Email: ${err?.message || 'Error'}. `
        }
      }

    } else if (deposit_amount && deposit_amount > 0) {
      // → Todos los eventos van por transferencia bancaria

      // SMS con datos de transferencia al cliente
      if (safePhone) {
        try {
          const smsSent = await sendBankTransferSMS(safePhone, {
            nombre: safeName,
            deposit: deposit_amount,
            reservationNumber,
          })
          emailStatus.smsSent = smsSent
        } catch (err: any) {
          console.error('[reservations POST] ❌ SMS bank transfer error:', err?.message || err)
          emailStatus.error += `SMS transferencia: ${err?.message || 'Error'}. `
        }
      }

      // Email con datos de transferencia (secundario)
      if (safeEmail) {
        try {
          await sendBankTransferPayment(safeEmail, {
            nombre: safeName,
            fecha: fecha!,
            hora: hora!,
            personas: personas!,
            menuName: findMenu(menu_code!)?.name || 'Menú seleccionado',
            total: total_amount!,
            deposit: deposit_amount,
            deadlineDays: PAYMENT_DEADLINE_DAYS,
            reservationId,
            reservationNumber,
          })
          emailStatus.clientEmail = true
        } catch (err: any) {
          console.error('[reservations POST] ❌ Bank transfer email error:', err?.message || err)
          emailStatus.error += `Email transferencia: ${err?.message || 'Error'}. `
        }
      }
    }

    return NextResponse.json({
      ok: true,
      reservation_id: reservationId,
      reservation_number: reservationNumber,
      sms_sent: emailStatus.smsSent,
      message: event_type === 'RESERVA_NORMAL'
        ? `Reserva ${reservationNumber || reservationId.substring(0, 8)} confirmada.${emailStatus.smsSent ? ' SMS de confirmación enviado.' : ''}${emailStatus.clientEmail ? ' Email enviado.' : ''}`
        : `Reserva ${reservationNumber || reservationId.substring(0, 8)} creada.${emailStatus.smsSent ? ' SMS enviado.' : ''}${emailStatus.clientEmail ? ' Email enviado.' : ''}${deposit_amount ? ` Señal: ${deposit_amount}€ (transferencia).` : ''}`,
      table_id: table_id,
      total_amount,
      deposit_amount,
      payment_deadline: reservationData.payment_deadline,
      email_sent: emailStatus.clientEmail,
      restaurant_email_sent: emailStatus.restaurantEmail,
      email_error: emailStatus.error || undefined,
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

    // ── Validar plazo de modificación (72h antes del evento) ──
    const isChangingCritical = updates.fecha || updates.hora || updates.personas != null || updates.event_type
    if (isChangingCritical && current.fecha && current.hora_inicio) {
      const cancelCheck = canCancel(current.fecha, current.hora_inicio)
      if (!cancelCheck.ok) {
        return NextResponse.json({
          ok: false,
          error: `No se puede modificar: ${cancelCheck.message}`,
        }, { status: 400 })
      }
    }

    // ── Si se cambia la fecha, verificar antelación mínima ──
    if (updates.fecha) {
      const newEventType = updates.event_type || current.event_type
      const newHora = updates.hora || current.hora_inicio
      const advance = checkMinAdvance(updates.fecha, newHora, newEventType)
      if (!advance.ok) {
        return NextResponse.json({ ok: false, error: advance.message }, { status: 400 })
      }
    }

    // Construir updates para Supabase
    const dbUpdates: Record<string, unknown> = {}

    if (updates.nombre) dbUpdates.customer_name = sanitize(updates.nombre.trim())
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