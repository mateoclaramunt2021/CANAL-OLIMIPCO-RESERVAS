'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface HealthCheck {
  label: string
  desc: string
  icon: string
  status: 'ok' | 'error' | 'checking'
  detail: string
}

export default function SettingsPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { label: 'Supabase', desc: 'Base de datos y autenticación', icon: '🗄️', status: 'checking', detail: 'Comprobando...' },
    { label: 'Stripe', desc: 'Pagos con tarjeta', icon: '💳', status: 'checking', detail: 'Comprobando...' },
    { label: 'WhatsApp', desc: 'API de mensajería', icon: '💬', status: 'checking', detail: 'Comprobando...' },
    { label: 'VAPI', desc: 'Asistente de voz IA', icon: '🎙️', status: 'checking', detail: 'Comprobando...' },
  ])

  useEffect(() => {
    runChecks()
  }, [])

  const runChecks = async () => {
    // Supabase
    try {
      const res = await fetch('/api/reservations?limit=1')
      if (res.ok) {
        updateCheck('Supabase', 'ok', 'Conexión activa')
      } else {
        updateCheck('Supabase', 'error', `HTTP ${res.status}`)
      }
    } catch {
      updateCheck('Supabase', 'error', 'Sin conexión')
    }

    // Stripe
    try {
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      updateCheck('Stripe', stripeKey ? 'ok' : 'error', stripeKey ? 'Clave configurada' : 'Clave no configurada (env)')
    } catch {
      updateCheck('Stripe', 'error', 'Error comprobando')
    }

    // WhatsApp — check via API test endpoint
    try {
      const waRes = await fetch('/api/settings/whatsapp-test', { method: 'POST' })
      const waData = await waRes.json()
      updateCheck('WhatsApp', waData.ok ? 'ok' : 'error', waData.ok ? `Conectado: ${waData.name || waData.phone || 'OK'}` : 'No configurado — Configurar →')
    } catch {
      updateCheck('WhatsApp', 'error', 'Error comprobando')
    }

    // VAPI
    try {
      const vapiKey = process.env.NEXT_PUBLIC_VAPI_KEY
      updateCheck('VAPI', vapiKey ? 'ok' : 'error', vapiKey ? 'API Key configurada' : 'Configurado en servidor (env)')
    } catch {
      updateCheck('VAPI', 'error', 'Error comprobando')
    }
  }

  const updateCheck = (label: string, status: HealthCheck['status'], detail: string) => {
    setChecks(prev => prev.map(c => c.label === label ? { ...c, status, detail } : c))
  }

  const envVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', desc: 'URL del proyecto Supabase' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', desc: 'Clave pública Supabase' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Clave de servicio Supabase (server-side)' },
    { key: 'STRIPE_SECRET_KEY', desc: 'Clave secreta de Stripe' },
    { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', desc: 'Clave pública de Stripe' },
    { key: 'STRIPE_WEBHOOK_SECRET', desc: 'Secreto del webhook Stripe' },
    { key: 'WHATSAPP_TOKEN', desc: 'Token API WhatsApp Business' },
    { key: 'WHATSAPP_PHONE_NUMBER_ID', desc: 'ID del número de WhatsApp' },
    { key: 'WHATSAPP_VERIFY_TOKEN', desc: 'Token verificación webhook' },
    { key: 'VAPI_API_KEY', desc: 'Clave API de VAPI' },
    { key: 'VAPI_ASSISTANT_ID', desc: 'ID del asistente VAPI' },
    { key: 'NEXT_PUBLIC_BASE_URL', desc: 'URL base del proyecto (Vercel)' },
  ]

  const restaurantInfo = [
    { label: 'Mesas fuera', value: '18 (F1–F18)' },
    { label: 'Mesas dentro', value: '10 (D1–D10)' },
    { label: 'Capacidad total asientos', value: '98 plazas' },
    { label: 'Capacidad eventos', value: '100 personas máx.' },
    { label: 'Horario', value: 'Miér–Dom · 13:00–16:00 y 20:00–23:00' },
    { label: 'Días cerrado', value: 'Lunes y Martes' },
    { label: 'Señal', value: '40% del total' },
    { label: 'Plazo pago', value: '4 días' },
    { label: 'Cancelación', value: '72h de antelación' },
  ]

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-500 mt-1">Estado de servicios e información del sistema</p>
        </div>

        {/* Health Checks */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Estado de Servicios</h2>
            <button onClick={runChecks} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">🔄 Refrescar</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {checks.map(c => {
              const isWhatsApp = c.label === 'WhatsApp'
              const CardTag = isWhatsApp ? 'a' : 'div'
              return (
              <CardTag key={c.label} href={isWhatsApp ? '/settings/whatsapp' : undefined} className={`p-4 rounded-xl border-2 transition-all block ${isWhatsApp ? 'cursor-pointer hover:shadow-md' : ''} ${
                c.status === 'ok' ? 'border-emerald-200 bg-emerald-50/50' :
                c.status === 'error' ? 'border-red-200 bg-red-50/50' :
                'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">{c.label}</h3>
                      <span className={`w-3 h-3 rounded-full ${
                        c.status === 'ok' ? 'bg-emerald-500' :
                        c.status === 'error' ? 'bg-red-500' :
                        'bg-slate-400 animate-pulse'
                      }`} />
                    </div>
                    <p className="text-xs text-slate-500">{c.desc}</p>
                    <p className={`text-xs mt-1 font-medium ${
                      c.status === 'ok' ? 'text-emerald-600' :
                      c.status === 'error' ? 'text-red-600' :
                      'text-slate-400'
                    }`}>{c.detail}</p>
                  </div>
                </div>
              </CardTag>
              )
            })}
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📍 Información del Restaurante</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {restaurantInfo.map(info => (
              <div key={info.label} className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500">{info.label}</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Variables Reference */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">🔑 Variables de Entorno</h2>
          <p className="text-sm text-slate-500 mb-4">Variables necesarias en Vercel / .env.local</p>
          <div className="space-y-2">
            {envVars.map(v => (
              <div key={v.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <code className="text-xs font-mono text-slate-800 bg-slate-200 px-2 py-0.5 rounded">{v.key}</code>
                  <p className="text-xs text-slate-500 mt-1">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
