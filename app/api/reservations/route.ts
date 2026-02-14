import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ─── Tipos válidos de evento ─────────────────────────────────────────────────
const VALID_EVENT_TYPES = [
  'RESERVA_NORMAL',
  'INFANTIL_CUMPLE',
  'GRUPO_SENTADO',
  'GRUPO_PICA_PICA',
  'NOCTURNA_EXCLUSIVA',
] as const

// ─── POST: Crear reserva (simple y directo) ─────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Parsear body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const { nombre, telefono, fecha, hora, personas, event_type } = body as {
    nombre?: string
    telefono?: string
    fecha?: string
    hora?: string
    personas?: number
    event_type?: string
  }

  // 2. Validaciones
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

  // 3. Calcular hora_fin (bloque de 2 horas)
  const [h, m] = hora!.split(':').map(Number)
  const finMinutes = h * 60 + m + 120
  const hora_fin = `${String(Math.floor((finMinutes % 1440) / 60)).padStart(2, '0')}:${String(finMinutes % 60).padStart(2, '0')}`

  // 4. Insertar en Supabase
  try {
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
        status: 'HOLD_BLOCKED',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[reservations POST] Supabase error:', dbError)
      return NextResponse.json({ ok: false, error: 'Error al guardar la reserva en base de datos' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      reservation_id: data.id,
      message: 'Reserva creada',
    })
  } catch (err) {
    console.error('[reservations POST] Unexpected error:', err)
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