import { NextRequest, NextResponse } from 'next/server'
import { ALL_TABLES, getTableSummary, findBestTable, findTableCombination } from '@/core/tables'
import { supabaseAdmin } from '@/lib/supabase'

// ─── GET: Consultar mesas ────────────────────────────────────────────────────
// Sin params → resumen completo
// ?fecha=YYYY-MM-DD&hora=HH:mm → mesas disponibles en ese slot
// ?fecha=YYYY-MM-DD&hora=HH:mm&personas=4&zona=fuera → mejor mesa para esa reserva

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get('fecha')
  const hora = searchParams.get('hora')
  const personas = searchParams.get('personas')
  const zona = searchParams.get('zona') as 'fuera' | 'dentro' | null

  // Sin fecha/hora → devolver resumen del inventario
  if (!fecha || !hora) {
    return NextResponse.json({
      ok: true,
      tables: ALL_TABLES,
      summary: getTableSummary(),
    })
  }

  // Validar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ ok: false, error: 'fecha debe tener formato YYYY-MM-DD' }, { status: 400 })
  }
  if (!/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ ok: false, error: 'hora debe tener formato HH:mm' }, { status: 400 })
  }

  try {
    // Calcular hora_fin (bloque de 2h)
    const [h, m] = hora.split(':').map(Number)
    const finMin = h * 60 + m + 120
    const hora_fin = `${String(Math.floor((finMin % 1440) / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`

    // Buscar reservas activas que solapan con ese horario
    const { data: reservations, error: dbError } = await supabaseAdmin
      .from('reservations')
      .select('id, table_id, hora_inicio, hora_fin, personas, event_type, status')
      .eq('fecha', fecha)
      .in('status', ['HOLD_BLOCKED', 'CONFIRMED'])

    if (dbError) {
      console.error('[tables] Supabase error:', dbError)
      return NextResponse.json({ ok: false, error: 'Error consultando base de datos' }, { status: 500 })
    }

    // Filtrar las que realmente solapan con el slot pedido
    const slotStart = h * 60 + m
    const slotEnd = slotStart + 120
    const overlapping = (reservations ?? []).filter((r: any) => {
      if (!r.hora_inicio) return false
      const [rh, rm] = r.hora_inicio.split(':').map(Number)
      const rStart = rh * 60 + rm
      const rEnd = r.hora_fin
        ? (() => { const [eh, em] = r.hora_fin.split(':').map(Number); return eh * 60 + em })()
        : rStart + 120
      return slotStart < rEnd && slotEnd > rStart
    })

    // IDs de mesas ocupadas
    const occupiedTableIds = overlapping
      .map((r: any) => r.table_id)
      .filter((id: string | null) => id != null) as string[]

    // Mesas libres
    const freeTables = ALL_TABLES.filter(t => !occupiedTableIds.includes(t.id))
    const freeByZone = {
      fuera: freeTables.filter(t => t.zone === 'fuera'),
      dentro: freeTables.filter(t => t.zone === 'dentro'),
    }

    // Si piden recomendación para X personas
    if (personas) {
      const numPersonas = parseInt(personas, 10)
      if (isNaN(numPersonas) || numPersonas < 1) {
        return NextResponse.json({ ok: false, error: 'personas debe ser un número mayor a 0' }, { status: 400 })
      }

      const bestSingle = findBestTable(numPersonas, occupiedTableIds, zona || undefined)
      const bestCombo = !bestSingle ? findTableCombination(numPersonas, occupiedTableIds, zona || undefined) : null

      return NextResponse.json({
        ok: true,
        fecha,
        hora,
        hora_fin,
        personas: numPersonas,
        zona_preferida: zona || 'sin preferencia',
        recomendacion: bestSingle
          ? { tipo: 'mesa_unica', mesa: bestSingle }
          : bestCombo
            ? { tipo: 'combinacion', mesas: bestCombo, plazas_total: bestCombo.reduce((s, t) => s + t.capacity, 0) }
            : { tipo: 'sin_disponibilidad', mensaje: 'No hay mesas suficientes para ese número de personas en ese horario' },
        mesas_libres: freeTables.length,
        detalle_libres: freeByZone,
      })
    }

    // Sin personas → devolver todas las mesas libres del slot
    return NextResponse.json({
      ok: true,
      fecha,
      hora,
      hora_fin,
      ocupadas: occupiedTableIds.length,
      libres: freeTables.length,
      total: ALL_TABLES.length,
      mesas_libres: freeByZone,
    })
  } catch (err) {
    console.error('[tables] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
