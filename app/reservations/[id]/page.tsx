'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface Reservation {
  id: string
  event_type: string
  customer_name: string
  customer_phone: string
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

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 bg-slate-50/80 rounded-xl">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold mt-1 ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>{value}</p>
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
  const [actionFeedback, setActionFeedback] = useState('')

  useEffect(() => {
    if (id) fetchReservation()
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

  const sendWhatsApp = async () => {
    if (!whatsappMsg.trim() || !reservation?.customer_phone) return
    setSendingWA(true)
    setActionFeedback('')
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
        setActionFeedback('WhatsApp enviado correctamente')
        setWhatsappMsg('')
        fetchReservation()
      } else {
        setActionFeedback('Error enviando WhatsApp')
      }
    } catch {
      setActionFeedback('Error de conexión')
    } finally {
      setSendingWA(false)
    }
  }

  const makeCall = async () => {
    if (!reservation?.customer_phone) return
    setCalling(true)
    setActionFeedback('')
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
        setActionFeedback('Llamada iniciada correctamente')
        fetchReservation()
      } else {
        setActionFeedback('Error iniciando llamada')
      }
    } catch {
      setActionFeedback('Error de conexión')
    } finally {
      setCalling(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setActionFeedback(`Estado actualizado a ${statusLabels[newStatus] || newStatus}`)
        fetchReservation()
      }
    } catch {
      setActionFeedback('Error actualizando estado')
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

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/reservations')} className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
              <span className="text-slate-600">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {reservation.customer_name || 'Sin cliente'}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {eventLabels[reservation.event_type] || reservation.event_type} · {fechaFormatted}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-xl text-sm font-semibold border ${statusColors[reservation.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {statusLabels[reservation.status] || reservation.status}
          </span>
        </div>

        {/* Feedback */}
        {actionFeedback && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm text-sm font-medium text-blue-700">
            {actionFeedback}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reservation Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Información de la Reserva</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Cliente" value={reservation.customer_name || 'N/A'} />
                <InfoItem label="Teléfono" value={reservation.customer_phone || 'N/A'} />
                <InfoItem label="Tipo de Evento" value={eventLabels[reservation.event_type] || reservation.event_type} />
                <InfoItem label="Fecha" value={fechaFormatted} />
                <InfoItem label="Horario" value={`${reservation.hora_inicio || '—'} – ${reservation.hora_fin || '—'}`} />
                <InfoItem label="Personas" value={String(reservation.personas || 0)} />
                <InfoItem label="Mesa" value={reservation.table_id || 'Sin asignar'} />
                <InfoItem label="Menú" value={reservation.menu_code ? (menuLabels[reservation.menu_code] || reservation.menu_code) : 'N/A'} />
                <InfoItem label="Total" value={reservation.total_amount ? `${reservation.total_amount.toFixed(2)}€` : '—'} highlight />
                <InfoItem label="Señal (40%)" value={reservation.deposit_amount ? `${reservation.deposit_amount.toFixed(2)}€` : '—'} />
                <InfoItem label="Señal Pagada" value={reservation.status === 'CONFIRMED' && reservation.stripe_session_id ? 'Sí' : 'No'} />
                <InfoItem label="Límite de Pago" value={reservation.payment_deadline ? new Date(reservation.payment_deadline).toLocaleString('es-ES') : 'N/A'} />
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

            {/* Status Actions */}
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

            {/* Messages */}
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
              {/* Send WhatsApp */}
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

            {/* Call Logs */}
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

          {/* Right column: Actions & Payments */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Acciones Rápidas</h2>
              <div className="space-y-3">
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

            {/* Payments */}
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

            {/* Menu Info */}
            {reservation.menu_payload && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Menú Seleccionado</h2>
                <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl overflow-auto border border-slate-100 whitespace-pre-wrap">
                  {JSON.stringify(reservation.menu_payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Reservation Source */}
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
      </div>
    </DashboardLayout>
  )
}