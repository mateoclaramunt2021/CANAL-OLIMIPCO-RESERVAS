import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateSchema = z.object({
  guests_confirmed: z.number().int().positive().optional(),
  menu_payload: z.record(z.string(), z.any()).optional(),
  status: z.enum(['pending_payment', 'confirmed', 'pending_final', 'closed', 'canceled', 'no_show']).optional()
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select(`
      *,
      clients (name, phone),
      messages (*),
      call_logs (*),
      payments (*)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const parsed = updateSchema.parse(body)

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update(parsed)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}