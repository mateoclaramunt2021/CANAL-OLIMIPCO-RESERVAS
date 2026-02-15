'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

// Hardcoded menus matching core/menus.ts
const MENUS = [
  {
    code: 'menu_grupo_34',
    name: 'Menú Grupo Premium',
    price: 34,
    description: 'Embutidos ibéricos, pan coca tomate, bravas · Solomillo pimienta / Bacalao setas / Parrillada verduras · Tarta o Helado',
    drinks: '1 bebida + agua + café',
    eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'],
    color: 'from-purple-500 to-indigo-600',
  },
  {
    code: 'menu_grupo_29',
    name: 'Menú Grupo',
    price: 29,
    description: 'Rigatoni crema tomate / Ensalada cabra · Solomillo pimienta verde / Lubina horno / Parrillada verduras · Sorbete limón cava / Macedonia',
    drinks: '1 bebida + agua',
    eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'],
    color: 'from-blue-500 to-cyan-600',
  },
  {
    code: 'menu_infantil',
    name: 'Menú Infantil',
    price: 14.5,
    description: 'Macarrones tomate / Hamburguesa patatas / Fingers pollo / Canelones · Tarta / Helado / Yogur',
    drinks: '1 bebida',
    eventTypes: ['INFANTIL_CUMPLE'],
    color: 'from-pink-500 to-rose-600',
  },
  {
    code: 'menu_pica_34',
    name: 'Pica-Pica Premium',
    price: 34,
    description: 'Embutidos ibéricos, pan coca, bravas, brocheta sepia y gambas, alcachofas jamón pato, ensaladitas cabra, saquitos carrillera, croquetas, minihamburguesas',
    drinks: '2 bebidas',
    eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'],
    color: 'from-orange-500 to-amber-600',
  },
  {
    code: 'menu_pica_30',
    name: 'Pica-Pica',
    price: 30,
    description: 'Tortilla patatas, croquetas, minihamburguesas brioxe, calamarcitos andaluza, fingers pollo, nachos guacamole',
    drinks: '2 bebidas',
    eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'],
    color: 'from-yellow-500 to-orange-600',
  },
  {
    code: 'menu_padres_38',
    name: 'Menú Padres/Adultos',
    price: 38,
    description: 'Menú para adultos acompañantes en eventos infantiles',
    drinks: '1 bebida + agua + café',
    eventTypes: ['INFANTIL_CUMPLE'],
    color: 'from-teal-500 to-emerald-600',
  },
]

const eventLabels: Record<string, string> = {
  GRUPO_SENTADO: 'Grupo Sentado',
  NOCTURNA_EXCLUSIVA: 'Nocturna',
  INFANTIL_CUMPLE: 'Infantil',
  GRUPO_PICA_PICA: 'Pica-Pica',
}

export default function MenusPage() {
  const [calcMenu, setCalcMenu] = useState(MENUS[0].code)
  const [calcPersonas, setCalcPersonas] = useState(20)

  const selectedMenu = MENUS.find(m => m.code === calcMenu)!
  const total = selectedMenu.price * calcPersonas
  const deposit = Math.round(total * 0.4 * 100) / 100

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Menús</h1>
          <p className="text-slate-500 mt-1">Catálogo de menús para eventos y grupos</p>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {MENUS.map(menu => (
            <div key={menu.code} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow">
              <div className={`bg-gradient-to-r ${menu.color} p-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg">{menu.name}</h3>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-bold">{menu.price}€</span>
                </div>
                <p className="text-white/80 text-xs mt-1">por persona · IVA incluido</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-600 leading-relaxed">{menu.description}</p>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs">🥤</span>
                    <span className="text-xs text-slate-500">{menu.drinks}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {menu.eventTypes.map(et => (
                      <span key={et} className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-medium text-slate-600">
                        {eventLabels[et] || et}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calculator */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">🧮 Calculadora de Presupuesto</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Menú</label>
              <select
                value={calcMenu}
                onChange={e => setCalcMenu(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {MENUS.map(m => (
                  <option key={m.code} value={m.code}>{m.name} ({m.price}€/pers.)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Personas</label>
              <input
                type="number"
                min={1}
                max={200}
                value={calcPersonas}
                onChange={e => setCalcPersonas(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">{calcPersonas} × {selectedMenu.price}€</span>
                  <span className="text-sm font-semibold text-slate-900">{total.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200">
                  <span className="text-sm font-medium text-blue-700">Total</span>
                  <span className="text-lg font-bold text-blue-700">{total.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-amber-700">Señal (40%)</span>
                  <span className="text-sm font-bold text-amber-700">{deposit.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extra hours */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Extensiones Horarias</h3>
            <div className="flex gap-4">
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-800">1:00 – 2:00 AM</p>
                <p className="text-lg font-bold text-slate-900">100€</p>
              </div>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-800">2:00 – 3:00 AM</p>
                <p className="text-lg font-bold text-slate-900">200€</p>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Condiciones</h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>• Señal del <strong>40%</strong> para confirmar eventos/grupos</li>
              <li>• Plazo de pago: <strong>4 días</strong> tras reservar</li>
              <li>• Antelación mínima: <strong>5 días</strong> para eventos</li>
              <li>• Cancelación con <strong>72h</strong> de antelación o se pierde la señal</li>
              <li>• Modificar asistentes/alergias: <strong>72h</strong> antes</li>
              <li>• Todos los precios incluyen <strong>IVA</strong></li>
              <li>• No se permite comida externa. Decoración sí, confeti no</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
