import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ─── GET: Leer settings ─────────────────────────────────────────────────────
// ?keys=WHATSAPP_TOKEN,WHATSAPP_PHONE_NUMBER_ID,...
export async function GET(req: NextRequest) {
  try {
    const keysParam = req.nextUrl.searchParams.get('keys')

    let query = supabaseAdmin.from('settings').select('key, value, updated_at')
    if (keysParam) {
      const keys = keysParam.split(',').map(k => k.trim())
      query = query.in('key', keys)
    }

    const { data, error } = await query
    if (error) {
      console.error('[settings] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert to key-value map
    const settings: Record<string, string> = {}
    for (const row of data || []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ ok: true, settings })
  } catch (err) {
    console.error('[settings] GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── PUT: Guardar settings ──────────────────────────────────────────────────
// Body: { settings: { key1: value1, key2: value2, ... } }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const entries = body.settings as Record<string, string>

    if (!entries || typeof entries !== 'object') {
      return NextResponse.json({ error: 'Se requiere { settings: { key: value } }' }, { status: 400 })
    }

    const rows = Object.entries(entries).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) {
      console.error('[settings] PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[settings] PUT error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
