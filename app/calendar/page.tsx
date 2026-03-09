import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const statusDotColor: Record<string, string> = {
  HOLD_BLOCKED: '#f59e0b',
  CONFIRMED: '#10b981',
  CANCELED: '#ef4444',
  COMPLETED: '#94a3b8',
  NO_SHOW: '#f87171',
}

const statusBarColor: Record<string, string> = {
  HOLD_BLOCKED: '#fbbf24',
  CONFIRMED: '#34d399',
  CANCELED: '#f87171',
  COMPLETED: '#94a3b8',
  NO_SHOW: '#fca5a5',
}

const eventLabels: Record<string, string> = {
  RESERVA_NORMAL: 'Mesa',
  INFANTIL_CUMPLE: 'Infantil',
  GRUPO_SENTADO: 'Grupo',
  GRUPO_PICA_PICA: 'Pica-Pica',
  NOCTURNA_EXCLUSIVA: 'Nocturna',
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const days: { date: Date; inMonth: boolean }[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), inMonth: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true })
  }
  while (days.length < 42) {
    days.push({ date: new Date(year, month + 1, days.length - startDow - lastDay.getDate() + 1), inMonth: false })
  }
  return days
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string; date?: string; view?: string }> }) {
  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year || '') || now.getFullYear()
  const month = params.month ? parseInt(params.month) - 1 : now.getMonth()
  const view = params.view === 'week' ? 'week' : 'month'
  const selectedDate = params.date || null
  const today = toDateStr(now)

  // Fetch all active reservations
  const { data } = await supabaseAdmin
    .from('reservations')
    .select('id, customer_name, customer_phone, fecha, hora_inicio, hora_fin, personas, status, event_type, total_amount, table_id')
    .not('status', 'eq', 'CANCELED')
    .order('hora_inicio', { ascending: true })

  const reservations: any[] = data || []

  // Group by date
  const byDate: Record<string, any[]> = {}
  for (const r of reservations) {
    if (!r.fecha) continue
    if (!byDate[r.fecha]) byDate[r.fecha] = []
    byDate[r.fecha].push(r)
  }

  const monthDays = getMonthDays(year, month)
  const selectedReservations = selectedDate ? (byDate[selectedDate] || []) : []

  // Navigation
  const prevMonth = month === 0 ? 12 : month
  const prevYear = month === 0 ? year - 1 : year
  const nextMonth = month === 11 ? 1 : month + 2
  const nextYear = month === 11 ? year + 1 : year
  const prevUrl = `/calendar?year=${prevYear}&month=${prevMonth}&view=${view}${selectedDate ? `&date=${selectedDate}` : ''}`
  const nextUrl = `/calendar?year=${nextYear}&month=${nextMonth}&view=${view}${selectedDate ? `&date=${selectedDate}` : ''}`
  const todayUrl = `/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}&date=${today}&view=${view}`

  const monthLabel = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const buildUrl = (date: string) => `/calendar?year=${year}&month=${month + 1}&date=${date}&view=${view}`

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>📅 Calendario</h1>
            <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Vista de reservas por fecha</p>
          </div>
          <a href="/reservations/new" style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>+ Nueva Reserva</a>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href={prevUrl} style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#475569', fontSize: '18px' }}>←</a>
            <a href={nextUrl} style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#475569', fontSize: '18px' }}>→</a>
            <a href={todayUrl} style={{ padding: '8px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 500, color: '#475569', textDecoration: 'none' }}>Hoy</a>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize', margin: 0 }}>{monthLabel}</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Calendar grid */}
          <div>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {monthDays.map(({ date, inMonth }, idx) => {
                  const ds = toDateStr(date)
                  const ress = byDate[ds] || []
                  const isToday = ds === today
                  const isSelected = ds === selectedDate
                  const isClosed = date.getDay() === 1 || date.getDay() === 2

                  return (
                    <a
                      key={idx}
                      href={buildUrl(ds)}
                      style={{
                        display: 'block',
                        minHeight: '90px',
                        padding: '8px',
                        borderBottom: '1px solid #f1f5f9',
                        borderRight: '1px solid #f1f5f9',
                        textDecoration: 'none',
                        background: isSelected ? 'rgba(59,130,246,0.08)' : !inMonth ? 'rgba(248,250,252,0.5)' : '#fff',
                        ...(isSelected ? { outline: '2px solid #3b82f6', outlineOffset: '-2px' } : {}),
                      }}
                    >
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(isToday ? { background: '#2563eb', color: '#fff', width: '28px', height: '28px', borderRadius: '50%' } : {}),
                        color: isToday ? '#fff' : !inMonth ? '#cbd5e1' : isClosed ? '#fca5a5' : '#334155',
                      }}>
                        {date.getDate()}
                      </span>
                      {isClosed && inMonth && <span style={{ fontSize: '9px', color: '#fca5a5', display: 'block' }}>Cerrado</span>}
                      {ress.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          {ress.slice(0, 3).map((r: any) => (
                            <div key={r.id} style={{ height: '6px', borderRadius: '3px', marginBottom: '2px', background: statusBarColor[r.status] || '#94a3b8' }} />
                          ))}
                          {ress.length > 3 && <span style={{ fontSize: '9px', color: '#94a3b8' }}>+{ress.length - 3} más</span>}
                        </div>
                      )}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', padding: '0 8px' }}>
              {[
                { color: '#10b981', label: 'Confirmada' },
                { color: '#f59e0b', label: 'Pago pendiente' },
                { color: '#94a3b8', label: 'Completada' },
                { color: '#f87171', label: 'No Show' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color }} />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected day panel */}
          <div>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', position: 'sticky', top: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                  : 'Selecciona un día'}
              </h3>
              {!selectedDate ? (
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>Haz clic en un día del calendario para ver sus reservas</p>
              ) : selectedReservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <span style={{ fontSize: '32px' }}>📭</span>
                  <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>Sin reservas este día</p>
                  <a href="/reservations/new" style={{ display: 'inline-block', marginTop: '12px', fontSize: '14px', color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>+ Crear reserva</a>
                </div>
              ) : (
                <div>
                  {selectedReservations.map((r: any) => (
                    <a key={r.id} href={`/reservations/${r.id}`} style={{ display: 'block', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '8px', textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusDotColor[r.status] || '#94a3b8' }} />
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{r.hora_inicio?.substring(0, 5) || '—'}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{eventLabels[r.event_type] || r.event_type}</span>
                      </div>
                      <p style={{ fontSize: '14px', color: '#334155', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customer_name || 'Sin nombre'}</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>{r.personas} pers.{r.table_id ? ` · Mesa ${r.table_id}` : ''}</p>
                    </a>
                  ))}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{selectedReservations.length} reserva{selectedReservations.length !== 1 ? 's' : ''} · {selectedReservations.reduce((s: number, r: any) => s + r.personas, 0)} personas</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
