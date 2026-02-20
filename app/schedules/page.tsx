'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface Employee {
  id: string
  name: string
  role: string
  active: boolean
  pin: string | null
}

interface Shift {
  id: string
  employee_id: string
  week_start: string
  day_of_week: number
  start_time: string
  end_time: string
  notes: string | null
  employees?: { name: string; role: string }
}

interface ClockRecord {
  id: string
  employee_id: string
  clock_in: string
  clock_out: string | null
  employees?: { name: string; role: string }
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(t: string) {
  return t.slice(0, 5) // "09:00:00" → "09:00"
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function diffHours(start: string, end: string | null) {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function SchedulesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentMonday, setCurrentMonday] = useState<Date>(getMonday(new Date()))
  const [tab, setTab] = useState<'horarios' | 'fichar'>('horarios')

  // Shift modal
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftForm, setShiftForm] = useState({ employee_id: '', day_of_week: 0, start_time: '09:00', end_time: '17:00', notes: '' })
  const [savingShift, setSavingShift] = useState(false)

  // Clock
  const [clockEmployee, setClockEmployee] = useState('')
  const [clockPin, setClockPin] = useState('')
  const [clockLoading, setClockLoading] = useState(false)
  const [clockResult, setClockResult] = useState<{ action: string; name: string; time: string } | null>(null)

  const weekStr = toDateStr(currentMonday)

  const activeEmployees = useMemo(() => employees.filter(e => e.active), [employees])

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [empRes, shiftRes, clockRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/shifts?week=${weekStr}`),
        fetch(`/api/clock?date=${toDateStr(new Date())}`),
      ])

      if (empRes.ok) {
        const data = await empRes.json()
        setEmployees(Array.isArray(data) ? data : [])
      }
      if (shiftRes.ok) {
        const data = await shiftRes.json()
        setShifts(Array.isArray(data) ? data : [])
      }
      if (clockRes.ok) {
        const data = await clockRes.json()
        setClockRecords(Array.isArray(data) ? data : [])
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }, [weekStr])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Week navigation ──────────────────────────────────────────────
  const prevWeek = () => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() - 7)
    setCurrentMonday(d)
  }
  const nextWeek = () => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + 7)
    setCurrentMonday(d)
  }
  const thisWeek = () => setCurrentMonday(getMonday(new Date()))

  // ─── Shift CRUD ───────────────────────────────────────────────────
  const openShiftModal = (empId: string, day: number) => {
    const existing = shifts.find(s => s.employee_id === empId && s.day_of_week === day)
    setShiftForm({
      employee_id: empId,
      day_of_week: day,
      start_time: existing ? formatTime(existing.start_time) : '09:00',
      end_time: existing ? formatTime(existing.end_time) : '17:00',
      notes: existing?.notes || '',
    })
    setShowShiftModal(true)
  }

  const saveShift = async () => {
    setSavingShift(true)
    setError(null)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shiftForm, week_start: weekStr }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar turno')
      }
      setShowShiftModal(false)
      fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
    setSavingShift(false)
  }

  const deleteShift = async (empId: string, day: number) => {
    const existing = shifts.find(s => s.employee_id === empId && s.day_of_week === day)
    if (!existing) return
    try {
      await fetch(`/api/shifts?id=${existing.id}`, { method: 'DELETE' })
      fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // ─── Clock in/out ─────────────────────────────────────────────────
  const handleClock = async () => {
    if (!clockEmployee) return
    setClockLoading(true)
    setClockResult(null)
    setError(null)
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: clockEmployee, pin: clockPin || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al fichar')

      const emp = activeEmployees.find(e => e.id === clockEmployee)
      setClockResult({
        action: data.action,
        name: emp?.name || 'Empleado',
        time: formatDateTime(data.action === 'clock_in' ? data.record.clock_in : data.record.clock_out),
      })
      setClockPin('')
      fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
    setClockLoading(false)
  }

  // ─── Get shift for cell ───────────────────────────────────────────
  const getShift = (empId: string, day: number) =>
    shifts.find(s => s.employee_id === empId && s.day_of_week === day)

  // ─── Open clock record for an employee ────────────────────────────
  const getOpenClock = (empId: string) =>
    clockRecords.find(c => c.employee_id === empId && !c.clock_out)

  // ─── Week dates ───────────────────────────────────────────────────
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [currentMonday])

  const isThisWeek = toDateStr(getMonday(new Date())) === weekStr
  const selectedEmpHasPin = activeEmployees.find(e => e.id === clockEmployee)?.pin

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
              Horarios y Fichaje
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: '#8a8578' }}>
              Gestión semanal de turnos · Fichaje de empleados
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: '#e8e2d6' }}>
          {[
            { key: 'horarios' as const, label: '📅 Horarios', },
            { key: 'fichar' as const, label: '⏱️ Fichar', },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                background: tab === t.key ? '#faf9f6' : 'transparent',
                color: tab === t.key ? '#1a1a1a' : '#8a8578',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#B08D57', borderTopColor: 'transparent' }} />
            <p className="text-sm mt-3" style={{ color: '#8a8578' }}>Cargando…</p>
          </div>
        ) : tab === 'horarios' ? (
          /* ═══════════════════════════════════════════════════════════════
             TAB: HORARIOS — Weekly schedule grid
             ═══════════════════════════════════════════════════════════════ */
          <div>
            {/* Week navigation */}
            <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={prevWeek} className="px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm" style={{ borderColor: '#d4c9b0', color: '#5c5549' }}>
                  ← Anterior
                </button>
                {!isThisWeek && (
                  <button onClick={thisWeek} className="px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm" style={{ borderColor: '#d4c9b0', color: '#B08D57' }}>
                    Hoy
                  </button>
                )}
                <button onClick={nextWeek} className="px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm" style={{ borderColor: '#d4c9b0', color: '#5c5549' }}>
                  Siguiente →
                </button>
              </div>
              <h2 className="text-lg font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                Semana del {weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {weekDates[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
            </div>

            {activeEmployees.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
                <p className="text-4xl mb-3">👥</p>
                <p className="font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#5c5549' }}>
                  No hay empleados activos
                </p>
                <a href="/employees" className="text-sm mt-2 inline-block" style={{ color: '#B08D57' }}>
                  Ir a gestionar empleados →
                </a>
              </div>
            ) : (
              /* Schedule Grid */
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#e8e2d6' }}>
                <table className="w-full min-w-[800px] text-sm" style={{ background: '#faf9f6' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e8e2d6' }}>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#8a8578', background: '#f5f0e8', width: '160px' }}>
                        Empleado
                      </th>
                      {weekDates.map((d, i) => {
                        const isToday = toDateStr(d) === toDateStr(new Date())
                        return (
                          <th
                            key={i}
                            className="text-center px-2 py-3 font-medium"
                            style={{
                              color: isToday ? '#B08D57' : '#8a8578',
                              background: isToday ? 'rgba(176,141,87,0.08)' : '#f5f0e8',
                            }}
                          >
                            <div className="text-xs uppercase">{DAY_NAMES[i]}</div>
                            <div className="text-[10px] mt-0.5">{d.getDate()}/{d.getMonth() + 1}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmployees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f0ebe3' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
                            >
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: '#1a1a1a' }}>{emp.name}</p>
                              <p className="text-[10px]" style={{ color: '#b0a898' }}>{emp.role}</p>
                            </div>
                          </div>
                        </td>
                        {Array.from({ length: 7 }, (_, day) => {
                          const shift = getShift(emp.id, day)
                          const isToday = toDateStr(weekDates[day]) === toDateStr(new Date())
                          return (
                            <td
                              key={day}
                              className="px-1 py-2 text-center"
                              style={{ background: isToday ? 'rgba(176,141,87,0.04)' : 'transparent' }}
                            >
                              {shift ? (
                                <div
                                  className="group relative rounded-lg px-2 py-1.5 cursor-pointer transition-all hover:shadow-sm"
                                  style={{ background: 'rgba(107,144,128,0.1)', border: '1px solid rgba(107,144,128,0.2)' }}
                                  onClick={() => openShiftModal(emp.id, day)}
                                >
                                  <p className="text-[11px] font-medium" style={{ color: '#4a7c6a' }}>
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                  </p>
                                  {shift.notes && (
                                    <p className="text-[9px] truncate mt-0.5" style={{ color: '#8a8578' }}>{shift.notes}</p>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteShift(emp.id, day) }}
                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-100 text-red-500 text-[10px] hidden group-hover:flex items-center justify-center"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openShiftModal(emp.id, day)}
                                  className="w-full rounded-lg py-2 text-[10px] border border-dashed transition-all hover:border-solid"
                                  style={{ borderColor: '#d4c9b0', color: '#b0a898' }}
                                >
                                  + Turno
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Shift Modal */}
            {showShiftModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowShiftModal(false)}>
                <div
                  className="rounded-2xl p-6 w-full max-w-sm shadow-xl"
                  style={{ background: '#faf9f6', border: '1px solid #e8e2d6' }}
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-lg font-light mb-4" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                    Turno — {DAY_NAMES_FULL[shiftForm.day_of_week]}
                  </h3>
                  <p className="text-xs mb-4" style={{ color: '#8a8578' }}>
                    {activeEmployees.find(e => e.id === shiftForm.employee_id)?.name}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-medium uppercase" style={{ color: '#8a8578' }}>Entrada</label>
                      <input
                        type="time"
                        value={shiftForm.start_time}
                        onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase" style={{ color: '#8a8578' }}>Salida</label>
                      <input
                        type="time"
                        value={shiftForm.end_time}
                        onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-[10px] font-medium uppercase" style={{ color: '#8a8578' }}>Notas</label>
                    <input
                      type="text"
                      value={shiftForm.notes}
                      onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                      placeholder="Ej: turno partido, barra, etc."
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: '#d4c9b0', color: '#5c5549' }}>
                      Cancelar
                    </button>
                    <button
                      onClick={saveShift}
                      disabled={savingShift}
                      className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
                    >
                      {savingShift ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
             TAB: FICHAR — Clock in / out
             ═══════════════════════════════════════════════════════════════ */
          <div className="max-w-lg mx-auto">
            {/* Clock Card */}
            <div
              className="rounded-2xl p-6 sm:p-8 text-center shadow-md"
              style={{ background: '#faf9f6', border: '1px solid #e8e2d6' }}
            >
              <div className="text-5xl mb-4">⏱️</div>
              <h2 className="text-2xl font-light mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                Fichar Entrada / Salida
              </h2>
              <p className="text-sm mb-6" style={{ color: '#8a8578' }}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {activeEmployees.length === 0 ? (
                <p className="text-sm" style={{ color: '#8a8578' }}>No hay empleados activos</p>
              ) : (
                <div className="space-y-4">
                  <select
                    value={clockEmployee}
                    onChange={e => { setClockEmployee(e.target.value); setClockResult(null) }}
                    className="w-full px-4 py-3 rounded-xl border text-sm"
                    style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                  >
                    <option value="">Selecciona empleado…</option>
                    {activeEmployees.map(e => {
                      const open = getOpenClock(e.id)
                      return (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.role}){open ? ' — ⏰ Fichado' : ''}
                        </option>
                      )
                    })}
                  </select>

                  {selectedEmpHasPin && (
                    <input
                      type="password"
                      value={clockPin}
                      onChange={e => setClockPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-3 rounded-xl border text-sm text-center font-mono tracking-[0.5em]"
                      style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                      placeholder="PIN"
                      maxLength={4}
                    />
                  )}

                  <button
                    onClick={handleClock}
                    disabled={!clockEmployee || clockLoading}
                    className="w-full py-4 text-lg font-medium text-white rounded-xl transition-all disabled:opacity-40 hover:shadow-lg active:scale-[0.98]"
                    style={{
                      background: clockEmployee && getOpenClock(clockEmployee)
                        ? 'linear-gradient(135deg, #c0392b, #a93226)'
                        : 'linear-gradient(135deg, #27ae60, #219a52)',
                    }}
                  >
                    {clockLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fichando…
                      </span>
                    ) : clockEmployee && getOpenClock(clockEmployee) ? (
                      '🔴 Fichar SALIDA'
                    ) : (
                      '🟢 Fichar ENTRADA'
                    )}
                  </button>

                  {/* Clock result toast */}
                  {clockResult && (
                    <div
                      className="mt-4 p-4 rounded-xl text-sm font-medium animate-bounce"
                      style={{
                        background: clockResult.action === 'clock_in' ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)',
                        color: clockResult.action === 'clock_in' ? '#27ae60' : '#c0392b',
                        border: `1px solid ${clockResult.action === 'clock_in' ? '#c0e0d0' : '#e8c9c9'}`,
                      }}
                    >
                      {clockResult.action === 'clock_in' ? '✅' : '🏠'}{' '}
                      {clockResult.name} — {clockResult.action === 'clock_in' ? 'Entrada' : 'Salida'} registrada a las {clockResult.time}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Today's records */}
            <div className="mt-8">
              <h3 className="text-lg font-light mb-4" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                Fichajes de hoy
              </h3>
              {clockRecords.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#8a8578' }}>
                  Sin fichajes hoy
                </p>
              ) : (
                <div className="space-y-2">
                  {clockRecords.map(rec => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-3 rounded-xl border"
                      style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${rec.clock_out ? 'bg-stone-400' : 'bg-emerald-500 animate-pulse'}`}
                        />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                            {rec.employees?.name || 'Empleado'}
                          </p>
                          <p className="text-xs" style={{ color: '#8a8578' }}>
                            {rec.employees?.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm" style={{ color: '#1a1a1a' }}>
                          🟢 {formatDateTime(rec.clock_in)}
                          {rec.clock_out && (
                            <span> → 🔴 {formatDateTime(rec.clock_out)}</span>
                          )}
                        </p>
                        {rec.clock_out && (
                          <p className="text-xs font-medium" style={{ color: '#B08D57' }}>
                            {diffHours(rec.clock_in, rec.clock_out)}
                          </p>
                        )}
                        {!rec.clock_out && (
                          <p className="text-[10px] font-medium" style={{ color: '#27ae60' }}>
                            Trabajando…
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
