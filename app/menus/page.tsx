import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

const MENUS = [
  { code: 'menu_grupo_34', name: 'Menú Grupo Premium', price: 34, description: 'Embutidos ibéricos, pan coca tomate, bravas · Solomillo pimienta / Bacalao setas / Parrillada verduras · Tarta o Helado', drinks: '1 bebida + agua + café', eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'], bg: '#7c3aed', bgEnd: '#4f46e5' },
  { code: 'menu_grupo_29', name: 'Menú Grupo', price: 29, description: 'Rigatoni crema tomate / Ensalada cabra · Solomillo pimienta verde / Lubina horno / Parrillada verduras · Sorbete limón cava / Macedonia', drinks: '1 bebida + agua', eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'], bg: '#3b82f6', bgEnd: '#0891b2' },
  { code: 'menu_infantil', name: 'Menú Infantil', price: 14.5, description: 'Macarrones tomate / Hamburguesa patatas / Fingers pollo / Canelones · Tarta / Helado / Yogur', drinks: '1 bebida', eventTypes: ['INFANTIL_CUMPLE'], bg: '#ec4899', bgEnd: '#e11d48' },
  { code: 'menu_pica_34', name: 'Pica-Pica Premium', price: 34, description: 'Embutidos ibéricos, pan coca, bravas, brocheta sepia y gambas, alcachofas jamón pato, ensaladitas cabra, saquitos carrillera, croquetas, minihamburguesas', drinks: '2 bebidas', eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'], bg: '#f97316', bgEnd: '#f59e0b' },
  { code: 'menu_pica_30', name: 'Pica-Pica', price: 30, description: 'Tortilla patatas, croquetas, minihamburguesas brioxe, calamarcitos andaluza, fingers pollo, nachos guacamole', drinks: '2 bebidas', eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'], bg: '#eab308', bgEnd: '#f97316' },
  { code: 'menu_padres_38', name: 'Menú Padres/Adultos', price: 38, description: 'Menú para adultos acompañantes en eventos infantiles', drinks: '1 bebida + agua + café', eventTypes: ['INFANTIL_CUMPLE'], bg: '#14b8a6', bgEnd: '#059669' },
]

const eventLabels: Record<string, string> = {
  GRUPO_SENTADO: 'Grupo Sentado',
  NOCTURNA_EXCLUSIVA: 'Nocturna',
  INFANTIL_CUMPLE: 'Infantil',
  GRUPO_PICA_PICA: 'Pica-Pica',
}

export default async function MenusPage({ searchParams }: { searchParams: Promise<{ menu?: string; personas?: string }> }) {
  const params = await searchParams
  const calcMenu = params.menu || MENUS[0].code
  const calcPersonas = Math.max(1, parseInt(params.personas || '20') || 1)

  const selectedMenu = MENUS.find(m => m.code === calcMenu) || MENUS[0]
  const total = selectedMenu.price * calcPersonas
  const deposit = Math.round(total * 0.4 * 100) / 100

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>🍽️ Menús</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Catálogo de menús para eventos y grupos</p>
        </div>

        {/* Menu Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {MENUS.map(menu => (
            <div key={menu.code} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ background: `linear-gradient(135deg, ${menu.bg}, ${menu.bgEnd})`, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: 0 }}>{menu.name}</h3>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>{menu.price}€</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px' }}>por persona · IVA incluido</p>
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{menu.description}</p>
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px' }}>🥤</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{menu.drinks}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {menu.eventTypes.map(et => (
                      <span key={et} style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '10px', fontWeight: 500, color: '#475569' }}>
                        {eventLabels[et] || et}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calculator - uses URL params instead of state */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>🧮 Calculadora de Presupuesto</h2>
          <form method="GET" action="/menus" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '8px' }}>Menú</label>
              <select name="menu" defaultValue={calcMenu} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', background: '#fff' }}>
                {MENUS.map(m => (
                  <option key={m.code} value={m.code}>{m.name} ({m.price}€/pers.)</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '8px' }}>Personas</label>
              <input type="number" name="personas" min={1} max={200} defaultValue={calcPersonas} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <button type="submit" style={{ width: '100%', padding: '12px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Calcular</button>
            </div>
          </form>

          {/* Result */}
          <div style={{ marginTop: '20px', background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', borderRadius: '12px', padding: '16px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>{calcPersonas} × {selectedMenu.price}€</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{total.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #93c5fd' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#1d4ed8' }}>Total</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#1d4ed8' }}>{total.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', color: '#b45309' }}>Señal (40%)</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#b45309' }}>{deposit.toFixed(2)}€</span>
            </div>
          </div>

          {/* Extra hours */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px', marginTop: 0 }}>Extensiones Horarias</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', margin: 0 }}>1:00 – 2:00 AM</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>100€</p>
              </div>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', margin: 0 }}>2:00 – 3:00 AM</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>200€</p>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px', marginTop: 0 }}>Condiciones</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                'Señal del 40% para confirmar eventos/grupos',
                'Plazo de pago: 4 días tras reservar',
                'Antelación mínima: 5 días para eventos',
                'Cancelación con 72h de antelación o se pierde la señal',
                'Modificar asistentes/alergias: 72h antes',
                'Todos los precios incluyen IVA',
                'No se permite comida externa. Decoración sí, confeti no',
              ].map((c, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#475569', padding: '3px 0' }}>• {c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
