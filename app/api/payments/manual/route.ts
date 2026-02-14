import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  reservation_id: z.string(),
  method: z.enum(['transferencia', 'efectivo']),
  amount: z.number().positive()
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.parse(body)

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .insert({
        reservation_id: parsed.reservation_id,
        method: parsed.method,
        amount: parsed.amount,
        status: 'completed'
      })
      .select()
      .single()

    if (parsed.method === 'efectivo' || parsed.method === 'transferencia') {
      await supabaseAdmin
        .from('reservations')
        .update({ deposit_paid: true, status: 'confirmed' })
        .eq('id', parsed.reservation_id)
    }

    return NextResponse.json({ payment_id: payment.id, status: 'completed' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}