'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Reservation {
  id: string
  start_datetime: string
  guests_estimated: number
  status: string
  event_type: string
  total_amount: number
}

const statusColors: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending_final: 'bg-blue-100 text-blue-700 border-blue-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  canceled: 'bg-red-100 text-red-700 border-red-200',
  no_show: 'bg-red-100 text-red-700 border-red-200',
}

const statusLabels: Record<string, string> = {
  pending_payment: 'Pago Pendiente',
  confirmed: 'Confirmada',
  pending_final: 'Pendiente Final',
  closed: 'Cerrada',
  canceled: 'Cancelada',
  no_show: 'No Show',
}

const eventLabels: Record<string, string> = {
  birthday: 'Cumpleaños',
  communion: 'Comunión',
  corporate: 'Corporativo',
  wedding: 'Boda',
  other: 'Otro',
}

export default function Dashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    const { data } = await supabase.from('reservations').select('*')
    setReservations(data || [])
    setLoading(false)
  }

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    pending: reservations.filter(r => r.status === 'pending_payment').length,
    revenue: reservations.reduce((sum, r) => sum + (r.total_amount || 0), 0),
  }

  const blocks = reservations.reduce((acc, res) => {
    const date = new Date(res.start_datetime).toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(res)
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
                <p className="text-sm font-medium text-slate-500">Pendientes</p>
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
              <h2 className="text-lg font-semibold text-slate-900">Reservas por Bloque</h2>
              <p className="text-sm text-slate-500 mt-0.5">Bloques de 2 horas</p>
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
                <p className="text-sm text-slate-400 mt-1">Las reservas aparecerán aquí cuando se creen</p>
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
                              {res.guests_estimated}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                                {new Date(res.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} — {eventLabels[res.event_type] || res.event_type}
                              </p>
                              <p className="text-sm text-slate-500">{res.guests_estimated} personas · {(res.total_amount || 0).toFixed(2)}€</p>
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