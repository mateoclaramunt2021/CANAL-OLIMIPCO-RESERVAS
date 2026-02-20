import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // ── Verify webhook secret ──
  const secret = process.env.BAPI_WEBHOOK_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { call_id, status, transcript } = body as {
    call_id?: string
    status?: string
    transcript?: string
  }

  if (!call_id || typeof call_id !== 'string') {
    return NextResponse.json({ error: 'call_id is required' }, { status: 400 })
  }

  await supabaseAdmin
    .from('call_logs')
    .update({
      transcript,
      summary: status || 'updated',
    })
    .eq('id', call_id) // Asumir que call_id es el id de call_logs

  return NextResponse.json({ received: true })
}