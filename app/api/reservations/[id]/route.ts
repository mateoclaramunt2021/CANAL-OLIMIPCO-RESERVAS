import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['HOLD_BLOCKED', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW']).optional(),
  personas: z.number().int().positive().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  menu_code: z.string().optional(),
  menu_payload: z.record(z.string(), z.any()).optional(),
  canceled_reason: z.string().optional(),
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

    const { error } = await supabaseAdmin
      .from('reservations')
      .update(parsed)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error('[reservations/[id] PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}