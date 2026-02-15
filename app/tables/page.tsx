'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface TableInfo {
  id: string
  zone: 'fuera' | 'dentro'
  capacity: number
  label: string
}

interface Reservation {
  id: string
  customer_name: string
  hora_inicio: string
  hora_fin: string
  personas: number
  status: string
  event_type: string
  table_id: string | null
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [selectedTime, setSelectedTime] = useState('14:00')

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    fetchSlotReservations()
  }, [selectedDate, selectedTime])

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables')
      const data = await res.json()
      setTables(data.tables || [])
    } catch {
      setTables([])
    }
  }

  const fetchSlotReservations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations?fecha=${selectedDate}`)
      const data = await res.json()
      const all = Array.isArray(data) ? data : []
      // Filter to overlapping with selected time slot
      const [h, m] = selectedTime.split(':').map(Number)
      const slotStart = h * 60 + m
      const slotEnd = slotStart + 120
      const overlapping = all.filter((r: Reservation) => {
        if (r.status === 'CANCELED') return false
        if (!r.hora_inicio) return false
        const [rh, rm] = r.hora_inicio.split(':').map(Number)
        const rStart = rh * 60 + rm
        const rEnd = r.hora_fin ? (() => { const [eh, em] = r.hora_fin.split(':').map(Number); return eh * 60 + em })() : rStart + 120
        return slotStart < rEnd && slotEnd > rStart
      })
      setReservations(overlapping)
    } catch {
      setReservations([])
    }
    setLoading(false)
  }

  const occupiedIds = new Set(reservations.map(r => r.table_id).filter(Boolean))
  const getReservationForTable = (tableId: string) => reservations.find(r => r.table_id === tableId)

  const fueraTables = tables.filter(t => t.zone === 'fuera')
  const dentroTables = tables.filter(t => t.zone === 'dentro')

  const freeCount = tables.filter(t => !occupiedIds.has(t.id)).length
  const occupiedCount = occupiedIds.size
  const totalPersonas = reservations.reduce((s, r) => s + r.personas, 0)

  const timeSlots = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00']

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mesas</h1>
            <p className="text-slate-500 mt-1">Estado de las {tables.length} mesas del restaurante</p>
          </div>
        </div>

        {/* Date/Time selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Hora</label>
              <div className="flex gap-1 flex-wrap">
                {timeSlots.map(ts => (
                  <button
                    key={ts}
                    onClick={() => setSelectedTime(ts)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedTime === ts ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {ts}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Total Mesas</p>
            <p className="text-2xl font-bold text-slate-900">{tables.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Libres</p>
            <p className="text-2xl font-bold text-emerald-600">{freeCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Ocupadas</p>
            <p className="text-2xl font-bold text-amber-600">{occupiedCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Personas Sentadas</p>
            <p className="text-2xl font-bold text-blue-600">{totalPersonas}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FUERA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">☀️</span>
                <h2 className="text-lg font-semibold text-slate-900">Terraza (Fuera)</h2>
                <span className="text-sm text-slate-400 ml-auto">{fueraTables.filter(t => !occupiedIds.has(t.id)).length}/{fueraTables.length} libres</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {fueraTables.map(table => {
                  const res = getReservationForTable(table.id)
                  const occupied = !!res
                  return (
                    <div key={table.id} className={`relative p-3 rounded-xl border-2 transition-all ${
                      occupied
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">{table.id}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${occupied ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      </div>
                      <p className="text-[10px] text-slate-500">{table.capacity} plazas</p>
                      {res && (
                        <Link href={`/reservations/${res.id}`} className="block mt-2 pt-2 border-t border-amber-200">
                          <p className="text-xs font-medium text-amber-800 truncate">{res.customer_name || 'Sin nombre'}</p>
                          <p className="text-[10px] text-amber-600">{res.hora_inicio?.substring(0, 5)} · {res.personas} pers.</p>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* DENTRO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏠</span>
                <h2 className="text-lg font-semibold text-slate-900">Interior (Dentro)</h2>
                <span className="text-sm text-slate-400 ml-auto">{dentroTables.filter(t => !occupiedIds.has(t.id)).length}/{dentroTables.length} libres</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {dentroTables.map(table => {
                  const res = getReservationForTable(table.id)
                  const occupied = !!res
                  return (
                    <div key={table.id} className={`relative p-3 rounded-xl border-2 transition-all ${
                      occupied
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">{table.id}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${occupied ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      </div>
                      <p className="text-[10px] text-slate-500">{table.capacity} plazas</p>
                      {res && (
                        <Link href={`/reservations/${res.id}`} className="block mt-2 pt-2 border-t border-amber-200">
                          <p className="text-xs font-medium text-amber-800 truncate">{res.customer_name || 'Sin nombre'}</p>
                          <p className="text-[10px] text-amber-600">{res.hora_inicio?.substring(0, 5)} · {res.personas} pers.</p>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
