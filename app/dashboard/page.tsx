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
  deposit_paid: boolean
  payment_deadline: string | null
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [newReservationFlash, setNewReservationFlash] = useState<string | null>(null)

  const fetchReservations = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/reservations')
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
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
    try {
      const realtimeClient = createRealtimeClient()
      channel = realtimeClient
        .channel('reservations-dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations' },
          (payload: any) => {
            console.log('[Realtime] Change received:', payload.eventType)
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
          console.log('[Realtime] Status:', status)
          setRealtimeConnected(status === 'SUBSCRIBED')
        })
    } catch (err) {
      console.error('[Realtime] Setup error:', err)
    }

    // Auto-refresh every 30s as fallback
    const interval = setInterval(fetchReservations, 30000)

    return () => {
      clearInterval(interval)
      if (channel) channel.unsubscribe()
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
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
              Panel de Reservas
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm" style={{ color: '#8a8578' }}>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setLoading(true); fetchReservations() }}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-all hover:shadow-sm"
              style={{ borderColor: '#d4c9b0', color: '#5c5549' }}
            >
              ↻ Actualizar
            </button>
            <Link
              href="/reservations/new"
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all hover:shadow-md"
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Hoy', value: todayReservations.length, sub: `${todayPersonas} personas`, accent: '#1a1a1a' },
            { label: 'Mañana', value: tomorrowReservations.length, sub: `${tomorrowPersonas} personas`, accent: '#B08D57' },
            { label: 'Confirmadas', value: stats.confirmed, sub: 'total activas', accent: '#6b9080' },
            { label: 'Pago pendiente', value: stats.pending, sub: 'por cobrar', accent: '#c4802f' },
            { label: 'Ingresos', value: `${stats.revenue.toFixed(0)}€`, sub: 'estimados', accent: '#B08D57' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl p-5 border transition-all hover:shadow-sm"
              style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>{stat.label}</p>
              <p className="text-3xl font-light mt-1" style={{ fontFamily: 'Cormorant Garamond, serif', color: stat.accent }}>
                {stat.value}
              </p>
              <p className="text-xs mt-1" style={{ color: '#b0a898' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#B08D57', borderTopColor: 'transparent' }}></div>
            <p className="text-sm mt-3" style={{ color: '#8a8578' }}>Cargando reservas…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Main content (2 cols) ── */}
            <div className="lg:col-span-2 space-y-6">

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
            </div>

            {/* ── Sidebar (1 col) ── */}
            <div className="space-y-6">

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
      className={`flex items-center justify-between p-3.5 rounded-lg border transition-all hover:shadow-sm group ${isNew ? 'animate-flash-gold' : ''}`}
      style={{
        borderColor: isNew ? '#B08D57' : '#e8e2d6',
        background: isNew ? '#fdf6e8' : '#ffffff',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
        >
          {r.personas}
        </div>
        <div>
          <p className="text-sm font-medium group-hover:underline" style={{ color: '#1a1a1a' }}>
            {r.hora_inicio?.substring(0, 5)} — {r.customer_name || 'Sin nombre'}
          </p>
          <p className="text-xs" style={{ color: '#8a8578' }}>
            {eventIcons[r.event_type] || '📋'} {eventLabels[r.event_type] || r.event_type}
            {r.table_id ? ` · Mesa ${r.table_id}` : ''}
          </p>
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${statusColors[r.status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
        {statusLabels[r.status] || r.status}
      </span>
    </Link>
  )
}