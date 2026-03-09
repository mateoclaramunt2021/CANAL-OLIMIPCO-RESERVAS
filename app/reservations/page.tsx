import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const statusInline: Record<string, { bg: string; color: string; border: string }> = {
  HOLD_BLOCKED: { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  CONFIRMED: { bg: '#d1fae5', color: '#047857', border: '#6ee7b7' },
  CANCELED: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  COMPLETED: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  NO_SHOW: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
}

const statusLabels: Record<string, string> = {
  HOLD_BLOCKED: 'Pago Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELED: 'Cancelada',
  COMPLETED: 'Cerrada',
  NO_SHOW: 'No Show',
}

const eventLabels: Record<string, string> = {
  RESERVA_NORMAL: 'Reserva Normal',
  INFANTIL_CUMPLE: 'Infantil / Cumple',
  GRUPO_SENTADO: 'Grupo Sentado',
  GRUPO_PICA_PICA: 'Grupo Pica-Pica',
  NOCTURNA_EXCLUSIVA: 'Nocturna Exclusiva',
}

const filterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'HOLD_BLOCKED', label: 'Pago Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'COMPLETED', label: 'Cerradas' },
  { value: 'CANCELED', label: 'Canceladas' },
  { value: 'NO_SHOW', label: 'No Show' },
]

export default async function Reservations({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams
  const filter = params.status || 'all'
  const search = (params.q || '').toLowerCase()

  let query = supabaseAdmin
    .from('reservations')
    .select('id, reservation_number, customer_name, customer_phone, customer_email, event_type, fecha, hora_inicio, hora_fin, status, total_amount, deposit_amount, personas, table_id')
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })
    .limit(500)

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data } = await query
  let reservations: any[] = data || []

  // Client-side search filter
  if (search) {
    reservations = reservations.filter((r: any) =>
      r.customer_name?.toLowerCase().includes(search) ||
      r.customer_phone?.includes(search) ||
      r.customer_email?.toLowerCase().includes(search) ||
      r.reservation_number?.toLowerCase().includes(search)
    )
  }

  const thStyle = { textAlign: 'left' as const, padding: '12px 24px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>📋 Reservas</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>{reservations.length} reservas encontradas</p>
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
          <form method="GET" action="/reservations" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <input type="hidden" name="status" value={filter} />
            <input
              type="text"
              name="q"
              placeholder="Buscar por nombre, teléfono, nº reserva..."
              defaultValue={search}
              style={{ flex: 1, minWidth: '200px', padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', background: '#faf9f6' }}
            />
            <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Buscar</button>
          </form>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            {filterOptions.map(f => (
              <a
                key={f.value}
                href={`/reservations?status=${f.value}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  ...(filter === f.value
                    ? { background: '#2563eb', color: '#fff' }
                    : { background: '#f1f5f9', color: '#475569' }),
                }}
              >
                {f.label}
              </a>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {reservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <span style={{ fontSize: '40px' }}>🔍</span>
              <p style={{ color: '#64748b', marginTop: '12px', fontWeight: 500 }}>No se encontraron reservas</p>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Prueba con otros filtros</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={thStyle}>Nº Reserva</th>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Pers.</th>
                    <th style={thStyle}>Mesa</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                    <th style={thStyle}>Estado</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((res: any) => {
                    const sc = statusInline[res.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
                    return (
                      <tr key={res.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 600, color: '#B08D57' }}>
                            {res.reservation_number || res.id.substring(0, 8)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <p style={{ fontWeight: 500, color: '#0f172a', margin: 0, fontSize: '14px' }}>{res.customer_name || 'Sin nombre'}</p>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>{res.customer_phone || 'Sin teléfono'}</p>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontSize: '14px', color: '#334155' }}>{eventLabels[res.event_type] || res.event_type}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', margin: 0 }}>
                            {res.fecha ? new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{res.hora_inicio || '—'} – {res.hora_fin || '—'}</p>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>{res.personas}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontSize: '14px', color: '#475569' }}>{res.table_id || '—'}</span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{res.total_amount ? `${res.total_amount.toFixed(2)}€` : '—'}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {statusLabels[res.status] || res.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <a href={`/reservations/${res.id}`} style={{ fontSize: '14px', fontWeight: 500, color: '#2563eb', textDecoration: 'none' }}>Ver →</a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href={`/reservations?status=${filter}`} style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>🔄 Actualizar</a>
        </div>
      </div>
    </DashboardLayout>
  )
}