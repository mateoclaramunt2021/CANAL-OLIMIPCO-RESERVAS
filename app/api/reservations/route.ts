import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findBestTable } from '@/core/tables'

// ─── Tipos válidos de evento ─────────────────────────────────────────────────
const VALID_EVENT_TYPES = [
  'RESERVA_NORMAL',
  'INFANTIL_CUMPLE',
  'GRUPO_SENTADO',
  'GRUPO_PICA_PICA',
  'NOCTURNA_EXCLUSIVA',
] as const

const ACTIVE_STATUSES = ['HOLD_BLOCKED', 'CONFIRMED']

// ─── POST: Crear reserva ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const { nombre, telefono, fecha, hora, personas, event_type, zona } = body as {
    nombre?: string
    telefono?: string
    fecha?: string
    hora?: string
    personas?: number
    event_type?: string
    zona?: 'fuera' | 'dentro'
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

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, error: errors.join('. ') }, { status: 400 })
  }

  // Calcular hora_fin (bloque de 2 horas)
  const [h, m] = hora!.split(':').map(Number)
  const finMinutes = h * 60 + m + 120
  const hora_fin = `${String(Math.floor((finMinutes % 1440) / 60)).padStart(2, '0')}:${String(finMinutes % 60).padStart(2, '0')}`

  try {
    // ── Asignar mesa si es RESERVA_NORMAL ──
    let table_id: string | null = null

    if (event_type === 'RESERVA_NORMAL') {
      // Buscar mesas ocupadas en ese slot
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
    const { data, error: dbError } = await supabaseAdmin
      .from('reservations')
      .insert({
        customer_name: nombre!.trim(),
        customer_phone: telefono!.trim(),
        fecha: fecha,
        hora_inicio: hora,
        hora_fin: hora_fin,
        personas: personas,
        event_type: event_type,
        table_id: table_id,
        status: 'HOLD_BLOCKED',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[reservations POST] Supabase error:', dbError)
      return NextResponse.json({ ok: false, error: 'Error al guardar la reserva' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      reservation_id: data.id,
      message: 'Reserva creada',
      table_id: table_id,
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
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const blockKey = searchParams.get('block_key')

  let query = supabaseAdmin
    .from('reservations')
    .select(`
      id, event_type, start_datetime, status, total_amount, deposit_amount,
      clients (name, phone)
    `)

  if (status) query = query.eq('status', status)
  if (startDate) query = query.gte('start_datetime', startDate)
  if (blockKey) query = query.eq('block_key', blockKey)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}