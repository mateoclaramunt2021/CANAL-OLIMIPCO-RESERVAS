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

    if (!nombre || !telefono || !fecha || !hora) {
      return NextResponse.redirect(buildUrl('/reservations/new?error=Faltan+campos+obligatorios', req))
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
      return NextResponse.redirect(buildUrl(`/reservations/${data.reservation_id}`, req))
    } else {
      return NextResponse.redirect(buildUrl(`/reservations/new?error=${encodeURIComponent(data.error || 'Error creando reserva')}`, req))
    }
  } catch (err: any) {
    console.error('[API reservations form]', err)
    return NextResponse.redirect(buildUrl(`/reservations/new?error=${encodeURIComponent(err.message || 'Error interno')}`, req))
  }
}
