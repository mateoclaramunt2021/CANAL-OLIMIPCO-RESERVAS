import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function TablesPage({ searchParams }: { searchParams: Promise<{ fecha?: string; hora?: string }> }) {
  const params = await searchParams
  const now = new Date()
  const selectedDate = params.fecha || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const selectedTime = params.hora || '14:00'

  // Fetch tables
  const { data: tablesData } = await supabaseAdmin.from('tables').select('*').order('id')
  const tables: any[] = tablesData || []

  // Fetch reservations for that date
  const { data: resData } = await supabaseAdmin
    .from('reservations')
    .select('id, customer_name, hora_inicio, hora_fin, personas, status, event_type, table_id')
    .eq('fecha', selectedDate)
    .not('status', 'eq', 'CANCELED')

  const allRes: any[] = resData || []

  // Filter overlapping with selected time
  const [h, m] = selectedTime.split(':').map(Number)
  const slotStart = h * 60 + m
  const slotEnd = slotStart + 120
  const reservations = allRes.filter(r => {
    if (!r.hora_inicio) return false
    const [rh, rm] = r.hora_inicio.split(':').map(Number)
    const rStart = rh * 60 + rm
    let rEnd = rStart + 120
    if (r.hora_fin) { const [eh, em] = r.hora_fin.split(':').map(Number); rEnd = eh * 60 + em }
    return slotStart < rEnd && slotEnd > rStart
  })

  const occupiedIds = new Set(reservations.map((r: any) => r.table_id).filter(Boolean))
  const fueraTables = tables.filter(t => t.zone === 'fuera')
  const dentroTables = tables.filter(t => t.zone === 'dentro')
  const freeCount = tables.filter(t => !occupiedIds.has(t.id)).length
  const occupiedCount = occupiedIds.size
  const totalPersonas = reservations.reduce((s: number, r: any) => s + r.personas, 0)

  const timeSlots = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00']

  const renderZone = (zoneTables: any[], icon: string, title: string) => {
    const free = zoneTables.filter(t => !occupiedIds.has(t.id)).length
    return (
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{title}</h2>
          <span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: 'auto' }}>{free}/{zoneTables.length} libres</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {zoneTables.map(table => {
            const res = reservations.find((r: any) => r.table_id === table.id)
            const occupied = !!res
            return (
              <div key={table.id} style={{
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${occupied ? '#fcd34d' : '#a7f3d0'}`,
                background: occupied ? '#fffbeb' : 'rgba(236,253,245,0.5)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{table.id}</span>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: occupied ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
                </div>
                <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{table.capacity} plazas</p>
                {res && (
                  <a href={`/reservations/${res.id}`} style={{ display: 'block', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fcd34d', textDecoration: 'none' }}>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: '#92400e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.customer_name || 'Sin nombre'}</p>
                    <p style={{ fontSize: '10px', color: '#b45309', margin: '2px 0 0' }}>{res.hora_inicio?.substring(0, 5)} · {res.personas} pers.</p>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>🪑 Mesas</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Estado de las {tables.length} mesas del restaurante</p>
        </div>

        {/* Date/Time selector */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
          <form method="GET" action="/tables" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '4px' }}>Fecha</label>
              <input type="date" name="fecha" defaultValue={selectedDate} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '4px' }}>Hora</label>
              <select name="hora" defaultValue={selectedTime} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', background: '#fff' }}>
                {timeSlots.map(ts => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Ver</button>
          </form>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
            {timeSlots.map(ts => (
              <a key={ts} href={`/tables?fecha=${selectedDate}&hora=${ts}`} style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                textDecoration: 'none',
                ...(selectedTime === ts
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: '#f1f5f9', color: '#475569' }),
              }}>
                {ts}
              </a>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Mesas', value: tables.length, color: '#0f172a' },
            { label: 'Libres', value: freeCount, color: '#059669' },
            { label: 'Ocupadas', value: occupiedCount, color: '#d97706' },
            { label: 'Personas Sentadas', value: totalPersonas, color: '#2563eb' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: s.color, margin: '4px 0 0' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table grids */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {renderZone(fueraTables, '☀️', 'Terraza (Fuera)')}
          {renderZone(dentroTables, '🏠', 'Interior (Dentro)')}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href={`/tables?fecha=${selectedDate}&hora=${selectedTime}`} style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>🔄 Actualizar</a>
        </div>
      </div>
    </DashboardLayout>
  )
}
