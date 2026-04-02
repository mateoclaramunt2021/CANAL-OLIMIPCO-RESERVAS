import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildUrl, getBaseUrl } from '@/lib/url'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const action = form.get('_action') as string
    const id = form.get('id') as string

    if (!id) {
      return NextResponse.redirect(buildUrl('/reservations?error=ID+obligatorio', req))
    }

    const baseUrl = getBaseUrl(req)

    const redirect = (msg?: string, err?: string) => {
      const base = `/reservations/${id}`
      const qs = err ? `?error=${encodeURIComponent(err)}` : msg ? `?ok=${encodeURIComponent(msg)}` : ''
      return NextResponse.redirect(buildUrl(base + qs, req))
    }

    if (action === 'status') {
      const status = form.get('status') as string
      const updatePayload: Record<string, unknown> = { status }
      
      const res = await fetch(`${baseUrl}/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!res.ok) {
        const data = await res.json()
        return redirect(undefined, data.error || 'Error actualizando estado')
      }

      const statusLabels: Record<string, string> = {
        HOLD_BLOCKED: 'Pago Pendiente', CONFIRMED: 'Confirmada', CANCELED: 'Cancelada',
        COMPLETED: 'Cerrada', NO_SHOW: 'No Show',
      }
      return redirect(`Estado → ${statusLabels[status] || status}`)
    }

    if (action === 'call') {
      const phone = form.get('phone') as string
      if (!phone) return redirect(undefined, 'Teléfono requerido')

      const res = await fetch(`${baseUrl}/api/actions/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, reservation_id: id }),
      })

      if (!res.ok) return redirect(undefined, 'Error iniciando llamada')
      return redirect('Llamada VAPI iniciada')
    }

    if (action === 'email') {
      const type = form.get('type') as string || 'auto'
      const res = await fetch(`${baseUrl}/api/reservations/${id}/resend-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()
      if (res.ok && data.ok) return redirect(data.message || 'Email enviado')
      return redirect(undefined, data.error || 'Error al enviar email')
    }

    if (action === 'edit') {
      // Build update payload from form fields
      const updatePayload: Record<string, unknown> = {}
      const fields = ['customer_name', 'customer_phone', 'customer_email', 'event_type', 'fecha', 'hora_inicio', 'table_id', 'menu_code', 'canceled_reason', 'notas']
      for (const f of fields) {
        const val = form.get(f) as string | null
        if (val !== null && val !== '') updatePayload[f] = val
      }
      // Numeric fields
      const personas = form.get('personas') as string | null
      if (personas && !isNaN(Number(personas))) updatePayload.personas = Number(personas)
      const totalAmount = form.get('total_amount') as string | null
      if (totalAmount && !isNaN(Number(totalAmount))) updatePayload.total_amount = Number(totalAmount)
      const depositAmount = form.get('deposit_amount') as string | null
      if (depositAmount && !isNaN(Number(depositAmount))) updatePayload.deposit_amount = Number(depositAmount)

      // Handle empty email (send empty string to clear)
      const email = form.get('customer_email') as string | null
      if (email !== null && email === '') updatePayload.customer_email = ''

      if (Object.keys(updatePayload).length === 0) {
        return redirect(undefined, 'No hay cambios para guardar')
      }

      const res = await fetch(`${baseUrl}/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!res.ok) {
        const data = await res.json()
        return redirect(undefined, data.error || 'Error al guardar cambios')
      }

      return redirect('Reserva actualizada correctamente')
    }

    return redirect(undefined, 'Acción no válida')
  } catch (err: any) {
    console.error('[reservations/action]', err)
    const id = (await req.formData().catch(() => null))?.get('id') || ''
    return NextResponse.redirect(buildUrl(`/reservations/${id}?error=${encodeURIComponent(err.message)}`, req))
  }
}
