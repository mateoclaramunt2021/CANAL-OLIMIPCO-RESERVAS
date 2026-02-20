'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { createRealtimeClient } from '@/lib/supabase'

interface Reservation {
  id: string
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

const statusColors: Record<string, string> = {
  HOLD_BLOCKED: 'bg-amber-50 text-amber-800 border-amber-300',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  CANCELED: 'bg-red-50 text-red-700 border-red-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  NO_SHOW: 'bg-rose-50 text-rose-700 border-rose-200',
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

export default function Dashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [newReservationFlash, setNewReservationFlash] = useState<string | null>(null)
  const [newCallFlash, setNewCallFlash] = useState<string | null>(null)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)

  const fetchReservations = useCallback(async () => {
    try {
      setError(null)
      const [resRes, callsRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/calls?limit=30'),
      ])
      if (!resRes.ok) throw new Error(`Error ${resRes.status}: ${resRes.statusText}`)
      const resData = await resRes.json()
      setReservations(Array.isArray(resData) ? resData : [])

      if (callsRes.ok) {
        const callsData = await callsRes.json()
        setCallLogs(Array.isArray(callsData.calls) ? callsData.calls : [])
      }

      setLastUpdate(new Date())
    } catch (err: any) {
      console.error('[Dashboard] Fetch error:', err)
      setError(err.message || 'Error al cargar reservas')
    }
    setLoading(false)
  }, [])

  // ─── Initial fetch + Realtime subscription ────────────────────────────────
  useEffect(() => {
    fetchReservations()

    // Supabase Realtime subscription
    let channel: any = null
    let callChannel: any = null
    try {
      const realtimeClient = createRealtimeClient()

      // ── Reservations realtime ──
      channel = realtimeClient
        .channel('reservations-dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations' },
          (payload: any) => {
            console.log('[Realtime] Reservation change:', payload.eventType)
            setLastUpdate(new Date())

            if (payload.eventType === 'INSERT') {
              const newRes = payload.new as Reservation
              setReservations(prev => [newRes, ...prev])
              // Flash animation for new reservation
              setNewReservationFlash(newRes.id)
              setTimeout(() => setNewReservationFlash(null), 3000)
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Reservation
              setReservations(prev =>
                prev.map(r => r.id === updated.id ? updated : r)
              )
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id
              if (deletedId) {
                setReservations(prev => prev.filter(r => r.id !== deletedId))
              }
            }
          }
        )
        .subscribe((status: string) => {
          console.log('[Realtime] Reservations status:', status)
          if (status === 'SUBSCRIBED') setRealtimeConnected(true)
        })

      // ── Call logs realtime ──
      callChannel = realtimeClient
        .channel('calls-dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'call_logs' },
          (payload: any) => {
            console.log('[Realtime] Call change:', payload.eventType)
            setLastUpdate(new Date())

            if (payload.eventType === 'INSERT') {
              const newCall = payload.new as CallLog
              setCallLogs(prev => [newCall, ...prev.slice(0, 29)])
              setNewCallFlash(newCall.id)
              setTimeout(() => setNewCallFlash(null), 4000)
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as CallLog
              setCallLogs(prev =>
                prev.map(c => c.id === updated.id ? updated : c)
              )
            }
          }
        )
        .subscribe((status: string) => {
          console.log('[Realtime] Calls status:', status)
        })
    } catch (err) {
      console.error('[Realtime] Setup error:', err)
    }

    // Auto-refresh every 30s as fallback
    const interval = setInterval(fetchReservations, 30000)

    return () => {
      clearInterval(interval)
      if (channel) channel.unsubscribe()
      if (callChannel) callChannel.unsubscribe()
    }
  }, [fetchReservations])

  // ─── Computed data ────────────────────────────────────────────────────────
  const active = reservations.filter(r => r.status !== 'CANCELED')
  const today = toDateStr(new Date())
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toDateStr(d) })()

  const todayReservations = useMemo(() =>
    active.filter(r => r.fecha === today).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || '')),
    [active, today]
  )
  const tomorrowReservations = useMemo(() =>
    active.filter(r => r.fecha === tomorrow).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || '')),
    [active, tomorrow]
  )
  const pendingPayments = useMemo(() =>
    reservations.filter(r => r.status === 'HOLD_BLOCKED'),
    [reservations]
  )

  const todayPersonas = todayReservations.reduce((s, r) => s + r.personas, 0)
  const tomorrowPersonas = tomorrowReservations.reduce((s, r) => s + r.personas, 0)

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    pending: pendingPayments.length,
    todayPersonas,
    revenue: reservations
      .filter(r => r.status !== 'CANCELED')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0),
    callsToday: callLogs.filter(c => c.created_at && c.created_at.startsWith(today)).length,
    callsTotal: callLogs.length,
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
              Panel de Reservas
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-xs sm:text-sm" style={{ color: '#8a8578' }}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <span className="text-xs" style={{ color: '#8a8578' }}>·</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="text-xs" style={{ color: realtimeConnected ? '#6b9080' : '#b08d57' }}>
                  {realtimeConnected ? 'En vivo' : 'Reconectando…'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => { setLoading(true); fetchReservations() }}
              className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg border transition-all hover:shadow-sm"
              style={{ borderColor: '#d4c9b0', color: '#5c5549' }}
            >
              ↻ Actualizar
            </button>
            <Link
              href="/reservations/new"
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all hover:shadow-md whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
            >
              + Nueva Reserva
            </Link>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={fetchReservations} className="text-red-600 font-medium hover:underline">Reintentar</button>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Hoy', value: todayReservations.length, sub: `${todayPersonas} personas`, accent: '#1a1a1a' },
            { label: 'Mañana', value: tomorrowReservations.length, sub: `${tomorrowPersonas} personas`, accent: '#B08D57' },
            { label: 'Confirmadas', value: stats.confirmed, sub: 'total activas', accent: '#6b9080' },
            { label: 'Pago pendiente', value: stats.pending, sub: 'por cobrar', accent: '#c4802f' },
            { label: 'Llamadas', value: stats.callsToday, sub: `${stats.callsTotal} total`, accent: '#6366f1' },
            { label: 'Ingresos', value: `${stats.revenue.toFixed(0)}€`, sub: 'estimados', accent: '#B08D57' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl p-4 sm:p-5 border transition-all hover:shadow-sm"
              style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}
            >
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-light mt-1" style={{ fontFamily: 'Cormorant Garamond, serif', color: stat.accent }}>
                {stat.value}
              </p>
              <p className="text-[10px] sm:text-xs mt-1" style={{ color: '#b0a898' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#B08D57', borderTopColor: 'transparent' }}></div>
            <p className="text-sm mt-3" style={{ color: '#8a8578' }}>Cargando reservas…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* ── Main content (2 cols) ── */}
            <div className="xl:col-span-2 space-y-4 sm:space-y-6 min-w-0">

              {/* Today's reservations */}
              <div className="rounded-xl border overflow-hidden" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#e8e2d6' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <h2 className="text-lg font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                      Hoy — {todayReservations.length} reserva{todayReservations.length !== 1 ? 's' : ''}
                    </h2>
                  </div>
                  <Link href="/calendar" className="text-xs font-medium hover:underline" style={{ color: '#B08D57' }}>
                    Ver calendario →
                  </Link>
                </div>
                <div className="p-4">
                  {todayReservations.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-4xl mb-2">🍽️</p>
                      <p className="text-sm" style={{ color: '#8a8578' }}>Sin reservas para hoy</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todayReservations.map(r => (
                        <ReservationRow key={r.id} r={r} isNew={newReservationFlash === r.id} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tomorrow preview */}
              <div className="rounded-xl border overflow-hidden" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <div className="p-5 border-b" style={{ borderColor: '#e8e2d6' }}>
                  <h2 className="text-lg font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                    Mañana — {tomorrowReservations.length} reserva{tomorrowReservations.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="p-4">
                  {tomorrowReservations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm" style={{ color: '#8a8578' }}>Sin reservas para mañana</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tomorrowReservations.map(r => (
                        <ReservationRow key={r.id} r={r} isNew={newReservationFlash === r.id} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div className="rounded-xl border overflow-hidden" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <div className="p-5 border-b" style={{ borderColor: '#e8e2d6' }}>
                  <h2 className="text-lg font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                    Actividad reciente
                  </h2>
                </div>
                <div className="p-4">
                  {reservations.length === 0 ? (
                    <p className="text-center py-6 text-sm" style={{ color: '#8a8578' }}>Sin actividad</p>
                  ) : (
                    <div className="space-y-2">
                      {reservations
                        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                        .slice(0, 8)
                        .map(r => (
                          <Link
                            key={r.id}
                            href={`/reservations/${r.id}`}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm group ${newReservationFlash === r.id ? 'animate-flash-gold' : ''}`}
                            style={{ borderColor: '#e8e2d6', background: newReservationFlash === r.id ? '#fdf6e8' : '#ffffff' }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{eventIcons[r.event_type] || '📋'}</span>
                              <div>
                                <p className="text-sm font-medium group-hover:underline" style={{ color: '#1a1a1a' }}>
                                  {r.customer_name || 'Sin nombre'}
                                </p>
                                <p className="text-xs" style={{ color: '#8a8578' }}>
                                  {r.fecha} · {r.hora_inicio?.substring(0, 5)} · {r.personas} pers.
                                </p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${statusColors[r.status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                              {statusLabels[r.status] || r.status}
                            </span>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── VAPI Calls Panel ── */}
              <div className="rounded-xl border overflow-hidden" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#e8e2d6' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📞</span>
                    <h2 className="text-lg font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                      Llamadas VAPI
                    </h2>
                    {stats.callsToday > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {stats.callsToday} hoy
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-indigo-500 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span className="text-[10px]" style={{ color: '#8a8578' }}>
                      {realtimeConnected ? 'En vivo' : 'Polling'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {callLogs.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-4xl mb-2">📞</p>
                      <p className="text-sm" style={{ color: '#8a8578' }}>Sin llamadas registradas</p>
                      <p className="text-xs mt-1" style={{ color: '#b0a898' }}>Las llamadas de VAPI aparecerán aquí en tiempo real</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {callLogs.slice(0, 10).map(call => (
                        <CallLogRow
                          key={call.id}
                          call={call}
                          isNew={newCallFlash === call.id}
                          isExpanded={expandedCall === call.id}
                          onToggle={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                        />
                      ))}
                      {callLogs.length > 10 && (
                        <p className="text-center text-xs pt-2" style={{ color: '#8a8578' }}>
                          +{callLogs.length - 10} llamadas anteriores
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Sidebar (1 col) ── */}
            <div className="space-y-4 sm:space-y-6 min-w-0">

              {/* Pending payments alert */}
              {pendingPayments.length > 0 && (
                <div className="rounded-xl border p-5" style={{ background: '#fef9f0', borderColor: '#e8d5b2' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: '#92681e' }}>
                    ⚠️ Pagos pendientes ({pendingPayments.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingPayments.slice(0, 5).map(r => (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className="block p-3 rounded-lg border transition-all hover:shadow-sm"
                        style={{ background: '#ffffff', borderColor: '#e8d5b2' }}
                      >
                        <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{r.customer_name || 'Sin nombre'}</p>
                        <p className="text-xs" style={{ color: '#92681e' }}>
                          {r.fecha} · {r.deposit_amount?.toFixed(2) || '—'}€ señal
                        </p>
                        {r.payment_deadline && (
                          <p className="text-[10px] mt-1" style={{ color: '#c0392b' }}>
                            Vence: {new Date(r.payment_deadline).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </Link>
                    ))}
                    {pendingPayments.length > 5 && (
                      <p className="text-xs pt-1" style={{ color: '#92681e' }}>+{pendingPayments.length - 5} más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="rounded-xl border p-5" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1a1a' }}>Accesos rápidos</h3>
                <div className="space-y-2">
                  {[
                    { href: '/reservations/new', label: '+ Nueva Reserva', icon: '➕', bg: '#f5f0e6', border: '#d4c9b0', color: '#8b7440' },
                    { href: '/calendar', label: 'Calendario', icon: '📅', bg: '#faf9f6', border: '#e8e2d6', color: '#5c5549' },
                    { href: '/tables', label: 'Mesas', icon: '🪑', bg: '#faf9f6', border: '#e8e2d6', color: '#5c5549' },
                    { href: '/payments', label: 'Pagos', icon: '💳', bg: '#faf9f6', border: '#e8e2d6', color: '#5c5549' },
                  ].map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block p-3 rounded-lg border text-sm font-medium transition-all hover:shadow-sm"
                      style={{ background: link.bg, borderColor: link.border, color: link.color }}
                    >
                      {link.icon} {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Stats summary */}
              <div className="rounded-xl border p-5" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1a1a' }}>Resumen total</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Reservas totales', value: stats.total, color: '#1a1a1a' },
                    { label: 'Activas', value: active.length, color: '#6b9080' },
                    { label: 'Canceladas', value: reservations.filter(r => r.status === 'CANCELED').length, color: '#c0392b' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span style={{ color: '#8a8578' }}>{item.label}</span>
                      <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 mt-1" style={{ borderTop: '1px solid #e8e2d6' }}>
                    <span style={{ color: '#8a8578' }}>Ingresos estimados</span>
                    <span className="font-semibold" style={{ color: '#B08D57' }}>{stats.revenue.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Connection info */}
              <div className="rounded-xl border p-4 text-center" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <p className="text-[11px]" style={{ color: '#b0a898' }}>
                  Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
                </p>
                <p className="text-[10px] mt-1" style={{ color: '#b0a898' }}>
                  {realtimeConnected ? '🟢 Conexión en vivo activa' : '🟡 Actualizando cada 30s'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// ─── Reservation Row Component ──────────────────────────────────────────────
function ReservationRow({ r, isNew }: { r: Reservation; isNew: boolean }) {
  return (
    <Link
      href={`/reservations/${r.id}`}
      className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg border transition-all hover:shadow-sm group ${isNew ? 'animate-flash-gold' : ''}`}
      style={{
        borderColor: isNew ? '#B08D57' : '#e8e2d6',
        background: isNew ? '#fdf6e8' : '#ffffff',
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
        >
          {r.personas}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium group-hover:underline truncate" style={{ color: '#1a1a1a' }}>
            {r.hora_inicio?.substring(0, 5)} — {r.customer_name || 'Sin nombre'}
          </p>
          <p className="text-xs truncate" style={{ color: '#8a8578' }}>
            {eventIcons[r.event_type] || '📋'} {eventLabels[r.event_type] || r.event_type}
            {r.table_id ? ` · Mesa ${r.table_id}` : ''}
          </p>
        </div>
      </div>
      <span className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] font-semibold border whitespace-nowrap flex-shrink-0 ${statusColors[r.status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
        {statusLabels[r.status] || r.status}
      </span>
    </Link>
  )
}

// ─── Call Log Row Component ─────────────────────────────────────────────────

const callStatusColors: Record<string, string> = {
  'customer-ended-call': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'assistant-ended-call': 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  initiated: 'bg-amber-50 text-amber-700 border-amber-200',
  'no-answer': 'bg-stone-100 text-stone-500 border-stone-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  error: 'bg-red-50 text-red-700 border-red-200',
}

const callStatusLabels: Record<string, string> = {
  'customer-ended-call': 'Completada',
  'assistant-ended-call': 'IA finalizó',
  completed: 'Completada',
  initiated: 'En curso',
  'no-answer': 'Sin respuesta',
  failed: 'Fallida',
  error: 'Error',
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return 'Desconocido'
  // Show last 4 digits masked
  if (phone.length > 6) {
    return `···${phone.slice(-4)}`
  }
  return phone
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
  } catch {
    return ''
  }
}

function CallLogRow({
  call,
  isNew,
  isExpanded,
  onToggle,
}: {
  call: CallLog
  isNew: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const derivedStatus = call.summary?.startsWith('BAPI') ? 'initiated' : (call.duration > 0 ? 'completed' : 'missed')
  const statusClass = callStatusColors[derivedStatus] || 'bg-stone-100 text-stone-500 border-stone-200'
  const statusLabel = callStatusLabels[derivedStatus] || derivedStatus

  return (
    <div
      className={`rounded-lg border transition-all ${isNew ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}`}
      style={{
        borderColor: isNew ? '#818cf8' : '#e8e2d6',
        background: isNew ? '#eef2ff' : '#ffffff',
      }}
    >
      {/* ── Main row ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-3 sm:p-3.5 text-left hover:bg-stone-50/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white text-sm shadow-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            📞
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate" style={{ color: '#1a1a1a' }}>
                {call.vapi_call_id ? `Llamada ${call.vapi_call_id.substring(0, 8)}…` : 'Llamada'}
              </p>
              <span className="text-xs flex-shrink-0" style={{ color: '#b0a898' }}>·</span>
              <span className="text-xs flex-shrink-0" style={{ color: '#8a8578' }}>
                {formatDuration(call.duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs" style={{ color: '#8a8578' }}>
                {formatCallTime(call.created_at)}
              </p>

            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] font-semibold border whitespace-nowrap ${statusClass}`}>
            {statusLabel}
          </span>
          <span className="text-xs" style={{ color: '#b0a898', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
      </button>

      {/* ── Expanded details ── */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#e8e2d6' }}>
          {/* Summary */}
          {call.summary && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8a8578' }}>
                Resumen IA
              </p>
              <p className="text-xs leading-relaxed p-2.5 rounded-lg" style={{ background: '#f5f3ee', color: '#3a3630' }}>
                {call.summary}
              </p>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8a8578' }}>
                Transcripción
              </p>
              <div
                className="text-xs leading-relaxed p-2.5 rounded-lg max-h-48 overflow-y-auto"
                style={{ background: '#f5f3ee', color: '#3a3630' }}
              >
                <pre className="whitespace-pre-wrap font-sans">{call.transcript}</pre>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px]" style={{ color: '#8a8578' }}>
            {call.vapi_call_id && (
              <span>🔗 {call.vapi_call_id.substring(0, 12)}…</span>
            )}
            <span>
              🕐 {new Date(call.created_at).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>
          </div>

          {/* No data */}
          {!call.summary && !call.transcript && (
            <p className="mt-3 text-xs italic" style={{ color: '#b0a898' }}>
              Sin resumen ni transcripción disponible para esta llamada.
            </p>
          )}
        </div>
      )}
    </div>
  )
}