'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

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
}

const statusColors: Record<string, string> = {
  HOLD_BLOCKED: 'bg-amber-100 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELED: 'bg-red-100 text-red-700 border-red-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
  NO_SHOW: 'bg-red-100 text-red-700 border-red-200',
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

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Dashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations')
      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
    } catch {
      setReservations([])
    }
    setLoading(false)
  }

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

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    pending: pendingPayments.length,
    todayPersonas: todayReservations.reduce((s, r) => s + r.personas, 0),
    revenue: reservations
      .filter(r => r.status !== 'CANCELED')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0),
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <Link href="/reservations/new" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            + Nueva Reserva
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Hoy</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{todayReservations.length}</p>
            <p className="text-xs text-slate-400 mt-1">{stats.todayPersonas} personas</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Mañana</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{tomorrowReservations.length}</p>
            <p className="text-xs text-slate-400 mt-1">{tomorrowReservations.reduce((s, r) => s + r.personas, 0)} personas</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Confirmadas</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Pago Pendiente</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Ingresos</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.revenue.toFixed(0)}€</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's reservations */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                    <h2 className="text-base font-semibold text-slate-900">Hoy — {todayReservations.length} reservas</h2>
                  </div>
                  <Link href="/calendar" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Ver calendario →</Link>
                </div>
                <div className="p-4">
                  {todayReservations.length === 0 ? (
                    <p className="text-center py-8 text-sm text-slate-400">Sin reservas para hoy</p>
                  ) : (
                    <div className="space-y-2">
                      {todayReservations.map(r => (
                        <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {r.personas}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700">{r.hora_inicio?.substring(0, 5)} — {r.customer_name || 'Sin nombre'}</p>
                              <p className="text-xs text-slate-500">{eventLabels[r.event_type] || r.event_type}{r.table_id ? ` · Mesa ${r.table_id}` : ''}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${statusColors[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {statusLabels[r.status] || r.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tomorrow preview */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">Mañana — {tomorrowReservations.length} reservas</h2>
                </div>
                <div className="p-4">
                  {tomorrowReservations.length === 0 ? (
                    <p className="text-center py-6 text-sm text-slate-400">Sin reservas para mañana</p>
                  ) : (
                    <div className="space-y-2">
                      {tomorrowReservations.map(r => (
                        <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-600 w-12">{r.hora_inicio?.substring(0, 5)}</span>
                            <span className="text-sm text-slate-900">{r.customer_name || 'Sin nombre'}</span>
                            <span className="text-xs text-slate-400">{r.personas} pers.</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${statusColors[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {statusLabels[r.status] || r.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts sidebar */}
            <div className="space-y-6">
              {/* Pending payments alert */}
              {pendingPayments.length > 0 && (
                <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-5">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3">⚠️ Pagos pendientes ({pendingPayments.length})</h3>
                  <div className="space-y-2">
                    {pendingPayments.slice(0, 5).map(r => (
                      <Link key={r.id} href={`/reservations/${r.id}`} className="block p-3 bg-white rounded-xl border border-amber-200 hover:bg-amber-50 transition-colors">
                        <p className="text-sm font-medium text-slate-900">{r.customer_name || 'Sin nombre'}</p>
                        <p className="text-xs text-amber-700">{r.fecha} · {r.deposit_amount?.toFixed(2) || '—'}€ señal</p>
                        {r.payment_deadline && (
                          <p className="text-[10px] text-red-600 mt-1">Vence: {new Date(r.payment_deadline).toLocaleDateString('es-ES')}</p>
                        )}
                      </Link>
                    ))}
                    {pendingPayments.length > 5 && (
                      <p className="text-xs text-amber-600 pt-1">+{pendingPayments.length - 5} más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Accesos rápidos</h3>
                <div className="space-y-2">
                  <Link href="/reservations/new" className="block p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">➕ Nueva Reserva</Link>
                  <Link href="/calendar" className="block p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">📅 Calendario</Link>
                  <Link href="/tables" className="block p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">🪑 Mesas</Link>
                  <Link href="/payments" className="block p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">💳 Pagos</Link>
                </div>
              </div>

              {/* Stats summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Resumen total</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reservas totales</span>
                    <span className="font-bold text-slate-900">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Activas</span>
                    <span className="font-bold text-emerald-600">{active.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Canceladas</span>
                    <span className="font-bold text-red-600">{reservations.filter(r => r.status === 'CANCELED').length}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Ingresos estimados</span>
                    <span className="font-bold text-blue-600">{stats.revenue.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}