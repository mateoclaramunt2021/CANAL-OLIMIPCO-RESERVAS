import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { callProvider } from '@/lib/providers'
import { z } from 'zod'

const schema = z.object({ reservation_id: z.string(), phone: z.string() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reservation_id, phone } = schema.parse(body)

    await callProvider.makeCall(phone)

    await supabaseAdmin
      .from('call_logs')
      .insert({
        reservation_id,
        summary: 'BAPI call initiated',
      })

    return NextResponse.json({ called: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}