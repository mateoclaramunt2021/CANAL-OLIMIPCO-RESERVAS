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
  table_id: string | null
}

const statusColors: Record<string, string> = {
  HOLD_BLOCKED: 'bg-amber-400',
  CONFIRMED: 'bg-emerald-400',
  CANCELED: 'bg-red-400',
  COMPLETED: 'bg-slate-400',
  NO_SHOW: 'bg-red-300',
}

const statusDot: Record<string, string> = {
  HOLD_BLOCKED: 'bg-amber-500',
  CONFIRMED: 'bg-emerald-500',
  CANCELED: 'bg-red-500',
  COMPLETED: 'bg-slate-500',
  NO_SHOW: 'bg-red-400',
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
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const days: { date: Date; inMonth: boolean }[] = []

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, inMonth: false })
  }
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true })
  }
  // Next month padding (fill to 42 for 6 rows)
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startDow - lastDay.getDate() + 1)
    days.push({ date: d, inMonth: false })
  }
  return days
}

function getWeekDays(baseDate: Date) {
  const start = new Date(baseDate)
  const dow = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dow)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TIME_SLOTS = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
]

export default function CalendarPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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

  const activeReservations = reservations.filter(r => r.status !== 'CANCELED')

  // Group by date
  const byDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of activeReservations) {
      if (!r.fecha) continue
      if (!map[r.fecha]) map[r.fecha] = []
      map[r.fecha].push(r)
    }
    return map
  }, [activeReservations])

  const today = toDateStr(new Date())

  // Month navigation
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month])
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const prevPeriod = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }
  const nextPeriod = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }
  const goToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(today)
  }

  const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const weekLabel = (() => {
    const wd = getWeekDays(currentDate)
    const s = wd[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    const e = wd[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${s} – ${e}`
  })()

  const selectedReservations = selectedDate ? (byDate[selectedDate] || []) : []

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Calendario</h1>
            <p className="text-slate-500 mt-1">Vista de reservas por fecha</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl border border-slate-200 p-1">
              <button onClick={() => setView('month')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Mes</button>
              <button onClick={() => setView('week')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Semana</button>
            </div>
            <Link href="/reservations/new" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              + Nueva Reserva
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={prevPeriod} className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600">←</button>
            <button onClick={nextPeriod} className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600">→</button>
            <button onClick={goToday} className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Hoy</button>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 capitalize">{view === 'month' ? monthLabel : weekLabel}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 mt-3 text-sm">Cargando...</p>
              </div>
            ) : view === 'month' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {DAYS.map(d => (
                    <div key={d} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {monthDays.map(({ date, inMonth }, idx) => {
                    const ds = toDateStr(date)
                    const ress = byDate[ds] || []
                    const isToday = ds === today
                    const isSelected = ds === selectedDate
                    const isClosed = date.getDay() === 1 || date.getDay() === 2 // Lunes/Martes

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(ds)}
                        className={`relative min-h-[90px] p-2 border-b border-r border-slate-100 text-left transition-all hover:bg-blue-50/50 ${
                          !inMonth ? 'bg-slate-50/50' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30' : ''}`}
                      >
                        <span className={`text-sm font-medium ${
                          isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' :
                          !inMonth ? 'text-slate-300' :
                          isClosed ? 'text-red-300' : 'text-slate-700'
                        }`}>
                          {date.getDate()}
                        </span>
                        {isClosed && inMonth && <span className="text-[9px] text-red-300 block">Cerrado</span>}
                        {/* Dots */}
                        {ress.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {ress.slice(0, 3).map(r => (
                              <div key={r.id} className={`h-1.5 rounded-full ${statusColors[r.status] || 'bg-slate-300'}`} />
                            ))}
                            {ress.length > 3 && <span className="text-[9px] text-slate-400">+{ress.length - 3} más</span>}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Week view */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="w-20 px-3 py-3 text-xs font-semibold text-slate-500">Hora</th>
                        {weekDays.map((d, i) => {
                          const ds = toDateStr(d)
                          const isToday = ds === today
                          const isClosed = d.getDay() === 1 || d.getDay() === 2
                          return (
                            <th key={i} className={`px-2 py-3 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                              <div className={`text-xs font-semibold ${isClosed ? 'text-red-300' : 'text-slate-500'}`}>{DAYS[i]}</div>
                              <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-600' : isClosed ? 'text-red-300' : 'text-slate-700'}`}>{d.getDate()}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map(slot => (
                        <tr key={slot} className="border-b border-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-400 font-mono">{slot}</td>
                          {weekDays.map((d, i) => {
                            const ds = toDateStr(d)
                            const ress = (byDate[ds] || []).filter(r => {
                              if (!r.hora_inicio) return false
                              return r.hora_inicio.substring(0, 5) === slot
                            })
                            return (
                              <td key={i} className={`px-1 py-1 ${toDateStr(d) === today ? 'bg-blue-50/30' : ''}`}>
                                {ress.map(r => (
                                  <Link key={r.id} href={`/reservations/${r.id}`} className={`block px-2 py-1 rounded-lg text-[10px] font-medium mb-0.5 truncate ${statusColors[r.status]} text-white hover:opacity-80 transition-opacity`}>
                                    {r.customer_name?.split(' ')[0] || '—'} ({r.personas})
                                  </Link>
                                ))}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 px-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs text-slate-500">Confirmada</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs text-slate-500">Pago pendiente</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-xs text-slate-500">Completada</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400"></div><span className="text-xs text-slate-500">Cancelada</span></div>
            </div>
          </div>

          {/* Selected day panel */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 sticky top-8">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                  : 'Selecciona un día'}
              </h3>
              {!selectedDate ? (
                <p className="text-sm text-slate-400">Haz clic en un día del calendario para ver sus reservas</p>
              ) : selectedReservations.length === 0 ? (
                <div className="text-center py-6">
                  <span className="text-3xl">📭</span>
                  <p className="text-sm text-slate-400 mt-2">Sin reservas este día</p>
                  <Link href="/reservations/new" className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Crear reserva</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedReservations
                    .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
                    .map(r => (
                      <Link key={r.id} href={`/reservations/${r.id}`} className="block p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusDot[r.status] || 'bg-slate-400'}`} />
                            <span className="text-sm font-semibold text-slate-900">{r.hora_inicio?.substring(0, 5) || '—'}</span>
                          </div>
                          <span className="text-xs text-slate-400">{eventLabels[r.event_type] || r.event_type}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 truncate">{r.customer_name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400">{r.personas} pers.{r.table_id ? ` · Mesa ${r.table_id}` : ''}</p>
                      </Link>
                    ))}
                  <div className="pt-2 border-t border-slate-100 mt-3">
                    <p className="text-xs text-slate-400">{selectedReservations.length} reserva{selectedReservations.length !== 1 ? 's' : ''} · {selectedReservations.reduce((s, r) => s + r.personas, 0)} personas</p>
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
