import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { ALL_TABLES, findBestTable, MAX_EVENT_CAPACITY } from '@/core/tables'

// ─── Types ───────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['RESERVA_NORMAL', 'INFANTIL_CUMPLE', 'GRUPO_SENTADO', 'GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'] as const
type EventType = (typeof EVENT_TYPES)[number]

const ACTIVE_STATUSES = ['HOLD_BLOCKED', 'CONFIRMED'] as const

const BLOCK_DURATION = 120 // minutos

interface ReservationRow {
  id: string
  fecha: string | null
  hora_inicio: string | null
  hora_fin: string | null
  personas: number | null
  event_type: string | null
  status: string | null
  is_exclusive: boolean | null
  table_id: string | null
}

interface AvailabilityResponse {
  available: boolean
  message: string
  alternatives: string[]
  table?: { id: string; zone: string; capacity: number } | null
}

// ─── Validation ──────────────────────────────────────────────────────────────

const requestSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Hora debe tener formato HH:mm'),
  personas: z.number().int().min(1, 'Mínimo 1 persona'),
  event_type: z.enum(EVENT_TYPES, { error: `Tipo de evento inválido. Valores: ${EVENT_TYPES.join(', ')}` }),
  zona: z.enum(['fuera', 'dentro']).optional(),
})

// ─── Utilities ───────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  const clean = hhmm.substring(0, 5) // maneja "HH:mm:ss" → "HH:mm"
  const [h, m] = clean.split(':').map(Number)
  return h * 60 + m
}

function toHHmm(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440 // mod 24h, evita negativos
  const h = Math.floor(norm / 60)
  const m = norm % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addMinutes(startMinutes: number, delta: number): number {
  return ((startMinutes + delta) % 1440 + 1440) % 1440
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

// ─── Core availability check ────────────────────────────────────────────────
// RESERVA_NORMAL → busca una mesa libre (28 mesas fijas)
// Eventos → usa la capacidad extra de 100 personas (separada de las mesas)

function getOverlapping(slotStart: number, slotEnd: number, reservations: ReservationRow[]): ReservationRow[] {
  return reservations.filter(r => {
    if (!r.hora_inicio) return false
    const rStart = toMinutes(r.hora_inicio)
    const rEnd = r.hora_fin ? toMinutes(r.hora_fin) : rStart + BLOCK_DURATION
    return overlaps(slotStart, slotEnd, rStart, rEnd)
  })
}

function checkSlot(
  slotStart: number,
  slotEnd: number,
  eventType: EventType,
  personas: number,
  activeReservations: ReservationRow[],
  preferZone?: 'fuera' | 'dentro'
): { available: boolean; reason?: string; table?: { id: string; zone: string; capacity: number } | null } {

  // Regla horaria: INFANTIL_CUMPLE no después de las 20:30
  if (eventType === 'INFANTIL_CUMPLE' && slotStart > toMinutes('20:30')) {
    return { available: false, reason: 'Los eventos infantiles no se permiten después de las 20:30' }
  }

  // Regla horaria: NOCTURNA_EXCLUSIVA solo a partir de las 21:30
  if (eventType === 'NOCTURNA_EXCLUSIVA' && slotStart < toMinutes('21:30')) {
    return { available: false, reason: 'Los eventos nocturnos exclusivos requieren hora a partir de las 21:30' }
  }

  const solapadas = getOverlapping(slotStart, slotEnd, activeReservations)

  // Si hay una solapada exclusiva → nada disponible
  const hayExclusiva = solapadas.some(r => r.is_exclusive === true)
  if (hayExclusiva) {
    return { available: false, reason: 'Ya existe un evento exclusivo en ese bloque horario' }
  }

  // ── RESERVA_NORMAL → buscar mesa física ──
  if (eventType === 'RESERVA_NORMAL') {
    const occupiedTableIds = solapadas
      .map(r => r.table_id)
      .filter((id): id is string => id != null)

    const mesa = findBestTable(personas, occupiedTableIds, preferZone)
    if (!mesa) {
      return {
        available: false,
        reason: `No hay mesa disponible para ${personas} personas${preferZone ? ` en zona ${preferZone}` : ''}`,
      }
    }

    return { available: true, table: { id: mesa.id, zone: mesa.zone, capacity: mesa.capacity } }
  }

  // ── EVENTOS → capacidad extra de 100 personas ──

  // NOCTURNA_EXCLUSIVA necesita bloque vacío (ni mesas ni eventos)
  if (eventType === 'NOCTURNA_EXCLUSIVA' && solapadas.length > 0) {
    return { available: false, reason: 'Un evento nocturno exclusivo necesita el bloque sin otras reservas' }
  }

  // Contar solo personas de eventos (no las de mesas)
  const eventReservations = solapadas.filter(r => r.event_type !== 'RESERVA_NORMAL')
  const eventOccupied = eventReservations.reduce((sum, r) => sum + (r.personas ?? 0), 0)

  if (eventOccupied + personas > MAX_EVENT_CAPACITY) {
    return {
      available: false,
      reason: `Capacidad de eventos insuficiente (${eventOccupied}/${MAX_EVENT_CAPACITY} ocupadas, necesitas ${personas})`,
    }
  }

  return { available: true, table: null }
}

// ─── GET: health-check ───────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'availability endpoint alive',
    howTo: 'Use POST with {fecha,hora,personas,event_type,zona?}',
    examples: [
      { fecha: '2026-03-15', hora: '14:00', personas: 2, event_type: 'RESERVA_NORMAL', zona: 'fuera' },
      { fecha: '2026-03-15', hora: '20:00', personas: 30, event_type: 'GRUPO_SENTADO' },
    ],
    capacidad: {
      mesas: '28 mesas (98 plazas) — para RESERVA_NORMAL',
      eventos: '100 personas extra — para eventos (INFANTIL_CUMPLE, GRUPO_SENTADO, etc.)',
      total_maximo: '~198 personas simultáneas',
    },
  })
}

// ─── POST: availability check ────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AvailabilityResponse | { error: string }>> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => i.message).join('. ')
    return NextResponse.json({ error: `Campos obligatorios faltantes: ${issues}` }, { status: 400 })
  }

  const { fecha, hora, personas, event_type, zona } = parsed.data

  try {
    // Consultar reservas activas de esa fecha
    const { data: reservations, error: dbError } = await supabaseAdmin
      .from('reservations')
      .select('id, fecha, hora_inicio, hora_fin, personas, event_type, status, is_exclusive, table_id')
      .eq('fecha', fecha)
      .in('status', [...ACTIVE_STATUSES])

    if (dbError) {
      console.error('[availability] Supabase error:', dbError)
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    const activeReservations: ReservationRow[] = (reservations ?? []) as ReservationRow[]

    const slotStart = toMinutes(hora)
    const slotEnd = slotStart + BLOCK_DURATION

    const result = checkSlot(slotStart, slotEnd, event_type, personas, activeReservations, zona)

    if (result.available) {
      return NextResponse.json({
        available: true,
        message: event_type === 'RESERVA_NORMAL'
          ? `Mesa disponible para ${personas} personas${result.table ? ` (${result.table.zone}, mesa ${result.table.id}, ${result.table.capacity} plazas)` : ''}.`
          : `Disponibilidad confirmada para ${personas} personas (evento).`,
        alternatives: [],
        table: result.table || null,
      })
    }

    // Buscar alternativas: +30, +60, -30, -60, +90, -90 → primeras 3 válidas
    const deltas = [30, 60, -30, -60, 90, -90]
    const alternatives: string[] = []

    for (const delta of deltas) {
      if (alternatives.length >= 3) break

      const altStart = addMinutes(slotStart, delta)
      const altEnd = altStart + BLOCK_DURATION

      const altResult = checkSlot(altStart, altEnd, event_type, personas, activeReservations, zona)
      if (altResult.available) {
        alternatives.push(toHHmm(altStart))
      }
    }

    return NextResponse.json({
      available: false,
      message: result.reason ?? 'No hay disponibilidad a esa hora.',
      alternatives,
    })
  } catch (err) {
    console.error('[availability] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
