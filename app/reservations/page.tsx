'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

interface Reservation {
  id: string
  event_type: string
  start_datetime: string
  status: string
  total_amount: number
  deposit_amount: number
  guests_estimated: number
  clients: { name: string; phone: string }
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

const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'pending_payment', label: 'Pago Pendiente' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'pending_final', label: 'Pendiente Final' },
  { value: 'closed', label: 'Cerradas' },
  { value: 'canceled', label: 'Canceladas' },
]

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    const { data } = await supabase.from('reservations').select('*, clients(name, phone)')
    setReservations(data || [])
    setLoading(false)
  }

  const filtered = reservations.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter
    const matchSearch = !search ||
      r.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.clients?.phone?.includes(search) ||
      r.event_type?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reservas</h1>
            <p className="text-slate-500 mt-1">{reservations.length} reservas en total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    filter === f.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 mt-3 text-sm">Cargando reservas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl">🔍</span>
              <p className="text-slate-500 mt-3 font-medium">No se encontraron reservas</p>
              <p className="text-sm text-slate-400 mt-1">Prueba con otros filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Personas</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(res => (
                    <tr key={res.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{res.clients?.name || 'Sin nombre'}</p>
                          <p className="text-sm text-slate-500">{res.clients?.phone || 'Sin teléfono'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{eventLabels[res.event_type] || res.event_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(res.start_datetime).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(res.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">{res.guests_estimated}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">{(res.total_amount || 0).toFixed(2)}€</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusColors[res.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {statusLabels[res.status] || res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/reservations/${res.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Ver detalle →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}