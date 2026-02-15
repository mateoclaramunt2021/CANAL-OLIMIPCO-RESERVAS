// ─── Definición de mesas del Canal Olímpico ─────────────────────────────────
//
// FUERA: 9 mesas de 4 + 9 mesas de 2 = 18 mesas (54 plazas)
// DENTRO: 4 mesas de 6 + 2 mesas de 2 + 4 mesas de 4 = 10 mesas (32 plazas)  [FIX: 4*6=24 + 2*2=4 + 4*4=16 = 44]
// TOTAL: 28 mesas, 98 plazas fijas
// EXTRA: Hasta 100 personas adicionales para eventos
// CAPACIDAD MÁXIMA TOTAL: ~198 personas (mesas + eventos simultáneos)

export interface Table {
  id: string        // Ej: "F01", "D01"
  zone: 'fuera' | 'dentro'
  capacity: number  // Personas que caben
  label: string     // Nombre legible
}

// ─── Generar las 28 mesas ────────────────────────────────────────────────────

function generateTables(): Table[] {
  const tables: Table[] = []
  let fIdx = 1
  let dIdx = 1

  // FUERA: 9 mesas de 4
  for (let i = 0; i < 9; i++) {
    const id = `F${String(fIdx).padStart(2, '0')}`
    tables.push({ id, zone: 'fuera', capacity: 4, label: `Fuera ${fIdx} (4 pers.)` })
    fIdx++
  }

  // FUERA: 9 mesas de 2
  for (let i = 0; i < 9; i++) {
    const id = `F${String(fIdx).padStart(2, '0')}`
    tables.push({ id, zone: 'fuera', capacity: 2, label: `Fuera ${fIdx} (2 pers.)` })
    fIdx++
  }

  // DENTRO: 4 mesas de 6
  for (let i = 0; i < 4; i++) {
    const id = `D${String(dIdx).padStart(2, '0')}`
    tables.push({ id, zone: 'dentro', capacity: 6, label: `Dentro ${dIdx} (6 pers.)` })
    dIdx++
  }

  // DENTRO: 2 mesas de 2
  for (let i = 0; i < 2; i++) {
    const id = `D${String(dIdx).padStart(2, '0')}`
    tables.push({ id, zone: 'dentro', capacity: 2, label: `Dentro ${dIdx} (2 pers.)` })
    dIdx++
  }

  // DENTRO: 4 mesas de 4
  for (let i = 0; i < 4; i++) {
    const id = `D${String(dIdx).padStart(2, '0')}`
    tables.push({ id, zone: 'dentro', capacity: 4, label: `Dentro ${dIdx} (4 pers.)` })
    dIdx++
  }

  return tables
}

export const ALL_TABLES: Table[] = generateTables()

// ─── Constantes ──────────────────────────────────────────────────────────────

export const TOTAL_TABLES = ALL_TABLES.length                          // 28
export const TOTAL_TABLE_SEATS = ALL_TABLES.reduce((s, t) => s + t.capacity, 0) // 98
export const MAX_EVENT_CAPACITY = 100  // Personas extra para eventos
export const MAX_TOTAL_CAPACITY = TOTAL_TABLE_SEATS + MAX_EVENT_CAPACITY // ~198

// ─── Resumen por zona ────────────────────────────────────────────────────────

export function getTableSummary() {
  const fuera = ALL_TABLES.filter(t => t.zone === 'fuera')
  const dentro = ALL_TABLES.filter(t => t.zone === 'dentro')

  return {
    fuera: {
      total_mesas: fuera.length,
      total_plazas: fuera.reduce((s, t) => s + t.capacity, 0),
      detalle: {
        mesas_de_4: fuera.filter(t => t.capacity === 4).length,
        mesas_de_2: fuera.filter(t => t.capacity === 2).length,
      },
    },
    dentro: {
      total_mesas: dentro.length,
      total_plazas: dentro.reduce((s, t) => s + t.capacity, 0),
      detalle: {
        mesas_de_6: dentro.filter(t => t.capacity === 6).length,
        mesas_de_4: dentro.filter(t => t.capacity === 4).length,
        mesas_de_2: dentro.filter(t => t.capacity === 2).length,
      },
    },
    total_mesas: ALL_TABLES.length,
    total_plazas_mesas: TOTAL_TABLE_SEATS,
    capacidad_eventos_extra: MAX_EVENT_CAPACITY,
    capacidad_maxima_total: MAX_TOTAL_CAPACITY,
  }
}

// ─── Buscar la mejor mesa disponible ─────────────────────────────────────────
// Recibe las IDs de mesas ya ocupadas en ese slot y busca la más pequeña que quepa

export function findBestTable(
  personas: number,
  occupiedTableIds: string[],
  preferZone?: 'fuera' | 'dentro'
): Table | null {
  const free = ALL_TABLES.filter(t => !occupiedTableIds.includes(t.id))

  // Filtrar por zona preferida (si se indica)
  let candidates = preferZone
    ? free.filter(t => t.zone === preferZone)
    : free

  // Si no hay en la zona preferida, buscar en la otra
  if (candidates.length === 0 && preferZone) {
    candidates = free
  }

  // Solo mesas donde caben las personas
  candidates = candidates.filter(t => t.capacity >= personas)

  if (candidates.length === 0) return null

  // Ordenar: primero la más ajustada (menos desperdicio)
  candidates.sort((a, b) => a.capacity - b.capacity)

  return candidates[0]
}

// ─── Combinar mesas para grupos grandes ──────────────────────────────────────
// Si una persona necesita más plazas de las que tiene una sola mesa,
// busca la menor combinación de mesas que sume suficientes plazas

export function findTableCombination(
  personas: number,
  occupiedTableIds: string[],
  preferZone?: 'fuera' | 'dentro'
): Table[] | null {
  // Primero intentar con una sola mesa
  const single = findBestTable(personas, occupiedTableIds, preferZone)
  if (single) return [single]

  // Si no, combinar mesas de la zona preferida
  const free = ALL_TABLES
    .filter(t => !occupiedTableIds.includes(t.id))
    .filter(t => (preferZone ? t.zone === preferZone : true))
    .sort((a, b) => b.capacity - a.capacity) // Las más grandes primero

  const selected: Table[] = []
  let totalSeats = 0

  for (const table of free) {
    selected.push(table)
    totalSeats += table.capacity
    if (totalSeats >= personas) return selected
  }

  // Si no alcanza con la zona preferida, probar con todas
  if (preferZone) {
    return findTableCombination(personas, occupiedTableIds)
  }

  return null // No hay suficientes mesas
}
