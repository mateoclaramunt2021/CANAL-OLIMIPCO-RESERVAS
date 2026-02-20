import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/clock?employee_id=xxx&date=2026-02-20 — get clock records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const date = searchParams.get('date') // YYYY-MM-DD
    const limit = Number(searchParams.get('limit') || '50')

    let query = supabaseAdmin
      .from('clock_records')
      .select('*, employees(name, role)')
      .order('clock_in', { ascending: false })
      .limit(limit)

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (date) {
      // Filter by date — clock_in between start and end of day
      query = query.gte('clock_in', `${date}T00:00:00`).lt('clock_in', `${date}T23:59:59`)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[API clock GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/clock — clock in
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employee_id, pin } = body

    if (!employee_id) {
      return NextResponse.json({ error: 'Empleado obligatorio' }, { status: 400 })
    }

    // Verify employee exists & optional PIN check
    const { data: emp, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, name, pin, active')
      .eq('id', employee_id)
      .single()

    if (empErr || !emp) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }
    if (!emp.active) {
      return NextResponse.json({ error: 'Empleado no activo' }, { status: 403 })
    }
    if (emp.pin && emp.pin !== pin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 403 })
    }

    // Check if already clocked in (no clock_out yet)
    const { data: openRecord } = await supabaseAdmin
      .from('clock_records')
      .select('id, clock_in')
      .eq('employee_id', employee_id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single()

    if (openRecord) {
      // Already clocked in — do clock out instead
      const { data, error } = await supabaseAdmin
        .from('clock_records')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', openRecord.id)
        .select('*, employees(name, role)')
        .single()

      if (error) throw error
      return NextResponse.json({ action: 'clock_out', record: data })
    }

    // Clock in
    const { data, error } = await supabaseAdmin
      .from('clock_records')
      .insert({
        employee_id,
        clock_in: new Date().toISOString(),
      })
      .select('*, employees(name, role)')
      .single()

    if (error) throw error
    return NextResponse.json({ action: 'clock_in', record: data }, { status: 201 })
  } catch (err: any) {
    console.error('[API clock POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
