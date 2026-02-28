'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { createRealtimeClient } from '@/lib/supabase'

interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  event_type: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  status: string
  total_amount: number
  deposit_amount: number
  personas: number
  table_id: string | null
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

const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'HOLD_BLOCKED', label: 'Pago Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'COMPLETED', label: 'Cerradas' },
  { value: 'CANCELED', label: 'Canceladas' },
  { value: 'NO_SHOW', label: 'No Show' },
]

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch('/api/reservations')
      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
      setLastUpdate(new Date())
    } catch {
      setReservations([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReservations()

    // Supabase Realtime — actualización en vivo
    let channel: any = null
    try {
      const realtimeClient = createRealtimeClient()
      channel = realtimeClient
        .channel('reservations-list')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setReservations(prev => [payload.new as Reservation, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Reservation
              setReservations(prev => prev.map(r => r.id === updated.id ? updated : r))
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id
              if (deletedId) setReservations(prev => prev.filter(r => r.id !== deletedId))
            }
            setLastUpdate(new Date())
          }
        )
        .subscribe()
    } catch (err) {
      console.error('[Reservations] Realtime error:', err)
    }

    // Polling cada 15s como respaldo
    const interval = setInterval(fetchReservations, 15000)

    return () => {
      clearInterval(interval)
      if (channel) channel.unsubscribe()
    }
  }, [fetchReservations])

  const filtered = reservations.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter
    const matchSearch = !search ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_phone?.includes(search) ||
      r.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      r.id?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  // Ordenar por fecha + hora
  const sorted = [...filtered].sort((a, b) => {
    const dateComp = (b.fecha || '').localeCompare(a.fecha || '')
    if (dateComp !== 0) return dateComp
    return (b.hora_inicio || '').localeCompare(a.hora_inicio || '')
  })

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reservas</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              {reservations.length} reservas en total
              <span className="ml-2 text-xs text-slate-400">
                🔴 En vivo · {lastUpdate.toLocaleTimeString('es-ES')}
              </span>
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-3 sm:p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, tipo o ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
              />
            </div>
            <div className="flex gap-2 flex-wrap overflow-x-auto pb-1 sm:pb-0">
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
          ) : sorted.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl">🔍</span>
              <p className="text-slate-500 mt-3 font-medium">No se encontraron reservas</p>
              <p className="text-sm text-slate-400 mt-1">Prueba con otros filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Personas</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mesa</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map(res => (
                    <tr key={res.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{res.customer_name || 'Sin nombre'}</p>
                          <p className="text-sm text-slate-500">{res.customer_phone || 'Sin teléfono'}</p>
                          {res.customer_email && <p className="text-xs text-slate-400">{res.customer_email}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{eventLabels[res.event_type] || res.event_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {res.fecha ? new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {res.hora_inicio || '—'} – {res.hora_fin || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">{res.personas}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{res.table_id || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">{res.total_amount ? `${res.total_amount.toFixed(2)}€` : '—'}</span>
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