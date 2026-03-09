import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['HOLD_BLOCKED', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW']).optional(),
  personas: z.number().int().positive().optional(),
  customer_name: z.string().min(1).optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  table_id: z.string().optional().nullable(),
  event_type: z.enum(['RESERVA_NORMAL', 'INFANTIL_CUMPLE', 'GRUPO_SENTADO', 'GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA']).optional(),
  menu_code: z.string().optional(),
  menu_payload: z.record(z.string(), z.any()).optional(),
  canceled_reason: z.string().optional(),
  total_amount: z.number().min(0).optional(),
  deposit_amount: z.number().min(0).optional(),
  notas: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Obtener reserva
  const { data: reservation, error: resErr } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (resErr || !reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  // Obtener mensajes, llamadas y pagos en paralelo
  const [messagesRes, callsRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('*')
      .eq('reservation_id', id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('call_logs')
      .select('*')
      .eq('reservation_id', id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('payments')
      .select('*')
      .eq('reservation_id', id)
      .order('created_at', { ascending: true }),
  ])

  return NextResponse.json({
    ...reservation,
    messages: messagesRes.data || [],
    call_logs: callsRes.data || [],
    payments: paymentsRes.data || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const parsed = updateSchema.parse(body)

    if (Object.keys(parsed).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    // Build actual DB updates
    const dbUpdates: Record<string, unknown> = { ...parsed }

    // If hora_inicio changes, recalculate hora_fin (2h block)
    if (parsed.hora_inicio) {
      const timePart = parsed.hora_inicio.substring(0, 5) // '14:00' from '14:00:00'
      const [h, m] = timePart.split(':').map(Number)
      const finMin = h * 60 + m + 120
      dbUpdates.hora_inicio = timePart + ':00'
      dbUpdates.hora_fin = `${String(Math.floor((finMin % 1440) / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}:00`
    }

    // Empty email → null
    if ('customer_email' in parsed && !parsed.customer_email) {
      dbUpdates.customer_email = null
    }

    const { error } = await supabaseAdmin
      .from('reservations')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('[reservations/[id] PATCH] Supabase error:', error)
      throw error
    }

    // Return updated reservation
    const { data: updated } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({ updated: true, reservation: updated })
  } catch (error: any) {
    console.error('[reservations/[id] PATCH]', error)
    const msg = error?.issues ? error.issues.map((i: any) => i.message).join(', ') : 'Error al actualizar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}