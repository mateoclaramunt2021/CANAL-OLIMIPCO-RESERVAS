// ─── API: Descargar PDF de selección de platos ──────────────────────────────
//
// GET /api/menu-selection/pdf?reservation_id=xxx
// Devuelve el PDF como archivo descargable.

import { NextRequest, NextResponse } from 'next/server'
import { generateDishPdf } from '@/lib/pdf-generator'

export async function GET(req: NextRequest) {
  try {
    const reservationId = req.nextUrl.searchParams.get('reservation_id')
    if (!reservationId) {
      return NextResponse.json({ error: 'reservation_id requerido' }, { status: 400 })
    }

    const pdfBuffer = await generateDishPdf(reservationId)
    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'No se encontró la reserva o no hay selecciones de platos' },
        { status: 404 }
      )
    }

    // Build a filename: platos-CO-XXXX.pdf
    // We need the reservation number for the filename
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data: res } = await supabaseAdmin
      .from('reservations')
      .select('reservation_number')
      .eq('id', reservationId)
      .single()

    const ref = res?.reservation_number || reservationId.substring(0, 8)
    const filename = `platos-${ref}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('[pdf] Error generating PDF:', err)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}
