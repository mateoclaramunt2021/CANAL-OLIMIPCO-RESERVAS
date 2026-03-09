import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const employee_id = form.get('employee_id') as string
    const pin = form.get('pin') as string || undefined

    if (!employee_id) {
      return NextResponse.redirect(new URL('/schedules?tab=fichar&error=Empleado+obligatorio', req.url))
    }

    // Verify employee
    const { data: emp, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, name, pin, active')
      .eq('id', employee_id)
      .single()

    if (empErr || !emp) {
      return NextResponse.redirect(new URL('/schedules?tab=fichar&error=Empleado+no+encontrado', req.url))
    }
    if (!emp.active) {
      return NextResponse.redirect(new URL('/schedules?tab=fichar&error=Empleado+no+activo', req.url))
    }
    if (emp.pin && emp.pin !== pin) {
      return NextResponse.redirect(new URL('/schedules?tab=fichar&error=PIN+incorrecto', req.url))
    }

    // Check open clock record
    const { data: openRecord } = await supabaseAdmin
      .from('clock_records')
      .select('id, clock_in')
      .eq('employee_id', employee_id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single()

    if (openRecord) {
      // Clock OUT
      await supabaseAdmin
        .from('clock_records')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', openRecord.id)

      const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      return NextResponse.redirect(
        new URL(`/schedules?tab=fichar&ok=${encodeURIComponent(`🏠 ${emp.name} — Salida registrada a las ${time}`)}`, req.url)
      )
    }

    // Clock IN
    await supabaseAdmin
      .from('clock_records')
      .insert({ employee_id, clock_in: new Date().toISOString() })

    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    return NextResponse.redirect(
      new URL(`/schedules?tab=fichar&ok=${encodeURIComponent(`✅ ${emp.name} — Entrada registrada a las ${time}`)}`, req.url)
    )
  } catch (err: any) {
    console.error('[clock/action]', err)
    return NextResponse.redirect(new URL('/schedules?tab=fichar&error=' + encodeURIComponent(err.message), req.url))
  }
}
