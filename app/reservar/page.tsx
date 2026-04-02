'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Página pública de reserva (grupo / evento)
   Landing profesional para clientes que llegan desde SMS
   ═══════════════════════════════════════════════════════════════════════════ */

const EVENT_TYPES = [
  { key: 'GRUPO_SENTADO', title: 'Grupo Sentado', desc: 'Comida o cena con menú servido a mesa', icon: '🍽️', minPersons: 7 },
  { key: 'GRUPO_PICA_PICA', title: 'Pica-Pica', desc: 'Selección de platos para compartir', icon: '🥘', minPersons: 7 },
  { key: 'INFANTIL_CUMPLE', title: 'Cumpleaños Infantil', desc: 'Zona reservada con tarta y menú infantil', icon: '🎂', minPersons: 7 },
  { key: 'NOCTURNA_EXCLUSIVA', title: 'Nocturna Exclusiva', desc: 'Eventos nocturnos con terraza privada', icon: '🌙', minPersons: 10 },
]

interface MenuOption { code: string; name: string; price: number; eventTypes: string[]; desc: string }
const MENUS: MenuOption[] = [
  { code: 'menu_grupo_34', name: 'Menú Grupo Premium', price: 34, eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'], desc: 'Surtido ibéricos · Solomillo / Bacalao / Parrillada · Tarta o helado · 1 bebida + agua + café' },
  { code: 'menu_grupo_29', name: 'Menú Grupo', price: 29, eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'], desc: 'Rigatoni / Ensalada · Solomillo / Lubina / Parrillada · Sorbete / Macedonia · 1 bebida + agua' },
  { code: 'menu_pica_34', name: 'Pica-Pica Premium', price: 34, eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'], desc: 'Embutidos · Brocheta sepia-gambas · Alcachofas · Saquitos carrillera · Croquetas · Mini-hamburguesas · 2 bebidas' },
  { code: 'menu_pica_30', name: 'Pica-Pica', price: 30, eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'], desc: 'Tortilla · Croquetas · Mini-hamburguesas · Calamarcitos · Fingers de pollo · Nachos guacamole · 2 bebidas' },
  { code: 'menu_infantil', name: 'Menú Infantil', price: 14.5, eventTypes: ['INFANTIL_CUMPLE'], desc: 'Macarrones / Hamburguesa / Fingers / Canelones · Tarta / Helado / Yogur · 1 refresco' },
]

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let m = 12 * 60; m <= 22 * 60; m += 30) {
    const h = Math.floor(m / 60), mi = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`)
  }
  return slots
}
const TIME_SLOTS = generateTimeSlots()

function ReservarForm() {
  const searchParams = useSearchParams()
  const prefillNombre = searchParams.get('nombre') || ''
  const prefillTelefono = (searchParams.get('telefono') || '').replace('+34', '')

  const [eventType, setEventType] = useState('')
  const [menuCode, setMenuCode] = useState('')
  const [personas, setPersonas] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  const availableMenus = MENUS.filter(m => m.eventTypes.includes(eventType))
  const selectedMenu = MENUS.find(m => m.code === menuCode)
  const total = selectedMenu ? selectedMenu.price * personas : 0
  const deposit = Math.round(total * 0.4 * 100) / 100

  // Reset menu when event type changes
  useEffect(() => {
    setMenuCode('')
  }, [eventType])

  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + 5)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <div className="landing" style={{ minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        background: 'rgba(255,250,244,.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(26,15,5,.04)',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, letterSpacing: '.25em', color: 'var(--ink)', textDecoration: 'none' }}>
            CANAL OLÍMPICO
          </Link>
          <a href="tel:+34930347246" style={{ fontSize: '.78rem', fontWeight: 500, letterSpacing: '.06em', color: 'var(--gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            📞 930 347 246
          </a>
        </div>
      </nav>

      {/* ── Hero header ── */}
      <div style={{
        background: 'var(--ink)',
        padding: '48px 32px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(176,141,87,.12) 0%, transparent 50%, rgba(176,141,87,.08) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'block', fontSize: '.65rem', fontWeight: 500, letterSpacing: '.4em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>
            RESTAURANTE CANAL OLÍMPICO
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 300, color: '#fff', margin: '0 0 12px', letterSpacing: '.02em' }}>
            Reserva tu evento
          </h1>
          <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.55)', fontWeight: 300, margin: 0 }}>
            Castelldefels · Terraza mediterránea junto al Canal Olímpic
          </p>
        </div>
      </div>

      {/* ── Form container ── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 60px' }}>

        <form
          method="POST"
          action="/api/reservations/form"
          onSubmit={() => setSubmitting(true)}
          style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--sand)', overflow: 'hidden' }}
        >
          {/* Hidden fields */}
          <input type="hidden" name="source" value="public" />

          {/* ── Step 1: Tipo de evento ── */}
          <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--sand)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', fontSize: '.78rem', fontWeight: 700 }}>1</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>Tipo de evento</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {EVENT_TYPES.map(et => (
                <label
                  key={et.key}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 12px', borderRadius: 'var(--radius-sm)',
                    border: eventType === et.key ? '2px solid var(--gold)' : '2px solid var(--sand)',
                    background: eventType === et.key ? 'var(--gold-glow)' : 'var(--warm-50)',
                    cursor: 'pointer', transition: 'all .25s', textAlign: 'center',
                  }}
                  onClick={() => setEventType(et.key)}
                >
                  <input type="radio" name="event_type" value={et.key} checked={eventType === et.key} onChange={() => setEventType(et.key)} required style={{ display: 'none' }} />
                  <span style={{ fontSize: '1.6rem', marginBottom: 6 }}>{et.icon}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '.92rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{et.title}</span>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{et.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Step 2: Menú ── */}
          {eventType && (
            <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--sand)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', fontSize: '.78rem', fontWeight: 700 }}>2</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>Elige tu menú</h2>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {availableMenus.map(m => (
                  <label
                    key={m.code}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px', borderRadius: 'var(--radius-sm)',
                      border: menuCode === m.code ? '2px solid var(--gold)' : '2px solid var(--sand)',
                      background: menuCode === m.code ? 'var(--gold-glow)' : '#fff',
                      cursor: 'pointer', transition: 'all .25s',
                    }}
                    onClick={() => setMenuCode(m.code)}
                  >
                    <input type="radio" name="menu_code" value={m.code} checked={menuCode === m.code} onChange={() => setMenuCode(m.code)} required style={{ display: 'none' }} />
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', border: menuCode === m.code ? '6px solid var(--gold)' : '2px solid var(--sand-dark)',
                      flexShrink: 0, marginTop: 2, transition: 'all .25s', boxSizing: 'border-box',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>{m.name}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>{m.price}€<small style={{ fontSize: '.72rem', fontWeight: 400, color: 'var(--text-muted)' }}>/pers.</small></span>
                      </div>
                      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Fecha, hora, personas ── */}
          {menuCode && (
            <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--sand)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', fontSize: '.78rem', fontWeight: 700 }}>3</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>Fecha y personas</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Fecha *</label>
                  <input name="fecha" type="date" required min={minDateStr}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--sand)', fontSize: '.92rem', color: 'var(--ink)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Hora *</label>
                  <select name="hora" required defaultValue=""
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--sand)', fontSize: '.92rem', color: 'var(--ink)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
                    <option value="" disabled>Seleccionar</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}h</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Personas *</label>
                  <input name="personas" type="number" required min={7} max={200} value={personas}
                    onChange={e => setPersonas(parseInt(e.target.value) || 7)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--sand)', fontSize: '.92rem', color: 'var(--ink)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Zona</label>
                  <select name="zona" defaultValue=""
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--sand)', fontSize: '.92rem', color: 'var(--ink)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
                    <option value="">Sin preferencia</option>
                    <option value="fuera">☀️ Terraza</option>
                    <option value="dentro">🏠 Interior</option>
                  </select>
                </div>
              </div>

              {/* Price preview */}
              {selectedMenu && personas >= 7 && (
                <div style={{ marginTop: 18, padding: '16px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--warm-50)', border: '1px solid var(--sand)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{selectedMenu.name} × {personas} pers.</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{total}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.92rem', paddingTop: 8, borderTop: '1px solid var(--sand)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Señal a pagar (40%)</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>{deposit}€</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Datos de contacto ── */}
          {menuCode && (
            <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--sand)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', fontSize: '.78rem', fontWeight: 700 }}>4</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>Tus datos</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Nombre *</label>
                  <input name="nombre" type="text" required placeholder="Tu nombre" minLength={2} defaultValue={prefillNombre}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--sand)', fontSize: '.92rem', color: 'var(--ink)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Teléfono *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ padding: '12px 10px', background: 'var(--warm-50)', borderRadius: 'var(--radius-sm)', fontSize: '.88rem', color: 'var(--text-muted)', border: '1.5px solid var(--sand)', whiteSpace: 'nowrap' }}>+34</span>
                    <input name="telefono" type="tel" required placeholder="640 079 411" minLength={6} defaultValue={prefillTelefono}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--sand)', fontSize: '.92rem', color: 'var(--ink)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)', minWidth: 0 }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          {menuCode && (
            <div style={{ padding: '24px 28px' }}>
              {/* Info box */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(176,141,87,.06)', border: '1px solid rgba(176,141,87,.12)', marginBottom: 20 }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
                <p style={{ fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                  Al confirmar, recibirás un SMS con los datos de transferencia bancaria para la señal del 40%.
                  Tienes 4 días para completar el pago. Puedes modificar o cancelar hasta 72h antes del evento.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '.82rem',
                  fontWeight: 600,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: '#fff',
                  background: submitting ? 'var(--text-muted)' : 'var(--gold)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all .3s',
                  boxShadow: submitting ? 'none' : '0 4px 18px rgba(176,141,87,.25)',
                }}
              >
                {submitting ? 'Enviando...' : 'Confirmar reserva'}
              </button>
            </div>
          )}
        </form>

        {/* ── Conditions footer ── */}
        <div style={{ marginTop: 24, padding: '20px 24px', borderRadius: 'var(--radius)', background: 'var(--warm-50)', border: '1px solid var(--sand)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '.95rem', fontWeight: 400, color: 'var(--ink)', marginBottom: 12, textAlign: 'center' }}>Condiciones</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { icon: '💳', text: 'Señal del 40% por transferencia' },
              { icon: '📅', text: 'Mínimo 5 días de antelación' },
              { icon: '⏰', text: '4 días para realizar el pago' },
              { icon: '🔄', text: 'Modificación hasta 72h antes' },
              { icon: '⚠️', text: 'Alergias: avisar 72h antes' },
              { icon: '✅', text: 'IVA incluido en todos los precios' },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: '.88rem', flexShrink: 0 }}>{c.icon}</span>
                <p style={{ fontSize: '.78rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 32, textAlign: 'center', paddingBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '.88rem', color: 'var(--text-muted)', letterSpacing: '.15em', marginBottom: 6 }}>CANAL OLÍMPICO</p>
          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Av. del Canal Olímpic, s/n · Castelldefels, Barcelona
          </p>
          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            <a href="tel:+34930347246" style={{ color: 'var(--gold)', textDecoration: 'none' }}>930 347 246</a>
          </p>
        </div>

      </div>
    </div>
  )
}

export default function ReservarPage() {
  return (
    <Suspense fallback={
      <div className="landing" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>Cargando...</p>
      </div>
    }>
      <ReservarForm />
    </Suspense>
  )
}
