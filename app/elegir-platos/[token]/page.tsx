'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface DishOption {
  id: string
  name: string
}

interface MenuChoices {
  first_course?: DishOption[]
  second_course?: DishOption[]
  dessert?: DishOption[]
}

interface GuestSelection {
  guest_number: number
  guest_name: string
  first_course: string
  second_course: string
  dessert: string
  allergies: string
}

interface ReservationData {
  id: string
  reservation_number: string | null
  customer_name: string
  fecha: string
  hora_inicio: string
  personas: number
  event_type: string
  dishes_status: string
  dishes_deadline: string | null
}

interface MenuData {
  code: string
  name: string
  price: number
  description: string
}

export default function ElegirPlatosPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [menu, setMenu] = useState<MenuData | null>(null)
  const [choices, setChoices] = useState<MenuChoices | null>(null)
  const [guests, setGuests] = useState<GuestSelection[]>([])
  const [activeGuest, setActiveGuest] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [finalized, setFinalized] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/menu-selection?token=${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al cargar')
        return
      }

      setReservation(data.reservation)
      setMenu(data.menu)
      setChoices(data.choices)

      if (data.reservation.dishes_status === 'completed') {
        setFinalized(true)
      }

      // Initialize guests
      const personas = data.reservation.personas
      const existingSelections = data.selections || []
      const guestArray: GuestSelection[] = []

      for (let i = 1; i <= personas; i++) {
        const existing = existingSelections.find((s: any) => s.guest_number === i)
        guestArray.push({
          guest_number: i,
          guest_name: existing?.guest_name || '',
          first_course: existing?.first_course || '',
          second_course: existing?.second_course || '',
          dessert: existing?.dessert || '',
          allergies: existing?.allergies || '',
        })
      }

      setGuests(guestArray)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateGuest = (index: number, field: keyof GuestSelection, value: string) => {
    setGuests(prev => {
      const arr = [...prev]
      arr[index] = { ...arr[index], [field]: value }
      return arr
    })
  }

  const saveDraft = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/menu-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, guests, finalize: false }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveMsg('✅ Borrador guardado correctamente')
      } else {
        setSaveMsg(`❌ ${data.error}`)
      }
    } catch {
      setSaveMsg('❌ Error de conexión')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 4000)
    }
  }

  const submitFinal = async () => {
    // Validate all guests have selections
    if (!choices) return

    for (const g of guests) {
      if (!g.guest_name.trim()) {
        setSaveMsg(`❌ Falta el nombre del comensal ${g.guest_number}`)
        return
      }
      if (choices.first_course && !g.first_course) {
        setSaveMsg(`❌ Falta el primer plato del comensal ${g.guest_number} (${g.guest_name || 'Sin nombre'})`)
        return
      }
      if (choices.second_course && !g.second_course) {
        setSaveMsg(`❌ Falta el segundo plato del comensal ${g.guest_number} (${g.guest_name || 'Sin nombre'})`)
        return
      }
      if (choices.dessert && !g.dessert) {
        setSaveMsg(`❌ Falta el postre del comensal ${g.guest_number} (${g.guest_name || 'Sin nombre'})`)
        return
      }
    }

    if (!confirm(`¿Confirmar la selección de platos para ${guests.length} comensales? Una vez confirmado no podrás modificarlo.`)) {
      return
    }

    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/menu-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, guests, finalize: true }),
      })
      const data = await res.json()
      if (res.ok && data.finalized) {
        setFinalized(true)
        setSaveMsg('✅ ¡Selección de platos confirmada!')
      } else {
        setSaveMsg(`❌ ${data.error}`)
      }
    } catch {
      setSaveMsg('❌ Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const guestCompleted = (g: GuestSelection): boolean => {
    if (!choices) return false
    if (!g.guest_name.trim()) return false
    if (choices.first_course && !g.first_course) return false
    if (choices.second_course && !g.second_course) return false
    if (choices.dessert && !g.dessert) return false
    return true
  }

  const completedCount = guests.filter(guestCompleted).length
  const totalGuests = guests.length
  const progressPct = totalGuests > 0 ? Math.round((completedCount / totalGuests) * 100) : 0

  const formatDateEs = (fecha: string) => {
    const [y, m, d] = fecha.split('-')
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="dish-page">
        <div className="dish-container">
          <div className="dish-loading">
            <div className="dish-spinner" />
            <p>Cargando selección de platos...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="dish-page">
        <div className="dish-container">
          <div className="dish-error">
            <span className="dish-error-icon">⚠️</span>
            <h2>No se pudo cargar</h2>
            <p>{error}</p>
            <p className="dish-error-contact">📞 930 347 246 · reservascanalolimpico@gmail.com</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Finalized ──
  if (finalized) {
    return (
      <div className="dish-page">
        <div className="dish-container">
          <div className="dish-success">
            <span className="dish-success-icon">🎉</span>
            <h2>¡Selección completada!</h2>
            <p>Los platos para tu evento del <strong>{reservation ? formatDateEs(reservation.fecha) : ''}</strong> han sido confirmados.</p>
            <p>El restaurante ha recibido tu selección. Si necesitas hacer algún cambio, contacta con nosotros antes de las 72h previas al evento.</p>
            <p className="dish-success-contact">📞 930 347 246 · 📧 reservascanalolimpico@gmail.com</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ──
  return (
    <div className="dish-page">
      <div className="dish-container">
        {/* Header */}
        <div className="dish-header">
          <h1>🏊 Canal Olímpico</h1>
          <p className="dish-subtitle">Selección de Platos</p>
        </div>

        {/* Reservation info */}
        {reservation && menu && (
          <div className="dish-info-card">
            <div className="dish-info-row">
              <span>📋</span>
              <span><strong>Reserva:</strong> {reservation.reservation_number || reservation.id.substring(0, 8)}</span>
            </div>
            <div className="dish-info-row">
              <span>👤</span>
              <span><strong>Cliente:</strong> {reservation.customer_name}</span>
            </div>
            <div className="dish-info-row">
              <span>📅</span>
              <span><strong>Fecha:</strong> {formatDateEs(reservation.fecha)} a las {reservation.hora_inicio}h</span>
            </div>
            <div className="dish-info-row">
              <span>👥</span>
              <span><strong>Comensales:</strong> {reservation.personas}</span>
            </div>
            <div className="dish-info-row">
              <span>🍽️</span>
              <span><strong>Menú:</strong> {menu.name}</span>
            </div>
            {reservation.dishes_deadline && (
              <div className="dish-info-row dish-deadline">
                <span>⏰</span>
                <span><strong>Plazo límite:</strong> {formatDateEs(reservation.dishes_deadline)}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="dish-progress">
          <div className="dish-progress-header">
            <span>Progreso: {completedCount}/{totalGuests} comensales</span>
            <span>{progressPct}%</span>
          </div>
          <div className="dish-progress-bar">
            <div className="dish-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Guest tabs */}
        <div className="dish-tabs">
          {guests.map((g, i) => (
            <button
              key={i}
              className={`dish-tab ${activeGuest === i ? 'active' : ''} ${guestCompleted(g) ? 'completed' : ''}`}
              onClick={() => setActiveGuest(i)}
            >
              {guestCompleted(g) ? '✅' : ''} {g.guest_name || `Comensal ${i + 1}`}
            </button>
          ))}
        </div>

        {/* Current guest form */}
        {guests[activeGuest] && choices && (
          <div className="dish-form">
            <h3>Comensal {activeGuest + 1} de {totalGuests}</h3>

            {/* Name */}
            <div className="dish-field">
              <label>Nombre del comensal *</label>
              <input
                type="text"
                value={guests[activeGuest].guest_name}
                onChange={e => updateGuest(activeGuest, 'guest_name', e.target.value)}
                placeholder="Nombre y apellido"
              />
            </div>

            {/* First Course */}
            {choices.first_course && (
              <div className="dish-field">
                <label>🥗 Primer Plato *</label>
                <div className="dish-options">
                  {choices.first_course.map(opt => (
                    <button
                      key={opt.id}
                      className={`dish-option ${guests[activeGuest].first_course === opt.id ? 'selected' : ''}`}
                      onClick={() => updateGuest(activeGuest, 'first_course', opt.id)}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Second Course */}
            {choices.second_course && (
              <div className="dish-field">
                <label>🍽️ Segundo Plato *</label>
                <div className="dish-options">
                  {choices.second_course.map(opt => (
                    <button
                      key={opt.id}
                      className={`dish-option ${guests[activeGuest].second_course === opt.id ? 'selected' : ''}`}
                      onClick={() => updateGuest(activeGuest, 'second_course', opt.id)}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dessert */}
            {choices.dessert && (
              <div className="dish-field">
                <label>🍰 Postre *</label>
                <div className="dish-options">
                  {choices.dessert.map(opt => (
                    <button
                      key={opt.id}
                      className={`dish-option ${guests[activeGuest].dessert === opt.id ? 'selected' : ''}`}
                      onClick={() => updateGuest(activeGuest, 'dessert', opt.id)}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            <div className="dish-field">
              <label>⚠️ Alergias o intolerancias</label>
              <input
                type="text"
                value={guests[activeGuest].allergies}
                onChange={e => updateGuest(activeGuest, 'allergies', e.target.value)}
                placeholder="Ej: gluten, lactosa, frutos secos..."
              />
            </div>

            {/* Navigation */}
            <div className="dish-nav">
              {activeGuest > 0 && (
                <button
                  className="dish-btn-secondary"
                  onClick={() => setActiveGuest(activeGuest - 1)}
                >
                  ← Anterior
                </button>
              )}
              <div style={{ flex: 1 }} />
              {activeGuest < totalGuests - 1 && (
                <button
                  className="dish-btn-secondary"
                  onClick={() => setActiveGuest(activeGuest + 1)}
                >
                  Siguiente →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save message */}
        {saveMsg && (
          <div className={`dish-msg ${saveMsg.startsWith('✅') ? 'success' : 'error'}`}>
            {saveMsg}
          </div>
        )}

        {/* Action buttons */}
        <div className="dish-actions">
          <button
            className="dish-btn-draft"
            onClick={saveDraft}
            disabled={saving}
          >
            {saving ? 'Guardando...' : '💾 Guardar borrador'}
          </button>
          <button
            className="dish-btn-submit"
            onClick={submitFinal}
            disabled={saving || completedCount < totalGuests}
          >
            {saving ? 'Enviando...' : `✅ Confirmar selección (${completedCount}/${totalGuests})`}
          </button>
        </div>

        {/* Footer note */}
        <p className="dish-footer-note">
          Puedes guardar como borrador y volver más tarde con el mismo enlace.
          <br />Una vez confirmado, los platos se enviarán automáticamente al restaurante.
          <br />📞 930 347 246 · 📧 reservascanalolimpico@gmail.com
        </p>
      </div>
    </div>
  )
}
