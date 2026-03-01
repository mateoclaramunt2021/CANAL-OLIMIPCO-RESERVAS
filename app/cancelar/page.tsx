'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const eventLabels: Record<string, string> = {
  RESERVA_NORMAL: 'Reserva Normal',
  INFANTIL_CUMPLE: 'Infantil / Cumpleaños',
  GRUPO_SENTADO: 'Grupo Sentado',
  GRUPO_PICA_PICA: 'Grupo Pica-Pica',
  NOCTURNA_EXCLUSIVA: 'Nocturna Exclusiva',
}

interface ReservationPreview {
  reservation_number: string
  customer_name: string
  fecha: string
  hora: string
  personas: number
  event_type: string
  status: string
}

function CancelForm() {
  const searchParams = useSearchParams()
  const refFromUrl = searchParams.get('ref') || ''

  const [step, setStep] = useState<'search' | 'verify' | 'confirm' | 'done'>('search')
  const [ref, setRef] = useState(refFromUrl)
  const [phone, setPhone] = useState('')
  const [reservation, setReservation] = useState<ReservationPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Si viene ref por URL, ir directo a verificar
  useEffect(() => {
    if (refFromUrl) {
      setStep('verify')
    }
  }, [refFromUrl])

  const searchReservation = async () => {
    if (!ref.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reservations/cancel?ref=${encodeURIComponent(ref.trim())}`)
      const data = await res.json()
      if (data.ok) {
        setReservation(data.reservation)
        setStep('verify')
      } else {
        setError(data.error || 'Reserva no encontrada')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  const verifyAndShow = async () => {
    if (!phone.trim()) {
      setError('Introduce tu teléfono para verificar')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reservations/cancel?ref=${encodeURIComponent(ref.trim())}&phone=${encodeURIComponent(phone.trim())}`)
      const data = await res.json()
      if (data.ok) {
        setReservation(data.reservation)
        if (data.reservation.status === 'CANCELED') {
          setError('Esta reserva ya está cancelada.')
        } else {
          setStep('confirm')
        }
      } else {
        setError(data.error || 'No se pudo verificar')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  const cancelReservation = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: ref.trim(), phone: phone.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setStep('done')
      } else {
        setError(data.error || 'Error al cancelar')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  const formatDate = (fecha: string) => {
    if (!fecha) return '—'
    const [y, m, d] = fecha.split('-')
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5f3ee 0%, #ede8de 100%)' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-light tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1A0F05' }}>
              🏊 Canal Olímpico
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8a8578' }}>Restaurante · Castelldefels</p>
          </Link>
        </div>

        <div className="rounded-2xl border p-6 sm:p-8" style={{ background: '#ffffff', borderColor: '#e8e2d6', boxShadow: '0 4px 20px rgba(26,15,5,0.06)' }}>

          {/* ── Step: Done ── */}
          {step === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: '#fef2f2' }}>
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#1A0F05' }}>
                Reserva cancelada
              </h2>
              <p className="text-sm mb-1" style={{ color: '#8a8578' }}>
                Tu reserva <strong style={{ color: '#B08D57' }}>{ref}</strong> ha sido cancelada correctamente.
              </p>
              <p className="text-sm mb-6" style={{ color: '#8a8578' }}>
                Recibirás un email de confirmación.
              </p>
              <Link
                href="/#reservar"
                className="inline-block px-6 py-3 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #B08D57, #C4724E)' }}
              >
                Hacer nueva reserva
              </Link>
            </div>
          )}

          {/* ── Step: Search ── */}
          {step === 'search' && (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#1A0F05' }}>
                Cancelar reserva
              </h2>
              <p className="text-sm mb-6" style={{ color: '#8a8578' }}>
                Introduce tu número de reserva (lo encontrarás en el email de confirmación).
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#8a8578' }}>
                  Nº de Reserva
                </label>
                <input
                  type="text"
                  placeholder="CO-20260301-001"
                  value={ref}
                  onChange={(e) => setRef(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1px solid #e8e2d6', background: '#faf9f6', color: '#1A0F05' }}
                  onFocus={(e) => e.target.style.borderColor = '#B08D57'}
                  onBlur={(e) => e.target.style.borderColor = '#e8e2d6'}
                  onKeyDown={(e) => e.key === 'Enter' && searchReservation()}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#c0392b', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <button
                onClick={searchReservation}
                disabled={loading || !ref.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #B08D57, #C4724E)' }}
              >
                {loading ? 'Buscando...' : 'Buscar reserva'}
              </button>
            </>
          )}

          {/* ── Step: Verify ── */}
          {step === 'verify' && (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#1A0F05' }}>
                Verificar identidad
              </h2>
              <p className="text-sm mb-6" style={{ color: '#8a8578' }}>
                Para cancelar la reserva <strong style={{ color: '#B08D57' }}>{ref}</strong>, introduce el teléfono con el que se hizo la reserva.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#8a8578' }}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="612 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1px solid #e8e2d6', background: '#faf9f6', color: '#1A0F05' }}
                  onFocus={(e) => e.target.style.borderColor = '#B08D57'}
                  onBlur={(e) => e.target.style.borderColor = '#e8e2d6'}
                  onKeyDown={(e) => e.key === 'Enter' && verifyAndShow()}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#c0392b', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <button
                onClick={verifyAndShow}
                disabled={loading || !phone.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 mb-3"
                style={{ background: 'linear-gradient(135deg, #B08D57, #C4724E)' }}
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>

              <button
                onClick={() => { setStep('search'); setError('') }}
                className="w-full py-2 text-sm transition-all"
                style={{ color: '#8a8578' }}
              >
                ← Volver
              </button>
            </>
          )}

          {/* ── Step: Confirm ── */}
          {step === 'confirm' && reservation && (
            <>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A0F05' }}>
                ¿Cancelar esta reserva?
              </h2>

              <div className="rounded-xl p-4 mb-6" style={{ background: '#f5f3ee', border: '1px solid #e8e2d6' }}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color: '#8a8578' }}>Nº Reserva</span>
                    <span className="text-sm font-semibold" style={{ color: '#B08D57' }}>{reservation.reservation_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color: '#8a8578' }}>Cliente</span>
                    <span className="text-sm font-medium" style={{ color: '#1A0F05' }}>{reservation.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color: '#8a8578' }}>Fecha</span>
                    <span className="text-sm" style={{ color: '#1A0F05' }}>{formatDate(reservation.fecha)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color: '#8a8578' }}>Hora</span>
                    <span className="text-sm" style={{ color: '#1A0F05' }}>{reservation.hora}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color: '#8a8578' }}>Personas</span>
                    <span className="text-sm" style={{ color: '#1A0F05' }}>{reservation.personas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color: '#8a8578' }}>Tipo</span>
                    <span className="text-sm" style={{ color: '#1A0F05' }}>{eventLabels[reservation.event_type] || reservation.event_type}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-3 mb-6 text-center" style={{ background: '#fef9f0', border: '1px solid #e8d5b2' }}>
                <p className="text-sm" style={{ color: '#92681e' }}>
                  ⚠️ Esta acción no se puede deshacer.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#c0392b', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <button
                onClick={cancelReservation}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 mb-3"
                style={{ background: '#c0392b' }}
              >
                {loading ? 'Cancelando...' : '❌ Confirmar cancelación'}
              </button>

              <button
                onClick={() => { setStep('verify'); setError('') }}
                className="w-full py-2 text-sm transition-all"
                style={{ color: '#8a8578' }}
              >
                ← Volver
              </button>
            </>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm hover:underline" style={{ color: '#8a8578' }}>
            ← Volver a la web del restaurante
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f3ee' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#B08D57', borderTopColor: 'transparent' }}></div>
      </div>
    }>
      <CancelForm />
    </Suspense>
  )
}
