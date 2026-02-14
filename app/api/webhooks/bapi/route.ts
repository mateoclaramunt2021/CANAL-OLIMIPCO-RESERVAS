import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { call_id, status, transcript } = body

  await supabaseAdmin
    .from('call_logs')
    .update({
      status,
      transcript,
      raw_payload: body
    })
    .eq('id', call_id) // Asumir que call_id es el id de call_logs

  return NextResponse.json({ received: true })
}