import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD — Server Component (no JS required, works on TPV tablet)
   ═══════════════════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic'

interface Reservation {
  id: string
  reservation_number: string | null
  customer_name: string
  customer_phone: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  personas: number
  status: string
  event_type: string
  total_amount: number
  deposit_amount: number
  table_id: string | null
  menu_code: string | null
  payment_deadline: string | null
  created_at: string
}

interface CallLog {
  id: string
  vapi_call_id: string | null
  duration: number
  transcript: string | null
  summary: string | null
  reservation_id: string | null
  created_at: string
}

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  HOLD_BLOCKED: { bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  CONFIRMED: { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  CANCELED: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  COMPLETED: { bg: '#f5f5f4', color: '#57534e', border: '#d6d3d1' },
  NO_SHOW: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
}

const statusLabels: Record<string, string> = {
  HOLD_BLOCKED: 'Pago Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELED: 'Cancelada',
  COMPLETED: 'Cerrada',
  NO_SHOW: 'No Show',
}

const eventLabels: Record<string, string> = {
  RESERVA_NORMAL: 'Mesa',
  INFANTIL_CUMPLE: 'Infantil',
  GRUPO_SENTADO: 'Grupo',
  GRUPO_PICA_PICA: 'Pica-Pica',
  NOCTURNA_EXCLUSIVA: 'Nocturna',
}

const eventIcons: Record<string, string> = {
  RESERVA_NORMAL: '🍽️',
  INFANTIL_CUMPLE: '🎂',
  GRUPO_SENTADO: '👥',
  GRUPO_PICA_PICA: '🥂',
  NOCTURNA_EXCLUSIVA: '🌙',
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatCallTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffH < 24) return `Hace ${diffH}h`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const callStatusStyles: Record<string, { bg: string; color: string; border: string }> = {
  completed: { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  initiated: { bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  missed: { bg: '#f5f5f4', color: '#57534e', border: '#d6d3d1' },
}
const callStatusLabels: Record<string, string> = {
  completed: 'Completada',
  initiated: 'En curso',
  missed: 'Sin respuesta',
}

// ─── Fetch data server-side ─────────────────────────────────────────────────
async function fetchDashboardData() {
  const [resResult, callsResult] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .select('*')
      .order('fecha', { ascending: true }),
    supabaseAdmin
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const reservations: Reservation[] = resResult.data || []
  const callLogs: CallLog[] = callsResult.data || []

  return { reservations, callLogs, error: resResult.error?.message || callsResult.error?.message || null }
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = statusColors[status] || { bg: '#f5f5f4', color: '#57534e', border: '#d6d3d1' }
  return (
    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {statusLabels[status] || status}
    </span>
  )
}

// ─── Reservation Row ────────────────────────────────────────────────────────
function ReservationRow({ r }: { r: Reservation }) {
  return (
    <a
      href={`/reservations/${r.id}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '12px', borderRadius: '8px', textDecoration: 'none', marginBottom: '8px',
        border: '1px solid #e8e2d6', background: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0,
          background: 'linear-gradient(135deg, #B08D57, #96784a)',
        }}>
          {r.personas}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.hora_inicio ? r.hora_inicio.substring(0, 5) : ''} — {r.customer_name || 'Sin nombre'}
          </p>
          <p style={{ fontSize: '12px', color: '#8a8578', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.reservation_number && <span style={{ fontFamily: 'monospace', color: '#B08D57' }}>{r.reservation_number} · </span>}
            {eventIcons[r.event_type] || '📋'} {eventLabels[r.event_type] || r.event_type}
            {r.table_id ? ` · Mesa ${r.table_id}` : ''}
          </p>
        </div>
      </div>
      <StatusBadge status={r.status} />
    </a>
  )
}

// ─── Call Log Row (uses <details> for no-JS expand) ─────────────────────────
function CallLogRow({ call }: { call: CallLog }) {
  const derivedStatus = call.summary && call.summary.startsWith('BAPI') ? 'initiated' : (call.duration > 0 ? 'completed' : 'missed')
  const cs = callStatusStyles[derivedStatus] || callStatusStyles.missed
  const csLabel = callStatusLabels[derivedStatus] || derivedStatus

  return (
    <details style={{ borderRadius: '8px', border: '1px solid #e8e2d6', background: '#ffffff', marginBottom: '8px' }}>
      <summary style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '12px', cursor: 'pointer', listStyle: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            📞
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>
              {call.vapi_call_id ? 'Llamada ' + call.vapi_call_id.substring(0, 8) + '…' : 'Llamada'}
              <span style={{ fontSize: '12px', color: '#8a8578', marginLeft: '8px' }}>{formatDuration(call.duration)}</span>
            </p>
            <p style={{ fontSize: '12px', color: '#8a8578', margin: '2px 0 0' }}>{formatCallTime(call.created_at)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`, whiteSpace: 'nowrap' }}>
            {csLabel}
          </span>
          <span style={{ fontSize: '12px', color: '#b0a898' }}>▼</span>
        </div>
      </summary>
      <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e8e2d6' }}>
        {call.summary && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a8578', margin: '0 0 4px' }}>Resumen IA</p>
            <p style={{ fontSize: '12px', lineHeight: 1.6, padding: '10px', borderRadius: '8px', background: '#f5f3ee', color: '#3a3630', margin: 0 }}>{call.summary}</p>
          </div>
        )}
        {call.transcript && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a8578', margin: '0 0 4px' }}>Transcripción</p>
            <div style={{ fontSize: '12px', lineHeight: 1.6, padding: '10px', borderRadius: '8px', background: '#f5f3ee', color: '#3a3630', maxHeight: '192px', overflowY: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{call.transcript}</pre>
            </div>
          </div>
        )}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '10px', color: '#8a8578' }}>
          {call.vapi_call_id && <span>🔗 {call.vapi_call_id.substring(0, 12)}…</span>}
          <span>🕐 {new Date(call.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        {!call.summary && !call.transcript && (
          <p style={{ marginTop: '12px', fontSize: '12px', fontStyle: 'italic', color: '#b0a898' }}>Sin resumen ni transcripción disponible.</p>
        )}
      </div>
    </details>
  )
}

// ─── Main Dashboard (async server component) ────────────────────────────────
export default async function Dashboard() {
  const { reservations, callLogs, error } = await fetchDashboardData()

  const now = new Date()
  const today = toDateStr(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toDateStr(tomorrowDate)

  const active = reservations.filter(r => r.status !== 'CANCELED')
  const todayReservations = active.filter(r => r.fecha === today).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
  const tomorrowReservations = active.filter(r => r.fecha === tomorrow).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
  const pendingPayments = reservations.filter(r => r.status === 'HOLD_BLOCKED')

  const todayPersonas = todayReservations.reduce((s, r) => s + r.personas, 0)
  const tomorrowPersonas = tomorrowReservations.reduce((s, r) => s + r.personas, 0)

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    pending: pendingPayments.length,
    todayPersonas,
    revenue: reservations.filter(r => r.status !== 'CANCELED').reduce((sum, r) => sum + (r.total_amount || 0), 0),
    callsToday: callLogs.filter(c => c.created_at && c.created_at.startsWith(today)).length,
    callsTotal: callLogs.length,
  }

  const F = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const FD = 'Georgia, "Cormorant Garamond", serif'
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('es-ES')

  return (
    <DashboardLayout>
      <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto', fontFamily: F }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 300, fontFamily: FD, color: '#1a1a1a', margin: 0 }}>
              Panel de Reservas
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#8a8578' }}>{dateStr}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="/dashboard"
              style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, borderRadius: '8px', border: '1px solid #d4c9b0', background: 'none', color: '#5c5549', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}
            >
              ↻ Actualizar
            </a>
            <a
              href="/reservations/new"
              style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 500, color: '#fff', borderRadius: '8px', background: 'linear-gradient(135deg, #B08D57, #96784a)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}
            >
              + Nueva Reserva
            </a>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚠️ {error}</span>
            <a href="/dashboard" style={{ color: '#dc2626', fontWeight: 500, textDecoration: 'underline' }}>Reintentar</a>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Hoy', value: String(todayReservations.length), sub: `${todayPersonas} personas`, accent: '#1a1a1a' },
            { label: 'Mañana', value: String(tomorrowReservations.length), sub: `${tomorrowPersonas} personas`, accent: '#B08D57' },
            { label: 'Confirmadas', value: String(stats.confirmed), sub: 'total activas', accent: '#6b9080' },
            { label: 'Pago pendiente', value: String(stats.pending), sub: 'por cobrar', accent: '#c4802f' },
            { label: 'Llamadas', value: String(stats.callsToday), sub: `${stats.callsTotal} total`, accent: '#6366f1' },
            { label: 'Ingresos', value: `${stats.revenue.toFixed(0)}€`, sub: 'estimados', accent: '#B08D57' },
          ].map((stat, i) => (
            <div key={i} style={{ borderRadius: '12px', padding: '16px', border: '1px solid #e8e2d6', background: '#faf9f6' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a8578', margin: 0 }}>{stat.label}</p>
              <p style={{ fontSize: '28px', fontWeight: 300, fontFamily: FD, color: stat.accent, margin: '4px 0 0' }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: '#b0a898', margin: '4px 0 0' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {/* ── Today ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', background: '#faf9f6', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e8e2d6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 300, fontFamily: FD, color: '#1a1a1a', margin: 0 }}>
                  Hoy — {todayReservations.length} reserva{todayReservations.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <a href="/calendar" style={{ fontSize: '12px', fontWeight: 500, color: '#B08D57', textDecoration: 'none' }}>Ver calendario →</a>
            </div>
            <div style={{ padding: '16px' }}>
              {todayReservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: '36px', margin: '0 0 8px' }}>🍽️</p>
                  <p style={{ fontSize: '14px', color: '#8a8578' }}>Sin reservas para hoy</p>
                </div>
              ) : (
                <div>{todayReservations.map(r => <ReservationRow key={r.id} r={r} />)}</div>
              )}
            </div>
          </div>

          {/* ── Tomorrow ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', background: '#faf9f6', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e8e2d6' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 300, fontFamily: FD, color: '#1a1a1a', margin: 0 }}>
                Mañana — {tomorrowReservations.length} reserva{tomorrowReservations.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div style={{ padding: '16px' }}>
              {tomorrowReservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontSize: '14px', color: '#8a8578' }}>Sin reservas para mañana</p>
                </div>
              ) : (
                <div>{tomorrowReservations.map(r => <ReservationRow key={r.id} r={r} />)}</div>
              )}
            </div>
          </div>

          {/* ── Recent activity ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', background: '#faf9f6', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e8e2d6' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 300, fontFamily: FD, color: '#1a1a1a', margin: 0 }}>Actividad reciente</h2>
            </div>
            <div style={{ padding: '16px' }}>
              {reservations.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: '14px', color: '#8a8578' }}>Sin actividad</p>
              ) : (
                <div>
                  {[...reservations].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 8).map(r => (
                    <a
                      key={r.id}
                      href={`/reservations/${r.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px',
                        borderRadius: '8px', border: '1px solid #e8e2d6', background: '#ffffff',
                        textDecoration: 'none', marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px' }}>{eventIcons[r.event_type] || '📋'}</span>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{r.customer_name || 'Sin nombre'}</p>
                          <p style={{ fontSize: '12px', color: '#8a8578', margin: '2px 0 0' }}>
                            {r.reservation_number && <span style={{ fontFamily: 'monospace', color: '#B08D57' }}>{r.reservation_number} · </span>}
                            {r.fecha} · {r.hora_inicio ? r.hora_inicio.substring(0, 5) : ''} · {r.personas} pers.
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Calls ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', background: '#faf9f6', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e8e2d6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📞</span>
                <h2 style={{ fontSize: '18px', fontWeight: 300, fontFamily: FD, color: '#1a1a1a', margin: 0 }}>Llamadas VAPI</h2>
                {stats.callsToday > 0 && (
                  <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    {stats.callsToday} hoy
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              {callLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📞</p>
                  <p style={{ fontSize: '14px', color: '#8a8578' }}>Sin llamadas registradas</p>
                </div>
              ) : (
                <div>
                  {callLogs.slice(0, 10).map(call => (
                    <CallLogRow key={call.id} call={call} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Pending payments ── */}
          {pendingPayments.length > 0 && (
            <div style={{ borderRadius: '12px', border: '1px solid #e8d5b2', padding: '20px', background: '#fef9f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#92681e' }}>
                ⚠️ Pagos pendientes ({pendingPayments.length})
              </h3>
              <div>
                {pendingPayments.slice(0, 5).map(r => (
                  <a key={r.id} href={`/reservations/${r.id}`} style={{ display: 'block', padding: '12px', borderRadius: '8px', border: '1px solid #e8d5b2', background: '#ffffff', textDecoration: 'none', marginBottom: '8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{r.customer_name || 'Sin nombre'}</p>
                    <p style={{ fontSize: '12px', color: '#92681e', margin: '4px 0 0' }}>
                      {r.fecha} · {r.deposit_amount ? r.deposit_amount.toFixed(2) : '—'}€ señal
                    </p>
                    {r.payment_deadline && (
                      <p style={{ fontSize: '10px', marginTop: '4px', color: '#c0392b' }}>
                        Vence: {new Date(r.payment_deadline).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick links ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', padding: '20px', background: '#faf9f6' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>Accesos rápidos</h3>
            {[
              { href: '/reservations/new', label: '+ Nueva Reserva', icon: '➕', bg: '#f5f0e6', border: '#d4c9b0', color: '#8b7440' },
              { href: '/calendar', label: 'Calendario', icon: '📅', bg: '#faf9f6', border: '#e8e2d6', color: '#5c5549' },
              { href: '/tables', label: 'Mesas', icon: '🪑', bg: '#faf9f6', border: '#e8e2d6', color: '#5c5549' },
              { href: '/payments', label: 'Pagos', icon: '💳', bg: '#faf9f6', border: '#e8e2d6', color: '#5c5549' },
            ].map(link => (
              <a key={link.href} href={link.href} style={{
                display: 'block', padding: '12px', borderRadius: '8px', border: `1px solid ${link.border}`,
                fontSize: '14px', fontWeight: 500, color: link.color, background: link.bg,
                textDecoration: 'none', marginBottom: '8px',
              }}>
                {link.icon} {link.label}
              </a>
            ))}
          </div>

          {/* ── Stats summary ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', padding: '20px', background: '#faf9f6' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>Resumen total</h3>
            {[
              { label: 'Reservas totales', value: stats.total, color: '#1a1a1a' },
              { label: 'Activas', value: active.length, color: '#6b9080' },
              { label: 'Canceladas', value: reservations.filter(r => r.status === 'CANCELED').length, color: '#c0392b' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
                <span style={{ color: '#8a8578' }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: item.color }}>{item.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '12px', borderTop: '1px solid #e8e2d6' }}>
              <span style={{ color: '#8a8578' }}>Ingresos estimados</span>
              <span style={{ fontWeight: 600, color: '#B08D57' }}>{stats.revenue.toFixed(2)}€</span>
            </div>
          </div>

          {/* ── Connection info ── */}
          <div style={{ borderRadius: '12px', border: '1px solid #e8e2d6', padding: '16px', background: '#faf9f6', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#b0a898', margin: 0 }}>Actualizado: {timeStr}</p>
            <p style={{ fontSize: '10px', color: '#b0a898', margin: '4px 0 0' }}>
              Pulsa «↻ Actualizar» para refrescar los datos
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
