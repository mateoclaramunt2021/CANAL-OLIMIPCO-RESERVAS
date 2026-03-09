import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const action = form.get('_action') as string
    const id = form.get('id') as string

    if (!id) {
      return NextResponse.redirect(new URL('/reservations?error=ID+obligatorio', req.url))
    }

    const redirect = (msg?: string, err?: string) => {
      const base = `/reservations/${id}`
      const qs = err ? `?error=${encodeURIComponent(err)}` : msg ? `?ok=${encodeURIComponent(msg)}` : ''
      return NextResponse.redirect(new URL(base + qs, req.url))
    }

    if (action === 'status') {
      const status = form.get('status') as string
      const updatePayload: Record<string, unknown> = { status }
      
      const res = await fetch(new URL(`/api/reservations/${id}`, req.url).toString(), {
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

    if (action === 'whatsapp') {
      const message = form.get('message') as string
      const phone = form.get('phone') as string
      if (!message || !phone) return redirect(undefined, 'Mensaje y teléfono requeridos')

      const res = await fetch(new URL('/api/actions/whatsapp/send', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message, reservation_id: id }),
      })

      if (!res.ok) return redirect(undefined, 'Error enviando WhatsApp')
      return redirect('WhatsApp enviado')
    }

    if (action === 'call') {
      const phone = form.get('phone') as string
      if (!phone) return redirect(undefined, 'Teléfono requerido')

      const res = await fetch(new URL('/api/actions/call', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, reservation_id: id }),
      })

      if (!res.ok) return redirect(undefined, 'Error iniciando llamada')
      return redirect('Llamada VAPI iniciada')
    }

    if (action === 'email') {
      const type = form.get('type') as string || 'auto'
      const res = await fetch(new URL(`/api/reservations/${id}/resend-email`, req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()
      if (res.ok && data.ok) return redirect(data.message || 'Email enviado')
      return redirect(undefined, data.error || 'Error al enviar email')
    }

    return redirect(undefined, 'Acción no válida')
  } catch (err: any) {
    console.error('[reservations/action]', err)
    const id = (await req.formData().catch(() => null))?.get('id') || ''
    return NextResponse.redirect(new URL(`/reservations/${id}?error=${encodeURIComponent(err.message)}`, req.url))
  }
}
