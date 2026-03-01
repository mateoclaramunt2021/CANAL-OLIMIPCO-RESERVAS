import { NextRequest, NextResponse } from 'next/server'
import { generateDishSummary } from '@/lib/dish-summary'

// ─── GET: Generar resumen de selección de platos ────────────────────────────
// Query: ?reservation_id=xxx
// → Devuelve HTML formateado como tabla resumen

export async function GET(req: NextRequest) {
  const reservationId = req.nextUrl.searchParams.get('reservation_id')

  if (!reservationId) {
    return NextResponse.json({ error: 'reservation_id requerido' }, { status: 400 })
  }

  const result = await generateDishSummary(reservationId)

  if (!result) {
    return NextResponse.json({ error: 'No hay selecciones de platos' }, { status: 404 })
  }

  return NextResponse.json(result)
}
