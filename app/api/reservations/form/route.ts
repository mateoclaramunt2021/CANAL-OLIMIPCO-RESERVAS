import { NextRequest, NextResponse } from 'next/server'
import { buildUrl, getBaseUrl } from '@/lib/url'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const nombre = (form.get('nombre') as string)?.trim()
    const telefono = (form.get('telefono') as string)?.trim()
    const fecha = form.get('fecha') as string
    const hora = form.get('hora') as string
    const personas = parseInt(form.get('personas') as string) || 2
    const eventType = form.get('event_type') as string || 'RESERVA_NORMAL'
    const zona = form.get('zona') as string || ''
    const menuCode = form.get('menu_code') as string || ''
    const source = form.get('source') as string || 'admin'

    const isPublic = source === 'public'
    const errorPath = isPublic ? '/reservar' : '/reservations/new'

    if (!nombre || !telefono || !fecha || !hora) {
      return NextResponse.redirect(buildUrl(`${errorPath}?error=Faltan+campos+obligatorios`, req))
    }

    const phone = telefono.startsWith('+') ? telefono : `+34${telefono.replace(/\s/g, '')}`

    const body: Record<string, unknown> = {
      nombre,
      telefono: phone,
      fecha,
      hora,
      personas,
      event_type: eventType,
    }
    if (zona) body.zona = zona
    if (menuCode && eventType !== 'RESERVA_NORMAL') body.menu_code = menuCode

    // Call internal API
    const baseUrl = getBaseUrl(req)
    const res = await fetch(`${baseUrl}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.ok && data.reservation_id) {
      if (isPublic) {
        // Redirect to public confirmation page
        const params = new URLSearchParams({ nombre })
        if (data.reservation_number) params.set('ref', data.reservation_number)
        if (data.total_amount) params.set('total', String(data.total_amount))
        if (data.deposit_amount) params.set('deposit', String(data.deposit_amount))
        return NextResponse.redirect(buildUrl(`/reservar/gracias?${params.toString()}`, req))
      } else {
        return NextResponse.redirect(buildUrl(`/reservations/${data.reservation_id}`, req))
      }
    } else {
      return NextResponse.redirect(buildUrl(`${errorPath}?error=${encodeURIComponent(data.error || 'Error creando reserva')}`, req))
    }
  } catch (err: any) {
    console.error('[API reservations form]', err)
    const source = 'admin' // fallback
    const errorPath = '/reservations/new'
    return NextResponse.redirect(buildUrl(`${errorPath}?error=${encodeURIComponent(err.message || 'Error interno')}`, req))
  }
}
