'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import EditableField from '@/components/ui/EditableField'

interface Reservation {
  id: string
  reservation_number: string | null
  event_type: string
  customer_name: string
  customer_phone: string
  customer_email: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  status: string
  total_amount: number
  deposit_amount: number
  personas: number
  table_id: string | null
  menu_code: string | null
  menu_payload: any
  payment_deadline: string | null
  stripe_checkout_url: string | null
  stripe_session_id: string | null
  canceled_reason: string | null
  is_exclusive: boolean
  created_at: string
  messages: any[]
  call_logs: any[]
  payments: any[]
  dishes_status: string | null
  dish_selection_token: string | null
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

const menuLabels: Record<string, string> = {
  menu_grupo_34: 'Menú Grupo 34€',
  menu_grupo_29: 'Menú Grupo 29€',
  menu_infantil: 'Menú Infantil 14,50€',
  menu_pica_34: 'Menú Pica-Pica 34€',
  menu_pica_30: 'Menú Pica-Pica 30€',
}

// ─── Toast System ───────────────────────────────────────────────────────────

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-up backdrop-blur-sm ${
            t.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
            t.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
            'bg-blue-50/95 border-blue-200 text-blue-800'
          }`}
        >
          <span className="flex-shrink-0">
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="text-current opacity-50 hover:opacity-100 font-bold">&times;</button>
        </div>
      ))}
    </div>
  )
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string
  message: string
  confirmLabel: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm transition-colors ${confirmColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReservationDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [whatsappMsg, setWhatsappMsg] = useState('')
  const [sendingWA, setSendingWA] = useState(false)
  const [calling, setCalling] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null) // tracks which type is sending
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void } | null>(null)
  const [dishSummary, setDishSummary] = useState<any>(null)

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    if (id) {
      fetchReservation()
      fetchDishSelections()
    }
  }, [id])

  const fetchReservation = async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setReservation(data)
      } else {
        setReservation(null)
      }
    } catch {
      setReservation(null)
    }
    setLoading(false)
  }

  const fetchDishSelections = async () => {
    try {
      const res = await fetch(`/api/menu-selection/summary?reservation_id=${id}`)
      if (res.ok) {
        const data = await res.json()
        setDishSummary(data)
      }
    } catch {
      // No dish selections yet — OK
    }
  }

  // ─── Generic field update ──────────────────────────────────────────────────
  const updateField = async (field: string, value: string): Promise<boolean> => {
    try {
      const payload: Record<string, unknown> = {}
      if (field === 'personas') {
        payload[field] = parseInt(value)
      } else {
        payload[field] = value
      }

      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        if (data.reservation) {
          setReservation(prev => prev ? { ...prev, ...data.reservation, messages: prev.messages, call_logs: prev.call_logs, payments: prev.payments } : prev)
        } else {
          fetchReservation()
        }
        addToast(`${field.replace('customer_', '').replace('_', ' ')} actualizado`, 'success')
        return true
      } else {
        const data = await res.json()
        addToast(data.error || 'Error al guardar', 'error')
        return false
      }
    } catch {
      addToast('Error de conexión', 'error')
      return false
    }
  }

  const sendWhatsApp = async () => {
    if (!whatsappMsg.trim() || !reservation?.customer_phone) return
    setSendingWA(true)
    try {
      const res = await fetch('/api/actions/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reservation.customer_phone,
          message: whatsappMsg,
          reservation_id: reservation.id
        })
      })
      if (res.ok) {
        addToast('WhatsApp enviado correctamente', 'success')
        setWhatsappMsg('')
        fetchReservation()
      } else {
        addToast('Error enviando WhatsApp', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setSendingWA(false)
    }
  }

  const makeCall = async () => {
    if (!reservation?.customer_phone) return
    setCalling(true)
    try {
      const res = await fetch('/api/actions/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reservation.customer_phone,
          reservation_id: reservation.id
        })
      })
      if (res.ok) {
        addToast('Llamada iniciada correctamente', 'success')
        fetchReservation()
      } else {
        addToast('Error iniciando llamada', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setCalling(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    // Destructive actions need confirmation
    if (newStatus === 'CANCELED' || newStatus === 'NO_SHOW') {
      setConfirmAction({
        title: newStatus === 'CANCELED' ? '¿Cancelar reserva?' : '¿Marcar como No Show?',
        message: newStatus === 'CANCELED'
          ? 'Esta acción cancelará la reserva. El cliente recibirá una notificación si tiene email.'
          : 'Esta acción marcará al cliente como no presentado.',
        confirmLabel: newStatus === 'CANCELED' ? 'Sí, cancelar' : 'Sí, No Show',
        confirmColor: 'bg-red-600 hover:bg-red-700',
        onConfirm: async () => {
          setConfirmAction(null)
          await doUpdateStatus(newStatus)
        },
      })
      return
    }
    await doUpdateStatus(newStatus)
  }

  const doUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        addToast(`Estado → ${statusLabels[newStatus] || newStatus}`, 'success')
        fetchReservation()
      } else {
        addToast('Error actualizando estado', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    }
  }

  const resendEmail = async (type: 'auto' | 'restaurant' | 'reminder' = 'auto') => {
    if (!reservation) return
    setResendingEmail(type)
    try {
      const res = await fetch(`/api/reservations/${id}/resend-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        addToast(data.message, 'success')
      } else {
        addToast(data.error || 'Error al enviar email', 'error')
      }
    } catch {
      addToast('Error de conexión al enviar email', 'error')
    } finally {
      setResendingEmail(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 mt-3 text-sm">Cargando reserva...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!reservation) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center py-20">
          <span className="text-4xl">📭</span>
          <p className="text-slate-600 font-medium mt-3">Reserva no encontrada</p>
          <button onClick={() => router.push('/reservations')} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Volver a reservas
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const fechaFormatted = reservation.fecha
    ? new Date(reservation.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const horaDisplay = reservation.hora_inicio?.substring(0, 5) || '—'

  // Available time slots for the select
  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
  ]

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button onClick={() => router.push('/reservations')} className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0">
              <span className="text-slate-600">←</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {reservation.customer_name || 'Sin cliente'}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 truncate">
                {reservation.reservation_number && (
                  <span className="font-mono font-semibold" style={{ color: '#B08D57' }}>{reservation.reservation_number} · </span>
                )}
                {eventLabels[reservation.event_type] || reservation.event_type} · {fechaFormatted}
              </p>
            </div>
          </div>
          <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border flex-shrink-0 ${statusColors[reservation.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {statusLabels[reservation.status] || reservation.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══ Left column: Info ═══ */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Reservation Details (EDITABLE) ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Información de la Reserva</h2>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-md">✏️ Clic para editar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nº Reserva — not editable */}
                {reservation.reservation_number && (
                  <div className="p-3 rounded-xl sm:col-span-2" style={{ background: '#fdf6e8', border: '1px solid #e8d5b2' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#92681e' }}>Nº Reserva</p>
                    <p className="text-lg font-bold font-mono mt-1" style={{ color: '#B08D57' }}>{reservation.reservation_number}</p>
                  </div>
                )}

                {/* Editable fields */}
                <EditableField
                  label="Cliente"
                  value={reservation.customer_name || ''}
                  type="text"
                  onSave={(v) => updateField('customer_name', v)}
                  placeholder="Nombre del cliente"
                />
                <EditableField
                  label="Teléfono"
                  value={reservation.customer_phone || ''}
                  type="tel"
                  onSave={(v) => updateField('customer_phone', v)}
                  placeholder="+34 600 000 000"
                />
                <EditableField
                  label="Email"
                  value={reservation.customer_email || ''}
                  type="email"
                  onSave={(v) => updateField('customer_email', v)}
                  placeholder="email@ejemplo.com"
                />
                <EditableField
                  label="Tipo de Evento"
                  value={reservation.event_type}
                  type="select"
                  options={[
                    { value: 'RESERVA_NORMAL', label: 'Reserva Normal' },
                    { value: 'INFANTIL_CUMPLE', label: 'Infantil / Cumple' },
                    { value: 'GRUPO_SENTADO', label: 'Grupo Sentado' },
                    { value: 'GRUPO_PICA_PICA', label: 'Grupo Pica-Pica' },
                    { value: 'NOCTURNA_EXCLUSIVA', label: 'Nocturna Exclusiva' },
                  ]}
                  onSave={(v) => updateField('event_type', v)}
                />
                <EditableField
                  label="Fecha"
                  value={reservation.fecha || ''}
                  type="date"
                  onSave={(v) => updateField('fecha', v)}
                />
                <EditableField
                  label="Hora Inicio"
                  value={horaDisplay}
                  type="select"
                  options={timeSlots.map(t => ({ value: t, label: `${t}h` }))}
                  onSave={(v) => updateField('hora_inicio', v)}
                />
                <EditableField
                  label="Personas"
                  value={String(reservation.personas || 0)}
                  type="number"
                  min={1}
                  max={200}
                  onSave={(v) => updateField('personas', v)}
                />
                <EditableField
                  label="Mesa"
                  value={reservation.table_id || ''}
                  type="text"
                  onSave={(v) => updateField('table_id', v)}
                  placeholder="Ej: F10, I3"
                />

                {/* Read-only financial fields */}
                <div className="p-3 bg-slate-50/80 rounded-xl">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Menú</p>
                  <p className="text-sm font-semibold mt-1 text-slate-900">{reservation.menu_code ? (menuLabels[reservation.menu_code] || reservation.menu_code) : 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total</p>
                  <p className="text-sm font-semibold mt-1 text-[#B08D57]">{reservation.total_amount ? `${reservation.total_amount.toFixed(2)}€` : '—'}</p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Señal (40%)</p>
                  <p className="text-sm font-semibold mt-1 text-slate-900">{reservation.deposit_amount ? `${reservation.deposit_amount.toFixed(2)}€` : '—'}</p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Señal Pagada</p>
                  <p className={`text-sm font-semibold mt-1 ${reservation.status === 'CONFIRMED' && reservation.stripe_session_id ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {reservation.status === 'CONFIRMED' && reservation.stripe_session_id ? '✅ Sí' : 'No'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Horario</p>
                  <p className="text-sm font-semibold mt-1 text-slate-900">
                    {reservation.hora_inicio?.substring(0, 5) || '—'} – {reservation.hora_fin?.substring(0, 5) || '—'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Límite de Pago</p>
                  <p className="text-sm font-semibold mt-1 text-slate-900">{reservation.payment_deadline ? new Date(reservation.payment_deadline).toLocaleString('es-ES') : 'N/A'}</p>
                </div>
              </div>

              {reservation.canceled_reason && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wider">Motivo de Cancelación</p>
                  <p className="text-sm font-semibold text-red-700 mt-1">{reservation.canceled_reason}</p>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-4">
                ID: {reservation.id} · Creada: {reservation.created_at ? new Date(reservation.created_at).toLocaleString('es-ES') : '—'}
              </p>
            </div>

            {/* ── Status Actions ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Cambiar Estado</h2>
              <div className="flex flex-wrap gap-2">
                {['HOLD_BLOCKED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={reservation.status === s}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                      reservation.status === s
                        ? (statusColors[s] || '') + ' cursor-default'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {statusLabels[s] || s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Dish Selection Status ── */}
            {reservation.menu_code && ['menu_grupo_34', 'menu_grupo_29', 'menu_infantil'].includes(reservation.menu_code) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  🍽️ Selección de Platos
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    reservation.dishes_status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {reservation.dishes_status === 'completed' ? 'Completada' : 'Pendiente'}
                  </span>
                </h2>
                
                {reservation.dish_selection_token && reservation.dishes_status !== 'completed' && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Enlace de selección para el cliente:</strong>
                    </p>
                    <a 
                      href={`/elegir-platos/${reservation.dish_selection_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline break-all"
                    >
                      {typeof window !== 'undefined' ? window.location.origin : ''}/elegir-platos/{reservation.dish_selection_token}
                    </a>
                  </div>
                )}

                {dishSummary ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-600">
                        {dishSummary.summary.total_selections} de {reservation.personas} comensales han elegido
                      </div>
                      {reservation.dishes_status === 'completed' && (
                        <a
                          href={`/api/menu-selection/pdf?reservation_id=${reservation.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B08D57] text-white text-xs font-semibold rounded-lg hover:bg-[#9a7a4a] transition-colors shadow-sm"
                        >
                          📄 Descargar PDF
                        </a>
                      )}
                    </div>
                    {dishSummary.summary.allergies.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 mb-3">
                        <p className="text-xs font-bold text-red-600 mb-1">⚠️ ALERGIAS</p>
                        {dishSummary.summary.allergies.map((a: string, i: number) => (
                          <p key={i} className="text-xs text-red-700">• {a}</p>
                        ))}
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: dishSummary.html }} className="text-sm" />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">
                    {reservation.dishes_status === 'completed'
                      ? 'No se encontraron datos de selección'
                      : 'El cliente aún no ha comenzado la selección'}
                  </p>
                )}
              </div>
            )}

            {/* ── Messages ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Mensajes WhatsApp
                <span className="ml-2 text-sm font-normal text-slate-400">({reservation.messages?.length || 0})</span>
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {(!reservation.messages || reservation.messages.length === 0) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay mensajes</p>
                ) : (
                  reservation.messages.map((msg: any, idx: number) => (
                    <div key={msg.id || idx} className={`p-3 rounded-xl text-sm max-w-[80%] ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-50 border border-blue-100 ml-auto text-right'
                        : 'bg-slate-50 border border-slate-100'
                    }`}>
                      <p className="text-slate-700">{msg.content || msg.body || '—'}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {msg.direction === 'outbound' ? 'Enviado' : 'Recibido'} · {msg.created_at ? new Date(msg.created_at).toLocaleString('es-ES') : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-slate-50/50"
                  onKeyDown={(e) => e.key === 'Enter' && sendWhatsApp()}
                />
                <button
                  onClick={sendWhatsApp}
                  disabled={sendingWA || !whatsappMsg.trim()}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {sendingWA ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>

            {/* ── Call Logs ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Registro de Llamadas (VAPI)
                <span className="ml-2 text-sm font-normal text-slate-400">({reservation.call_logs?.length || 0})</span>
              </h2>
              <div className="space-y-3">
                {(!reservation.call_logs || reservation.call_logs.length === 0) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay llamadas registradas</p>
                ) : (
                  reservation.call_logs.map((call: any, idx: number) => (
                    <div key={call.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {call.provider === 'vapi' ? '🤖 VAPI' : '📞 Llamada'} — {call.status}
                        </span>
                        <span className="text-xs text-slate-400">{call.created_at ? new Date(call.created_at).toLocaleString('es-ES') : ''}</span>
                      </div>
                      {call.duration_seconds && (
                        <p className="text-xs text-slate-500">Duración: {call.duration_seconds}s</p>
                      )}
                      {call.summary && (
                        <p className="text-sm text-slate-600 mt-2 bg-white p-3 rounded-lg border border-slate-100">{call.summary}</p>
                      )}
                      {call.transcript && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">Ver transcripción completa</summary>
                          <p className="text-sm text-slate-600 mt-2 bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">{call.transcript}</p>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ═══ Right column: Actions & Payments ═══ */}
          <div className="space-y-6">

            {/* ── Email Actions ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Emails</h2>
              <p className="text-xs text-slate-400 mb-4">Enviar correos al cliente</p>
              <div className="space-y-2.5">
                {/* Confirmación */}
                <button
                  onClick={() => resendEmail('auto')}
                  disabled={resendingEmail !== null || !reservation.customer_email}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#B08D57] to-[#96784a] text-white rounded-xl text-sm font-medium hover:from-[#96784a] hover:to-[#7d6540] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  title={!reservation.customer_email ? 'Sin email del cliente' : ''}
                >
                  {resendingEmail === 'auto' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Enviando…
                    </span>
                  ) : '📧 Enviar Confirmación'}
                </button>

                {/* Recordatorio */}
                <button
                  onClick={() => resendEmail('reminder')}
                  disabled={resendingEmail !== null || !reservation.customer_email}
                  className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {resendingEmail === 'reminder' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Enviando…
                    </span>
                  ) : '📌 Enviar Recordatorio'}
                </button>

                {/* Restaurante */}
                <button
                  onClick={() => resendEmail('restaurant')}
                  disabled={resendingEmail !== null}
                  className="w-full px-4 py-3 bg-gradient-to-r from-stone-500 to-stone-600 text-white rounded-xl text-sm font-medium hover:from-stone-600 hover:to-stone-700 transition-all disabled:opacity-50 shadow-sm"
                >
                  {resendingEmail === 'restaurant' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Enviando…
                    </span>
                  ) : '📋 Notificar Restaurante'}
                </button>

                {!reservation.customer_email && (
                  <p className="text-xs text-amber-600 px-1">⚠️ Añade un email al cliente para enviar correos</p>
                )}
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Acciones</h2>
              <div className="space-y-2.5">
                <button
                  onClick={makeCall}
                  disabled={calling}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 shadow-sm"
                >
                  {calling ? 'Llamando...' : '📞 Iniciar Llamada VAPI'}
                </button>
                <a
                  href={`https://wa.me/${reservation.customer_phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-sm font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-sm block text-center"
                >
                  💬 Abrir WhatsApp Web
                </a>
                {reservation.stripe_checkout_url && reservation.status !== 'CONFIRMED' && (
                  <a
                    href={reservation.stripe_checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm block text-center"
                  >
                    💳 Ver Link de Pago Stripe
                  </a>
                )}
              </div>
            </div>

            {/* ── Payments ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Pagos</h2>
              <div className="space-y-3">
                {(!reservation.payments || reservation.payments.length === 0) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay pagos registrados</p>
                ) : (
                  reservation.payments.map((pay: any, idx: number) => (
                    <div key={pay.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 capitalize">{pay.method || pay.type || 'stripe'}</span>
                        <span className="text-sm font-bold text-emerald-600">{pay.amount}€</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pay.created_at ? new Date(pay.created_at).toLocaleString('es-ES') : ''}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Menu Info ── */}
            {reservation.menu_payload && Object.keys(reservation.menu_payload).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Menú Seleccionado</h2>
                <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl overflow-auto border border-slate-100 whitespace-pre-wrap">
                  {JSON.stringify(reservation.menu_payload, null, 2)}
                </pre>
              </div>
            )}

            {/* ── Tech Info ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Info Técnica</h2>
              <div className="space-y-2 text-xs text-slate-500">
                <p><span className="font-medium">ID:</span> {reservation.id}</p>
                <p><span className="font-medium">Exclusiva:</span> {reservation.is_exclusive ? 'Sí' : 'No'}</p>
                <p><span className="font-medium">Creada:</span> {reservation.created_at ? new Date(reservation.created_at).toLocaleString('es-ES') : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Toasts ═══ */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* ═══ Confirm Modal ═══ */}
        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel={confirmAction.confirmLabel}
            confirmColor={confirmAction.confirmColor}
            onConfirm={confirmAction.onConfirm}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}