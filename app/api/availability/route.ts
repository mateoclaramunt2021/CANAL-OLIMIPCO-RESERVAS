import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['INFANTIL_CUMPLE', 'GRUPO_SENTADO', 'GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'] as const
type EventType = (typeof EVENT_TYPES)[number]

const ACTIVE_STATUSES = ['HOLD_BLOCKED', 'CONFIRMED'] as const

const BLOCK_DURATION = 120 // minutos
const MAX_CAPACITY = 100

interface ReservationRow {
  id: string
  fecha: string | null
  hora_inicio: string | null
  hora_fin: string | null
  personas: number | null
  event_type: string | null
  status: string | null
  is_exclusive: boolean | null
}

interface AvailabilityResponse {
  available: boolean
  message: string
  alternatives: string[]
}

// ─── Validation ──────────────────────────────────────────────────────────────

const requestSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Hora debe tener formato HH:mm'),
  personas: z.number().int().min(1, 'Mínimo 1 persona').max(MAX_CAPACITY, `Máximo ${MAX_CAPACITY} personas`),
  event_type: z.enum(EVENT_TYPES, { errorMap: () => ({ message: `Tipo de evento inválido. Valores: ${EVENT_TYPES.join(', ')}` }) }),
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

function checkSlot(
  slotStart: number,
  slotEnd: number,
  eventType: EventType,
  personas: number,
  activeReservations: ReservationRow[]
): { available: boolean; reason?: string } {
  // Regla: INFANTIL_CUMPLE no después de las 20:30
  if (eventType === 'INFANTIL_CUMPLE' && slotStart > toMinutes('20:30')) {
    return { available: false, reason: 'Los eventos infantiles no se permiten después de las 20:30' }
  }

  // Regla: NOCTURNA_EXCLUSIVA solo a partir de las 21:30
  if (eventType === 'NOCTURNA_EXCLUSIVA' && slotStart < toMinutes('21:30')) {
    return { available: false, reason: 'Los eventos nocturnos exclusivos requieren hora a partir de las 21:30' }
  }

  // Filtrar reservas que solapan con el slot
  const solapadas = activeReservations.filter(r => {
    if (!r.hora_inicio) return false
    const rStart = toMinutes(r.hora_inicio)
    const rEnd = r.hora_fin ? toMinutes(r.hora_fin) : rStart + BLOCK_DURATION
    return overlaps(slotStart, slotEnd, rStart, rEnd)
  })

  // Si solicitan NOCTURNA_EXCLUSIVA y hay cualquier solapada → no disponible
  if (eventType === 'NOCTURNA_EXCLUSIVA' && solapadas.length > 0) {
    return { available: false, reason: 'Un evento nocturno exclusivo necesita el bloque sin otras reservas' }
  }

  // Si hay una solapada exclusiva → no disponible
  const hayExclusiva = solapadas.some(r => r.is_exclusive === true)
  if (hayExclusiva) {
    return { available: false, reason: 'Ya existe un evento exclusivo en ese bloque horario' }
  }

  // Verificar capacidad
  const ocupadas = solapadas.reduce((sum, r) => sum + (r.personas ?? 0), 0)
  if (ocupadas + personas > MAX_CAPACITY) {
    return { available: false, reason: `Capacidad insuficiente (${ocupadas}/${MAX_CAPACITY} ocupadas, necesitas ${personas})` }
  }

  return { available: true }
}

// ─── Route handler ───────────────────────────────────────────────────────────

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

  const { fecha, hora, personas, event_type } = parsed.data

  // Consultar reservas activas de esa fecha
  const { data: reservations, error: dbError } = await supabaseAdmin
    .from('reservations')
    .select('id, fecha, hora_inicio, hora_fin, personas, event_type, status, is_exclusive')
    .eq('fecha', fecha)
    .in('status', [...ACTIVE_STATUSES])

  if (dbError) {
    console.error('Supabase error:', dbError)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const activeReservations: ReservationRow[] = (reservations ?? []) as ReservationRow[]

  const slotStart = toMinutes(hora)
  const slotEnd = slotStart + BLOCK_DURATION

  const result = checkSlot(slotStart, slotEnd, event_type, personas, activeReservations)

  if (result.available) {
    return NextResponse.json({
      available: true,
      message: `Disponibilidad confirmada para ${personas} personas.`,
      alternatives: [],
    })
  }

  // Buscar alternativas en incrementos de 30 min
  const deltas = [30, 60, -30, -60, 90, -90, 120, -120, 150, -150, 180, -180]
  const alternatives: string[] = []

  for (const delta of deltas) {
    if (alternatives.length >= 3) break

    const altStart = addMinutes(slotStart, delta)
    const altEnd = altStart + BLOCK_DURATION

    // No proponer horarios fuera de rango razonable (08:00 - 03:00)
    if (altStart < toMinutes('08:00') && altStart > toMinutes('03:00')) continue

    const altResult = checkSlot(altStart, altEnd, event_type, personas, activeReservations)
    if (altResult.available) {
      alternatives.push(toHHmm(altStart))
    }
  }

  return NextResponse.json({
    available: false,
    message: result.reason ?? 'No hay disponibilidad a esa hora.',
    alternatives,
  })
}
