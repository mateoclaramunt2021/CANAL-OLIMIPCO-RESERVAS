'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface Employee {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  pin: string | null
  active: boolean
  created_at: string
}

const roleOptions = ['camarero', 'cocinero', 'barra', 'encargado', 'limpieza', 'dj', 'seguridad', 'otro']

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({ name: '', role: 'camarero', phone: '', email: '', pin: '' })

  const fetchEmployees = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Error al cargar empleados')
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const resetForm = () => {
    setForm({ name: '', role: 'camarero', phone: '', email: '', pin: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      role: emp.role,
      phone: emp.phone || '',
      email: emp.email || '',
      pin: emp.pin || '',
    })
    setEditingId(emp.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      resetForm()
      fetchEmployees()
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleToggleActive = async (emp: Employee) => {
    try {
      await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id, active: !emp.active }),
      })
      fetchEmployees()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este empleado? Se borrarán sus turnos y fichajes.')) return
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      fetchEmployees()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const activeCount = employees.filter(e => e.active).length

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
              Empleados
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: '#8a8578' }}>
              {employees.length} empleados · {activeCount} activos
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all hover:shadow-md whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
          >
            + Nuevo Empleado
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── Form Modal ── */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
            <div
              className="rounded-2xl p-6 w-full max-w-md shadow-xl"
              style={{ background: '#faf9f6', border: '1px solid #e8e2d6' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-light mb-5" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a' }}>
                {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>Nombre *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                    placeholder="Nombre completo"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>Rol</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>Teléfono</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                      placeholder="600123456"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>PIN (4 dígitos)</label>
                    <input
                      type="text"
                      value={form.pin}
                      onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 font-mono tracking-widest text-center"
                      style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                      placeholder="••••"
                      maxLength={4}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8578' }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: '#d4c9b0', background: '#fff', color: '#1a1a1a' }}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm rounded-lg border transition-colors"
                  style={{ borderColor: '#d4c9b0', color: '#5c5549' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
                >
                  {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Employee List ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#B08D57', borderTopColor: 'transparent' }} />
            <p className="text-sm mt-3" style={{ color: '#8a8578' }}>Cargando empleados…</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}>
            <p className="text-4xl mb-3">👥</p>
            <p className="text-lg font-light" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#5c5549' }}>
              Sin empleados registrados
            </p>
            <p className="text-sm mt-1" style={{ color: '#8a8578' }}>
              Añade tu primer empleado con el botón de arriba
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map(emp => (
              <div
                key={emp.id}
                className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all ${!emp.active ? 'opacity-50' : ''}`}
                style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}
              >
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium text-sm"
                    style={{ background: emp.active ? 'linear-gradient(135deg, #B08D57, #96784a)' : '#b0a898' }}
                  >
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1a1a1a' }}>{emp.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(176,141,87,0.1)', color: '#96784a' }}
                      >
                        {emp.role}
                      </span>
                      {emp.phone && (
                        <span className="text-xs" style={{ color: '#8a8578' }}>📞 {emp.phone}</span>
                      )}
                      {emp.pin && (
                        <span className="text-xs" style={{ color: '#8a8578' }}>🔑 PIN</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(emp)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all"
                    style={{
                      borderColor: emp.active ? '#c0e0d0' : '#d4c9b0',
                      color: emp.active ? '#27ae60' : '#8a8578',
                      background: emp.active ? 'rgba(39,174,96,0.05)' : 'transparent',
                    }}
                  >
                    {emp.active ? '✓ Activo' : '○ Inactivo'}
                  </button>
                  <button
                    onClick={() => handleEdit(emp)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-all"
                    style={{ borderColor: '#d4c9b0', color: '#5c5549' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-all hover:bg-red-50"
                    style={{ borderColor: '#e8c9c9', color: '#c0392b' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
