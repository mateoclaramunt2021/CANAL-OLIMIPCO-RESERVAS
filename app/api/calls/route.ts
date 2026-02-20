import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ─── GET: Obtener historial de llamadas VAPI ────────────────────────────────
// Devuelve las últimas llamadas ordenadas por fecha descendente.
// Soporta filtros opcionales: ?limit=20&status=completed&from=2026-01-01

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const status = searchParams.get('status')
    const from = searchParams.get('from')

    let query = supabaseAdmin
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('created_at', from)

    const { data, error } = await query

    if (error) {
      console.error('[calls GET] Supabase error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, calls: data || [] })
  } catch (err: any) {
    console.error('[calls GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
