import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/shifts?week=2026-02-16 — get shifts for a week
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const week = searchParams.get('week') // Monday of the week YYYY-MM-DD

    let query = supabaseAdmin
      .from('shifts')
      .select('*, employees(name, role)')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (week) {
      query = query.eq('week_start', week)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[API shifts GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/shifts — create or upsert shift
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employee_id, week_start, day_of_week, start_time, end_time, notes } = body

    if (!employee_id || !week_start || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .upsert(
        {
          employee_id,
          week_start,
          day_of_week: Number(day_of_week),
          start_time,
          end_time,
          notes: notes || null,
        },
        { onConflict: 'employee_id,week_start,day_of_week' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[API shifts POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/shifts?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID obligatorio' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API shifts DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
