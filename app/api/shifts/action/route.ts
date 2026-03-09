import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildUrl } from '@/lib/url'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const action = form.get('_action') as string
    const week = form.get('week') as string
    const tab = form.get('tab') as string || 'horarios'

    const redirect = (msg?: string, err?: string) => {
      const base = `/schedules?tab=${tab}&week=${week || ''}`
      const qs = err ? `&error=${encodeURIComponent(err)}` : msg ? `&ok=${encodeURIComponent(msg)}` : ''
      return NextResponse.redirect(buildUrl(base + qs, req))
    }

    if (action === 'create') {
      const employee_id = form.get('employee_id') as string
      const day_of_week = Number(form.get('day_of_week'))
      const start_time = form.get('start_time') as string
      const end_time = form.get('end_time') as string
      const notes = form.get('notes') as string || null

      if (!employee_id || !week || day_of_week === undefined || !start_time || !end_time) {
        return redirect(undefined, 'Faltan campos obligatorios')
      }

      const { error } = await supabaseAdmin
        .from('shifts')
        .upsert(
          { employee_id, week_start: week, day_of_week, start_time, end_time, notes },
          { onConflict: 'employee_id,week_start,day_of_week' }
        )

      if (error) return redirect(undefined, error.message)
      return redirect('Turno guardado')
    }

    if (action === 'delete') {
      const id = form.get('id') as string
      if (!id) return redirect(undefined, 'ID obligatorio')

      const { error } = await supabaseAdmin.from('shifts').delete().eq('id', id)
      if (error) return redirect(undefined, error.message)
      return redirect('Turno eliminado')
    }

    return redirect(undefined, 'Acción no válida')
  } catch (err: any) {
    console.error('[shifts/action]', err)
    return NextResponse.redirect(buildUrl('/schedules?error=' + encodeURIComponent(err.message), req))
  }
}
