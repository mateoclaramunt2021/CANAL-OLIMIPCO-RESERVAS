import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

const EVENT_TYPES = [
  { value: 'RESERVA_NORMAL', label: '🪑 Mesa Normal', desc: 'Restaurante (2-6 personas)' },
  { value: 'INFANTIL_CUMPLE', label: '🎂 Infantil / Cumple', desc: 'Cumpleaños infantiles' },
  { value: 'GRUPO_SENTADO', label: '🍽️ Grupo Sentado', desc: 'Grupos con menú sentados' },
  { value: 'GRUPO_PICA_PICA', label: '🥘 Pica-Pica', desc: 'Grupos formato pica-pica' },
  { value: 'NOCTURNA_EXCLUSIVA', label: '🌙 Nocturna Exclusiva', desc: 'Eventos nocturnos exclusivos' },
]

const MENUS: Record<string, { code: string; name: string; price: number }[]> = {
  INFANTIL_CUMPLE: [
    { code: 'menu_infantil', name: 'Menú Infantil', price: 14.5 },
  ],
  GRUPO_SENTADO: [
    { code: 'menu_grupo_34', name: 'Menú Grupo Premium', price: 34 },
    { code: 'menu_grupo_29', name: 'Menú Grupo', price: 29 },
  ],
  GRUPO_PICA_PICA: [
    { code: 'menu_pica_34', name: 'Pica-Pica Premium', price: 34 },
    { code: 'menu_pica_30', name: 'Pica-Pica', price: 30 },
  ],
  NOCTURNA_EXCLUSIVA: [
    { code: 'menu_grupo_34', name: 'Menú Grupo Premium', price: 34 },
    { code: 'menu_grupo_29', name: 'Menú Grupo', price: 29 },
    { code: 'menu_pica_34', name: 'Pica-Pica Premium', price: 34 },
    { code: 'menu_pica_30', name: 'Pica-Pica', price: 30 },
  ],
}

// Collect all unique menus for the select
const ALL_MENUS = Object.values(MENUS).flat().filter((m, i, arr) => arr.findIndex(x => x.code === m.code) === i)

export default async function NewReservation({ searchParams }: { searchParams: Promise<{ error?: string; nombre?: string; telefono?: string; mode?: string }> }) {
  const params = await searchParams

  const today = new Date().toISOString().split('T')[0]

  // Si viene de un SMS de grupo, precargar datos
  const isEventMode = params.mode === 'evento'
  const prefillNombre = params.nombre || ''
  const prefillTelefono = params.telefono?.replace('+34', '') || ''

  return (
    <DashboardLayout>
      <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <a href="/reservations" style={{ color: '#8a8578', fontSize: '13px', textDecoration: 'none' }}>← Volver a reservas</a>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: '#1a1a1a', margin: '8px 0 0' }}>
            Nueva Reserva
          </h1>
          <p style={{ color: '#8a8578', fontSize: '14px', marginTop: '4px' }}>Crear reserva manualmente</p>
        </div>

        {params.error && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #e8c9c9', background: '#fef2f2', color: '#c0392b', fontSize: '14px' }}>
            ⚠️ {params.error}
          </div>
        )}

        {isEventMode && (
          <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', border: '1px solid #d0dfff', background: 'linear-gradient(135deg, #f0f5ff, #e8f0fe)', fontSize: '14px' }}>
            <p style={{ fontWeight: 600, color: '#2c5282', marginBottom: '4px' }}>🎉 Reserva de Grupo / Evento</p>
            <p style={{ color: '#4a6fa5', margin: 0 }}>Elige el tipo de evento, menú, fecha y personas. Al finalizar podrás pagar la señal (40%) con tarjeta.</p>
          </div>
        )}

        <form method="POST" action="/api/reservations/form" style={{ background: '#faf9f6', border: '1px solid #e8e2d6', borderRadius: '16px', padding: '24px' }}>

          {/* Section 1: Event Type */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#1a1a1a', marginBottom: '12px' }}>
              1. Tipo de reserva
            </h2>
            <select name="event_type" required defaultValue={isEventMode ? 'GRUPO_SENTADO' : 'RESERVA_NORMAL'} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }}>
              {EVENT_TYPES.map(et => (
                <option key={et.value} value={et.value}>{et.label} — {et.desc}</option>
              ))}
            </select>
          </div>

          {/* Section 2: Date, Time, Persons */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#1a1a1a', marginBottom: '12px' }}>
              2. Fecha, hora y personas
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Fecha *</label>
                <input name="fecha" type="date" required min={today}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Hora *</label>
                <input name="hora" type="time" required defaultValue="14:00"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Personas *</label>
                <input name="personas" type="number" required min={1} max={200} defaultValue={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Section 3: Zone & Menu */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#1a1a1a', marginBottom: '12px' }}>
              3. Zona y menú
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Zona preferida</label>
                <select name="zona" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Sin preferencia</option>
                  <option value="fuera">☀️ Fuera (Terraza)</option>
                  <option value="dentro">🏠 Dentro (Interior)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Menú (para grupos/eventos)</label>
                <select name="menu_code" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Sin menú (mesa normal)</option>
                  {ALL_MENUS.map(m => (
                    <option key={m.code} value={m.code}>{m.name} — {m.price}€/pers</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Client Data */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#1a1a1a', marginBottom: '12px' }}>
              4. Datos del cliente
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                <input name="nombre" type="text" required placeholder="Nombre completo" minLength={2} defaultValue={prefillNombre}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Teléfono *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '10px 12px', background: '#f0ebe3', borderRadius: '10px', fontSize: '14px', color: '#8a8578', border: '1px solid #d4c9b0' }}>+34</span>
                  <input name="telefono" type="tel" required placeholder="640 079 411" minLength={6} defaultValue={prefillTelefono}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e8e2d6' }}>
            <a href="/reservations" style={{ padding: '10px 20px', fontSize: '14px', color: '#5c5549', border: '1px solid #d4c9b0', borderRadius: '10px', textDecoration: 'none' }}>
              ← Cancelar
            </a>
            <button type="submit" style={{ padding: '12px 32px', fontSize: '14px', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #27ae60, #219a52)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
              ✅ Crear Reserva
            </button>
          </div>
        </form>

        {/* Reference info */}
        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: '#f0f5ff', border: '1px solid #d0dfff' }}>
          <p style={{ fontSize: '13px', color: '#4a6fa5', fontWeight: 600, marginBottom: '8px' }}>ℹ️ Información</p>
          <ul style={{ fontSize: '12px', color: '#5c7caa', margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
            <li>Para <strong>reserva normal</strong>, se asigna mesa automáticamente</li>
            <li>Para <strong>grupos/eventos</strong>, selecciona un menú y se generará enlace de pago Stripe (40% señal)</li>
            <li>El cliente recibirá confirmación por SMS automáticamente</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
