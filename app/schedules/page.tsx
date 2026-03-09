import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
function formatTime(t: string) { return t.slice(0, 5) }
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function diffHours(start: string, end: string | null) {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ tab?: string; week?: string; ok?: string; error?: string; shift_emp?: string; shift_day?: string }> }) {
  const params = await searchParams
  const tab = params.tab === 'fichar' ? 'fichar' : 'horarios'

  const now = new Date()
  const todayStr = toDateStr(now)
  const defaultMonday = getMonday(now)
  let currentMonday = defaultMonday
  if (params.week) {
    const [y, m, d] = params.week.split('-').map(Number)
    if (y && m && d) currentMonday = new Date(y, m - 1, d)
  }
  const weekStr = toDateStr(currentMonday)

  const prevMonday = new Date(currentMonday); prevMonday.setDate(prevMonday.getDate() - 7)
  const nextMonday = new Date(currentMonday); nextMonday.setDate(nextMonday.getDate() + 7)
  const isThisWeek = toDateStr(defaultMonday) === weekStr

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentMonday); d.setDate(d.getDate() + i); return d
  })

  // Fetch data server-side
  const [empRes, shiftRes, clockRes] = await Promise.all([
    supabaseAdmin.from('employees').select('*').eq('active', true).order('name'),
    supabaseAdmin.from('shifts').select('*, employees(name, role)').eq('week_start', weekStr).order('day_of_week').order('start_time'),
    supabaseAdmin.from('clock_records').select('*, employees(name, role)').gte('clock_in', `${todayStr}T00:00:00`).lt('clock_in', `${todayStr}T23:59:59`).order('clock_in', { ascending: false }),
  ])

  const activeEmployees = empRes.data || []
  const shifts = shiftRes.data || []
  const clockRecords = clockRes.data || []

  const getShift = (empId: string, day: number) => shifts.find((s: any) => s.employee_id === empId && s.day_of_week === day)
  const getOpenClock = (empId: string) => clockRecords.find((c: any) => c.employee_id === empId && !c.clock_out)

  // Inline shift form state via URL params
  const editEmp = params.shift_emp || null
  const editDay = params.shift_day !== undefined ? Number(params.shift_day) : null
  const editShift = editEmp && editDay !== null ? getShift(editEmp, editDay) : null

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 300, fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a', margin: 0 }}>
            Horarios y Fichaje
          </h1>
          <p style={{ fontSize: '13px', color: '#8a8578', marginTop: '4px' }}>
            Gestión semanal de turnos · Fichaje de empleados
          </p>
        </div>

        {params.ok && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(39,174,96,0.05)', border: '1px solid #c0e0d0', color: '#27ae60', fontSize: '14px' }}>
            {params.ok}
          </div>
        )}
        {params.error && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#c0392b', fontSize: '14px' }}>
            ⚠️ {params.error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', padding: '4px', borderRadius: '12px', background: '#e8e2d6', width: 'fit-content' }}>
          <a href={`/schedules?tab=horarios&week=${weekStr}`}
            style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, borderRadius: '8px', textDecoration: 'none',
              background: tab === 'horarios' ? '#faf9f6' : 'transparent', color: tab === 'horarios' ? '#1a1a1a' : '#8a8578',
              boxShadow: tab === 'horarios' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            📅 Horarios
          </a>
          <a href="/schedules?tab=fichar"
            style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, borderRadius: '8px', textDecoration: 'none',
              background: tab === 'fichar' ? '#faf9f6' : 'transparent', color: tab === 'fichar' ? '#1a1a1a' : '#8a8578',
              boxShadow: tab === 'fichar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            ⏱️ Fichar
          </a>
        </div>

        {tab === 'horarios' ? (
          <div>
            {/* Week navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a href={`/schedules?tab=horarios&week=${toDateStr(prevMonday)}`}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '13px', color: '#5c5549', textDecoration: 'none' }}>
                  ← Anterior
                </a>
                {!isThisWeek && (
                  <a href="/schedules?tab=horarios"
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '13px', color: '#B08D57', textDecoration: 'none' }}>
                    Hoy
                  </a>
                )}
                <a href={`/schedules?tab=horarios&week=${toDateStr(nextMonday)}`}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '13px', color: '#5c5549', textDecoration: 'none' }}>
                  Siguiente →
                </a>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 300, fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a', margin: 0 }}>
                Semana del {weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {weekDates[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
            </div>

            {activeEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', borderRadius: '16px', border: '1px solid #e8e2d6', background: '#faf9f6' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>👥</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#5c5549' }}>No hay empleados activos</p>
                <a href="/employees" style={{ fontSize: '14px', color: '#B08D57', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
                  Ir a gestionar empleados →
                </a>
              </div>
            ) : (
              <>
                {/* Inline shift form */}
                {editEmp && editDay !== null && (
                  <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', background: '#faf9f6', border: '1px solid #e8e2d6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 300, fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a', margin: 0 }}>
                        Turno — {DAY_NAMES_FULL[editDay]} — {activeEmployees.find((e: any) => e.id === editEmp)?.name || ''}
                      </h3>
                      <a href={`/schedules?tab=horarios&week=${weekStr}`} style={{ fontSize: '13px', color: '#5c5549', textDecoration: 'none' }}>✕ Cerrar</a>
                    </div>
                    <form method="POST" action="/api/shifts/action" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                      <input type="hidden" name="_action" value="create" />
                      <input type="hidden" name="week" value={weekStr} />
                      <input type="hidden" name="tab" value="horarios" />
                      <input type="hidden" name="employee_id" value={editEmp} />
                      <input type="hidden" name="day_of_week" value={String(editDay)} />
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block' }}>Entrada</label>
                        <input type="time" name="start_time" defaultValue={editShift ? formatTime(editShift.start_time) : '09:00'}
                          style={{ marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', color: '#1a1a1a' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block' }}>Salida</label>
                        <input type="time" name="end_time" defaultValue={editShift ? formatTime(editShift.end_time) : '17:00'}
                          style={{ marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', color: '#1a1a1a' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block' }}>Notas</label>
                        <input type="text" name="notes" defaultValue={editShift?.notes || ''} placeholder="Ej: turno partido, barra..."
                          style={{ marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', color: '#1a1a1a', width: '100%', boxSizing: 'border-box' }} />
                      </div>
                      <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #B08D57, #96784a)', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                        Guardar
                      </button>
                    </form>
                  </div>
                )}

                {/* Schedule Grid */}
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e8e2d6' }}>
                  <table style={{ width: '100%', minWidth: '800px', fontSize: '13px', background: '#faf9f6', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e8e2d6' }}>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500, color: '#8a8578', background: '#f5f0e8', width: '160px' }}>Empleado</th>
                        {weekDates.map((d, i) => {
                          const isToday = toDateStr(d) === todayStr
                          return (
                            <th key={i} style={{ textAlign: 'center', padding: '8px', fontWeight: 500, color: isToday ? '#B08D57' : '#8a8578', background: isToday ? 'rgba(176,141,87,0.08)' : '#f5f0e8' }}>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase' }}>{DAY_NAMES[i]}</div>
                              <div style={{ fontSize: '10px', marginTop: '2px' }}>{d.getDate()}/{d.getMonth() + 1}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map((emp: any) => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #f0ebe3' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #B08D57, #96784a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <p style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{emp.name}</p>
                                <p style={{ fontSize: '10px', color: '#b0a898', margin: 0 }}>{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          {Array.from({ length: 7 }, (_, day) => {
                            const shift = getShift(emp.id, day)
                            const isToday = toDateStr(weekDates[day]) === todayStr
                            return (
                              <td key={day} style={{ padding: '4px', textAlign: 'center', background: isToday ? 'rgba(176,141,87,0.04)' : 'transparent' }}>
                                {shift ? (
                                  <div style={{ position: 'relative', borderRadius: '8px', padding: '6px 8px', background: 'rgba(107,144,128,0.1)', border: '1px solid rgba(107,144,128,0.2)' }}>
                                    <a href={`/schedules?tab=horarios&week=${weekStr}&shift_emp=${emp.id}&shift_day=${day}`}
                                      style={{ fontSize: '11px', fontWeight: 500, color: '#4a7c6a', textDecoration: 'none', display: 'block' }}>
                                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                    </a>
                                    {shift.notes && <p style={{ fontSize: '9px', color: '#8a8578', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shift.notes}</p>}
                                    <form method="POST" action="/api/shifts/action" style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
                                      <input type="hidden" name="_action" value="delete" />
                                      <input type="hidden" name="id" value={shift.id} />
                                      <input type="hidden" name="week" value={weekStr} />
                                      <input type="hidden" name="tab" value="horarios" />
                                      <button type="submit" style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', fontSize: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                                    </form>
                                  </div>
                                ) : (
                                  <a href={`/schedules?tab=horarios&week=${weekStr}&shift_emp=${emp.id}&shift_day=${day}`}
                                    style={{ display: 'block', padding: '8px', borderRadius: '8px', border: '1px dashed #d4c9b0', fontSize: '10px', color: '#b0a898', textDecoration: 'none' }}>
                                    + Turno
                                  </a>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ═══ TAB: FICHAR ═══ */
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ borderRadius: '16px', padding: '32px', textAlign: 'center', background: '#faf9f6', border: '1px solid #e8e2d6', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱️</div>
              <h2 style={{ fontSize: '24px', fontWeight: 300, fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a', margin: '0 0 4px' }}>
                Fichar Entrada / Salida
              </h2>
              <p style={{ fontSize: '14px', color: '#8a8578', marginBottom: '24px' }}>
                {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {activeEmployees.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#8a8578' }}>No hay empleados activos</p>
              ) : (
                <form method="POST" action="/api/clock/action" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <select name="employee_id" required
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', color: '#1a1a1a' }}>
                    <option value="">Selecciona empleado…</option>
                    {activeEmployees.map((e: any) => {
                      const open = getOpenClock(e.id)
                      return (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.role}){open ? ' — ⏰ Fichado' : ''}
                        </option>
                      )
                    })}
                  </select>
                  <input type="password" name="pin" maxLength={4} placeholder="PIN (si aplica)"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', color: '#1a1a1a', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.5em', boxSizing: 'border-box' }} />
                  <button type="submit"
                    style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 500, color: '#fff', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #27ae60, #219a52)' }}>
                    🟢 Fichar
                  </button>
                </form>
              )}
            </div>

            {/* Today's records */}
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 300, fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a', marginBottom: '16px' }}>
                Fichajes de hoy
              </h3>
              {clockRecords.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#8a8578', textAlign: 'center', padding: '24px' }}>Sin fichajes hoy</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clockRecords.map((rec: any) => (
                    <div key={rec.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: '#faf9f6', border: '1px solid #e8e2d6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: rec.clock_out ? '#a8a29e' : '#10b981' }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{rec.employees?.name || 'Empleado'}</p>
                          <p style={{ fontSize: '12px', color: '#8a8578', margin: 0 }}>{rec.employees?.role}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', color: '#1a1a1a', margin: 0 }}>
                          🟢 {formatDateTime(rec.clock_in)}
                          {rec.clock_out && <span> → 🔴 {formatDateTime(rec.clock_out)}</span>}
                        </p>
                        {rec.clock_out ? (
                          <p style={{ fontSize: '12px', fontWeight: 500, color: '#B08D57', margin: '2px 0 0' }}>{diffHours(rec.clock_in, rec.clock_out)}</p>
                        ) : (
                          <p style={{ fontSize: '10px', fontWeight: 500, color: '#27ae60', margin: '2px 0 0' }}>Trabajando…</p>
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
