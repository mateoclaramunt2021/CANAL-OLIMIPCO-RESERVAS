'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

export default function WhatsAppSettingsPage() {
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [token, setToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; phone?: string; name?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [step, setStep] = useState(0)

  const webhookUrl = 'https://canalolimpicorestaurante.com/api/webhooks/whatsapp'

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings?keys=WHATSAPP_PHONE_NUMBER_ID,WHATSAPP_TOKEN,WHATSAPP_VERIFY_TOKEN')
      const data = await res.json()
      if (data.ok && data.settings) {
        setPhoneNumberId(data.settings.WHATSAPP_PHONE_NUMBER_ID || '')
        setToken(data.settings.WHATSAPP_TOKEN || '')
        setVerifyToken(data.settings.WHATSAPP_VERIFY_TOKEN || '')
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            WHATSAPP_PHONE_NUMBER_ID: phoneNumberId.trim(),
            WHATSAPP_TOKEN: token.trim(),
            WHATSAPP_VERIFY_TOKEN: verifyToken.trim(),
          },
        }),
      })
      const data = await res.json()
      if (data.ok) setSaved(true)
    } catch { /* ignore */ }
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/whatsapp-test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ ok: false, error: 'Error de conexión' })
    }
    setTesting(false)
  }

  const isConfigured = phoneNumberId && token && verifyToken

  const guideSteps = [
    {
      title: '1. Crear Meta Business Account',
      content: (
        <div className="wa-guide__body">
          <p>Necesitas una cuenta de Meta Business para usar WhatsApp Business API.</p>
          <ol>
            <li>Ve a <a href="https://business.facebook.com" target="_blank" rel="noopener">business.facebook.com</a></li>
            <li>Crea una cuenta si no tienes una</li>
            <li>Verifica tu negocio (nombre, dirección, etc.)</li>
          </ol>
        </div>
      ),
    },
    {
      title: '2. Crear App en Meta Developers',
      content: (
        <div className="wa-guide__body">
          <ol>
            <li>Ve a <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com/apps</a></li>
            <li>Clic en <strong>"Crear aplicación"</strong></li>
            <li>Selecciona <strong>"Business"</strong> → siguiente</li>
            <li>Nombre: <em>"Canal Olímpico WhatsApp"</em></li>
            <li>Asocia tu Meta Business Account</li>
            <li>En el panel de la app, busca <strong>"WhatsApp"</strong> y haz clic en <strong>"Configurar"</strong></li>
          </ol>
        </div>
      ),
    },
    {
      title: '3. Obtener credenciales',
      content: (
        <div className="wa-guide__body">
          <p>En la sección <strong>WhatsApp → API Setup</strong> de tu app encontrarás:</p>
          <ul>
            <li><strong>Phone Number ID</strong> — lo encontrarás debajo de tu número de teléfono</li>
            <li><strong>Temporary Access Token</strong> — clic en "Generate" (caduca en 24h)</li>
          </ul>
          <div className="wa-guide__warning">
            ⚠️ El token temporal caduca en 24h. Para producción, genera un <strong>token permanente</strong>:
            <ol>
              <li>Ve a Business Settings → System Users</li>
              <li>Crea un System User con permisos <em>whatsapp_business_messaging</em></li>
              <li>Genera un token permanente desde ahí</li>
            </ol>
          </div>
          <p>El <strong>Verify Token</strong> es un texto secreto que tú inventas (ej: <code>canalolimpico2026</code>). Lo usarás en el paso siguiente.</p>
        </div>
      ),
    },
    {
      title: '4. Configurar Webhook',
      content: (
        <div className="wa-guide__body">
          <p>En la sección <strong>WhatsApp → Configuration</strong> de tu app:</p>
          <ol>
            <li>Haz clic en <strong>"Edit"</strong> en Webhook</li>
            <li>
              <strong>Callback URL:</strong>
              <div className="wa-guide__copy">
                <code>{webhookUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(webhookUrl)} title="Copiar">📋</button>
              </div>
            </li>
            <li>
              <strong>Verify Token:</strong> el mismo que pongas en el campo "Verify Token" de abajo
            </li>
            <li>Guarda y suscríbete al campo <strong>"messages"</strong></li>
          </ol>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/settings" className="text-slate-400 hover:text-slate-600 transition-colors">
              ← Configuración
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">WhatsApp Business</h1>
              <p className="text-slate-500 text-sm">Configura la conexión con WhatsApp para atender clientes automáticamente</p>
            </div>
            <div className="ml-auto">
              {isConfigured ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Sin configurar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📖 Guía de Configuración</h2>
          <div className="space-y-2">
            {guideSteps.map((s, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setStep(step === i ? -1 : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{s.title}</span>
                  <span className={`text-slate-400 transition-transform ${step === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {step === i && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    {s.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">🔑 Credenciales</h2>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Cargando...</div>
          ) : (
            <div className="space-y-5">
              {/* Phone Number ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone Number ID
                  <span className="text-xs text-slate-400 ml-2">Se encuentra en WhatsApp → API Setup</span>
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={e => setPhoneNumberId(e.target.value)}
                  placeholder="Ej: 123456789012345"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                  style={{ background: '#faf9f6' }}
                />
              </div>

              {/* Token */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Access Token
                  <span className="text-xs text-slate-400 ml-2">Token permanente o temporal de Meta</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="EAAx..."
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                    style={{ background: '#faf9f6' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                  >
                    {showToken ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Verify Token */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Verify Token
                  <span className="text-xs text-slate-400 ml-2">Texto secreto para verificar el webhook</span>
                </label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={e => setVerifyToken(e.target.value)}
                  placeholder="Ej: canalolimpico2026"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                  style={{ background: '#faf9f6' }}
                />
              </div>

              {/* Webhook URL (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Webhook URL
                  <span className="text-xs text-slate-400 ml-2">Copia esta URL en Meta → WhatsApp → Configuration</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-600"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm transition-colors"
                    title="Copiar"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !phoneNumberId || !token || !verifyToken}
                  className="px-6 py-3 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: saving ? '#9ca3af' : 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  {saving ? 'Guardando...' : '💾 Guardar credenciales'}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing || !phoneNumberId || !token}
                  className="px-6 py-3 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-40"
                  style={{ borderColor: '#25D366', color: '#128C7E' }}
                >
                  {testing ? 'Probando...' : '🔌 Probar conexión'}
                </button>
                {saved && (
                  <span className="text-emerald-600 text-sm font-medium animate-pulse">✅ Guardado</span>
                )}
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-xl border-2 ${testResult.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  {testResult.ok ? (
                    <div>
                      <p className="font-medium text-emerald-800">✅ Conexión exitosa</p>
                      {testResult.name && <p className="text-sm text-emerald-600 mt-1">Nombre: {testResult.name}</p>}
                      {testResult.phone && <p className="text-sm text-emerald-600">Número: {testResult.phone}</p>}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-red-800">❌ Error de conexión</p>
                      <p className="text-sm text-red-600 mt-1">{testResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* What you get */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">✨ ¿Qué hace el chatbot?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '📋', title: 'Crear reservas', desc: 'Los clientes reservan directamente por WhatsApp' },
              { icon: '📅', title: 'Consultar disponibilidad', desc: 'Responde si hay mesas libres para fecha/hora' },
              { icon: '🍽️', title: 'Info de menús', desc: 'Envía precios y opciones de menús de grupo' },
              { icon: '❌', title: 'Cancelar reservas', desc: 'El cliente puede cancelar dando su referencia' },
              { icon: '✅', title: 'Confirmaciones automáticas', desc: 'SMS de confirmación con nº reserva, hora, fecha' },
              { icon: '💳', title: 'Links de pago', desc: 'Envía enlace Stripe para señas de grupos' },
            ].map(f => (
              <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-slate-50">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              href="/dashboard/whatsapp"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: '#f0fdf4', color: '#128C7E' }}
            >
              💬 Ver conversaciones →
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
