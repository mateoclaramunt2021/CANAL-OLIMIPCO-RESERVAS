'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

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

export default function NewReservation() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState<{ available: boolean; message: string; alternatives: string[] } | null>(null)
  const [checkingAvail, setCheckingAvail] = useState(false)

  // Form data
  const [eventType, setEventType] = useState('RESERVA_NORMAL')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('14:00')
  const [personas, setPersonas] = useState(2)
  const [zona, setZona] = useState<'fuera' | 'dentro' | ''>('')
  const [menuCode, setMenuCode] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const isEvent = eventType !== 'RESERVA_NORMAL'
  const availableMenus = MENUS[eventType] || []
  const selectedMenu = availableMenus.find(m => m.code === menuCode)
  const total = selectedMenu ? selectedMenu.price * personas : 0
  const deposit = Math.round(total * 0.4 * 100) / 100

  const checkAvailability = async () => {
    setCheckingAvail(true)
    setAvailability(null)
    setError('')
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, hora, personas, event_type: eventType, zona: zona || undefined }),
      })
      const data = await res.json()
      if (data.available !== undefined) {
        setAvailability(data)
      } else {
        setError(data.error || 'Error comprobando disponibilidad')
      }
    } catch {
      setError('Error de conexión')
    }
    setCheckingAvail(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        nombre,
        telefono: telefono.startsWith('+') ? telefono : `+34${telefono.replace(/\s/g, '')}`,
        fecha,
        hora,
        personas,
        event_type: eventType,
      }
      if (zona) body.zona = zona
      if (menuCode && isEvent) body.menu_code = menuCode

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        router.push(`/reservations/${data.reservation_id}`)
      } else {
        setError(data.error || 'Error creando reserva')
      }
    } catch {
      setError('Error de conexión')
    }
    setSubmitting(false)
  }

  const canGoStep2 = eventType !== ''
  const canGoStep3 = fecha && hora && personas >= 1
  const canGoStep4 = isEvent ? menuCode !== '' : true
  const canSubmit = nombre.trim().length >= 2 && telefono.trim().length >= 6

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <button onClick={() => router.push('/reservations')} className="text-sm text-slate-500 hover:text-blue-600 transition-colors mb-2 block">← Volver a reservas</button>
          <h1 className="text-3xl font-bold text-slate-900">Nueva Reserva</h1>
          <p className="text-slate-500 mt-1">Crear reserva manualmente</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step ? 'bg-blue-600 text-white shadow-md' :
                s < step ? 'bg-emerald-500 text-white' :
                'bg-slate-200 text-slate-400'
              }`}>{s < step ? '✓' : s}</div>
              {s < 5 && <div className={`w-8 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
          <span className="text-sm text-slate-400 ml-3">
            {step === 1 ? 'Tipo' : step === 2 ? 'Fecha y hora' : step === 3 ? (isEvent ? 'Menú' : 'Zona') : step === 4 ? 'Datos cliente' : 'Confirmar'}
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          {/* STEP 1: Event Type */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">¿Qué tipo de reserva?</h2>
              <div className="space-y-2">
                {EVENT_TYPES.map(et => (
                  <button
                    key={et.value}
                    onClick={() => { setEventType(et.value); setMenuCode(''); }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      eventType === et.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base font-medium text-slate-900">{et.label}</span>
                    <span className="text-sm text-slate-500 block mt-0.5">{et.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => { setStep(2); setError(''); }} disabled={!canGoStep2} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Siguiente →</button>
              </div>
            </div>
          )}

          {/* STEP 2: Date, Time, Persons */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Fecha, hora y personas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Fecha *</label>
                  <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setAvailability(null); }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Hora *</label>
                  <input type="time" value={hora} onChange={e => { setHora(e.target.value); setAvailability(null); }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Personas *</label>
                  <input type="number" min={1} max={200} value={personas} onChange={e => { setPersonas(Math.max(1, parseInt(e.target.value) || 1)); setAvailability(null); }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>

              {/* Availability check */}
              {fecha && hora && (
                <div className="mt-4">
                  <button onClick={checkAvailability} disabled={checkingAvail} className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50">
                    {checkingAvail ? 'Comprobando...' : '🔍 Comprobar disponibilidad'}
                  </button>
                  {availability && (
                    <div className={`mt-3 p-3 rounded-xl text-sm ${availability.available ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                      <p className="font-medium">{availability.available ? '✅ Disponible' : '⚠️ No disponible'}</p>
                      <p className="mt-1">{availability.message}</p>
                      {!availability.available && availability.alternatives?.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-sm">Alternativas:</p>
                          <div className="flex gap-2 mt-1">
                            {availability.alternatives.map(alt => (
                              <button key={alt} onClick={() => { setHora(alt); setAvailability(null); }} className="px-3 py-1 bg-white rounded-lg text-sm font-medium border border-amber-300 hover:bg-amber-50 transition-colors">{alt}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">← Atrás</button>
                <button onClick={() => { setStep(3); setError(''); }} disabled={!canGoStep3} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Siguiente →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Zone (normal) or Menu (event) */}
          {step === 3 && (
            <div>
              {isEvent ? (
                <>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Elegir menú</h2>
                  <div className="space-y-2">
                    {availableMenus.map(m => (
                      <button
                        key={m.code}
                        onClick={() => setMenuCode(m.code)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          menuCode === m.code ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-900">{m.name}</span>
                          <span className="font-bold text-slate-900">{m.price}€/pers.</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedMenu && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{personas} personas × {selectedMenu.price}€</span>
                        <span className="font-bold text-slate-900">{total.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-amber-700">Señal 40%</span>
                        <span className="font-bold text-amber-700">{deposit.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Zona preferida (opcional)</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'fuera' as const, label: '☀️ Fuera', desc: 'Terraza' },
                      { value: 'dentro' as const, label: '🏠 Dentro', desc: 'Interior' },
                      { value: '' as const, label: '🤷 Sin preferencia', desc: 'La que haya' },
                    ].map(z => (
                      <button
                        key={z.value}
                        onClick={() => setZona(z.value)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          zona === z.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{z.label.split(' ')[0]}</span>
                        <span className="text-sm font-medium text-slate-700">{z.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">← Atrás</button>
                <button onClick={() => { setStep(4); setError(''); }} disabled={!canGoStep4} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Siguiente →</button>
              </div>
            </div>
          )}

          {/* STEP 4: Client data */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Datos del cliente</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Nombre *</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Teléfono *</label>
                  <div className="flex gap-2">
                    <span className="px-3 py-3 bg-slate-100 rounded-xl text-sm text-slate-500 border border-slate-200">+34</span>
                    <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="640 079 411" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">← Atrás</button>
                <button onClick={() => { setStep(5); setError(''); }} disabled={!canSubmit} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Revisar →</button>
              </div>
            </div>
          )}

          {/* STEP 5: Summary + Confirm */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumen de la reserva</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Tipo</p>
                    <p className="text-sm font-semibold text-slate-900">{EVENT_TYPES.find(e => e.value === eventType)?.label}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Personas</p>
                    <p className="text-sm font-semibold text-slate-900">{personas}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Fecha</p>
                    <p className="text-sm font-semibold text-slate-900">{fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Hora</p>
                    <p className="text-sm font-semibold text-slate-900">{hora}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Cliente</p>
                    <p className="text-sm font-semibold text-slate-900">{nombre}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Teléfono</p>
                    <p className="text-sm font-semibold text-slate-900">+34 {telefono}</p>
                  </div>
                  {zona && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">Zona</p>
                      <p className="text-sm font-semibold text-slate-900">{zona === 'fuera' ? '☀️ Fuera' : '🏠 Dentro'}</p>
                    </div>
                  )}
                  {selectedMenu && (
                    <>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">Menú</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedMenu.name}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-600">Total</p>
                        <p className="text-lg font-bold text-blue-700">{total.toFixed(2)}€</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-600">Señal 40%</p>
                        <p className="text-lg font-bold text-amber-700">{deposit.toFixed(2)}€</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(4)} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">← Atrás</button>
                <button onClick={handleSubmit} disabled={submitting} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                  {submitting ? 'Creando...' : '✅ Confirmar Reserva'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
