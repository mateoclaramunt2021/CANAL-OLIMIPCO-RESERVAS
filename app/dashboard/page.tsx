'use client'

import { useEffect, useState } from 'react'
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
  RESERVA_NORMAL: 'Reserva Normal',
  INFANTIL_CUMPLE: 'Infantil / Cumple',
  GRUPO_SENTADO: 'Grupo Sentado',
  GRUPO_PICA_PICA: 'Grupo Pica-Pica',
  NOCTURNA_EXCLUSIVA: 'Nocturna Exclusiva',
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

  // Solo reservas activas (no canceladas)
  const active = reservations.filter(r => r.status !== 'CANCELED')

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    pending: reservations.filter(r => r.status === 'HOLD_BLOCKED').length,
    revenue: reservations
      .filter(r => r.status !== 'CANCELED')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0),
  }

  // Agrupar por fecha
  const blocks = active
    .sort((a, b) => {
      const dateComp = (a.fecha || '').localeCompare(b.fecha || '')
      if (dateComp !== 0) return dateComp
      return (a.hora_inicio || '').localeCompare(b.hora_inicio || '')
    })
    .reduce((acc, res) => {
      const dateStr = res.fecha
        ? new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })
        : 'Sin fecha'
      if (!acc[dateStr]) acc[dateStr] = []
      acc[dateStr].push(res)
      return acc
    }, {} as Record<string, Reservation[]>)

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen general del sistema de reservas</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Reservas</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Confirmadas</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.confirmed}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pendientes Pago</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Ingresos</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.revenue.toFixed(2)}€</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reservas por Fecha</h2>
              <p className="text-sm text-slate-500 mt-0.5">Próximas reservas agrupadas por día</p>
            </div>
            <Link href="/reservations" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 mt-3 text-sm">Cargando reservas...</p>
              </div>
            ) : Object.keys(blocks).length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">📭</span>
                <p className="text-slate-500 mt-3 font-medium">No hay reservas registradas</p>
                <p className="text-sm text-slate-400 mt-1">Las reservas aparecerán aquí cuando se creen via WhatsApp, VAPI o la API</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(blocks).map(([date, ress]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">{date}</h3>
                    <div className="space-y-2">
                      {ress.map(res => (
                        <Link href={`/reservations/${res.id}`} key={res.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200/50 transition-all duration-200 group cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {res.personas}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                                {res.hora_inicio || '—'} — {res.customer_name || 'Sin nombre'}
                              </p>
                              <p className="text-sm text-slate-500">
                                {eventLabels[res.event_type] || res.event_type} · {res.personas} personas
                                {res.table_id ? ` · Mesa ${res.table_id}` : ''}
                                {res.total_amount ? ` · ${res.total_amount.toFixed(2)}€` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusColors[res.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {statusLabels[res.status] || res.status}
                            </span>
                            <span className="text-slate-300 group-hover:text-blue-400 transition-colors">→</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}