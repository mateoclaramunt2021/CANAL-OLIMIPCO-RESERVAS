import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const webhookUrl = 'https://canalolimpicorestaurante.com/api/webhooks/whatsapp'

export default async function WhatsAppSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const params = await searchParams

  // Load settings server-side
  const { data: settingsData } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TOKEN', 'WHATSAPP_VERIFY_TOKEN'])

  const settings: Record<string, string> = {}
  for (const row of settingsData || []) {
    settings[row.key] = row.value
  }

  const phoneNumberId = settings.WHATSAPP_PHONE_NUMBER_ID || ''
  const token = settings.WHATSAPP_TOKEN || ''
  const verifyToken = settings.WHATSAPP_VERIFY_TOKEN || ''
  const isConfigured = !!(phoneNumberId && token && verifyToken)

  return (
    <DashboardLayout>
      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <a href="/settings" style={{ color: '#8a8578', fontSize: '13px', textDecoration: 'none' }}>← Configuración</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #25D366, #128C7E)', fontSize: '24px' }}>
              💬
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>WhatsApp Business</h1>
              <p style={{ color: '#8a8578', fontSize: '14px', marginTop: '2px' }}>Configura la conexión con WhatsApp</p>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: isConfigured ? '#ecfdf5' : '#fffbeb', color: isConfigured ? '#059669' : '#d97706', border: `1px solid ${isConfigured ? '#a7f3d0' : '#fde68a'}` }}>
              {isConfigured ? '● Configurado' : '● Sin configurar'}
            </span>
          </div>
        </div>

        {params.ok && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #c0e0d0', background: 'rgba(39,174,96,0.05)', color: '#27ae60', fontSize: '14px' }}>
            ✅ Credenciales guardadas correctamente
          </div>
        )}
        {params.error && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #e8c9c9', background: '#fef2f2', color: '#c0392b', fontSize: '14px' }}>
            ⚠️ {params.error}
          </div>
        )}

        {/* Guide */}
        <div style={{ background: '#faf9f6', border: '1px solid #e8e2d6', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>📖 Guía de Configuración</h2>

          <details style={{ border: '1px solid #e8e2d6', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
            <summary style={{ padding: '16px', fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', background: '#fff' }}>
              1. Crear Meta Business Account
            </summary>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe3', fontSize: '14px', color: '#5c5549', lineHeight: 1.7 }}>
              <p>Necesitas una cuenta de Meta Business para usar WhatsApp Business API.</p>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Ve a <a href="https://business.facebook.com" target="_blank">business.facebook.com</a></li>
                <li>Crea una cuenta si no tienes una</li>
                <li>Verifica tu negocio (nombre, dirección, etc.)</li>
              </ol>
            </div>
          </details>

          <details style={{ border: '1px solid #e8e2d6', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
            <summary style={{ padding: '16px', fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', background: '#fff' }}>
              2. Crear App en Meta Developers
            </summary>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe3', fontSize: '14px', color: '#5c5549', lineHeight: 1.7 }}>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Ve a <a href="https://developers.facebook.com/apps" target="_blank">developers.facebook.com/apps</a></li>
                <li>Clic en <strong>"Crear aplicación"</strong></li>
                <li>Selecciona <strong>"Business"</strong> → siguiente</li>
                <li>Nombre: <em>"Canal Olímpico WhatsApp"</em></li>
                <li>Asocia tu Meta Business Account</li>
                <li>Busca <strong>"WhatsApp"</strong> y haz clic en <strong>"Configurar"</strong></li>
              </ol>
            </div>
          </details>

          <details style={{ border: '1px solid #e8e2d6', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
            <summary style={{ padding: '16px', fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', background: '#fff' }}>
              3. Obtener credenciales
            </summary>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe3', fontSize: '14px', color: '#5c5549', lineHeight: 1.7 }}>
              <p>En <strong>WhatsApp → API Setup</strong> encontrarás:</p>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>Phone Number ID</strong> — debajo de tu número</li>
                <li><strong>Temporary Access Token</strong> — clic en "Generate" (caduca en 24h)</li>
              </ul>
              <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginTop: '8px' }}>
                ⚠️ El token temporal caduca en 24h. Para producción, genera un <strong>token permanente</strong> desde Business Settings → System Users.
              </div>
              <p>El <strong>Verify Token</strong> es un texto secreto que tú inventas (ej: canalolimpico2026).</p>
            </div>
          </details>

          <details style={{ border: '1px solid #e8e2d6', borderRadius: '12px', overflow: 'hidden' }}>
            <summary style={{ padding: '16px', fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', background: '#fff' }}>
              4. Configurar Webhook
            </summary>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe3', fontSize: '14px', color: '#5c5549', lineHeight: 1.7 }}>
              <p>En <strong>WhatsApp → Configuration</strong>:</p>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Clic en <strong>"Edit"</strong> en Webhook</li>
                <li><strong>Callback URL:</strong>
                  <div style={{ padding: '8px 12px', background: '#f0ebe3', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' }}>
                    {webhookUrl}
                  </div>
                </li>
                <li><strong>Verify Token:</strong> el mismo que pongas en el campo de abajo</li>
                <li>Guarda y suscríbete al campo <strong>"messages"</strong></li>
              </ol>
            </div>
          </details>
        </div>

        {/* Credentials Form */}
        <div style={{ background: '#faf9f6', border: '1px solid #e8e2d6', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>🔑 Credenciales</h2>

          <form method="POST" action="/api/settings/form">
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '6px' }}>
                Phone Number ID
                <span style={{ fontSize: '12px', color: '#8a8578', marginLeft: '8px' }}>Se encuentra en WhatsApp → API Setup</span>
              </label>
              <input name="WHATSAPP_PHONE_NUMBER_ID" type="text" defaultValue={phoneNumberId} placeholder="Ej: 123456789012345"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '6px' }}>
                Access Token
                <span style={{ fontSize: '12px', color: '#8a8578', marginLeft: '8px' }}>Token permanente o temporal de Meta</span>
              </label>
              <input name="WHATSAPP_TOKEN" type="password" defaultValue={token} placeholder="EAAx..."
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '6px' }}>
                Verify Token
                <span style={{ fontSize: '12px', color: '#8a8578', marginLeft: '8px' }}>Texto secreto para verificar el webhook</span>
              </label>
              <input name="WHATSAPP_VERIFY_TOKEN" type="text" defaultValue={verifyToken} placeholder="Ej: canalolimpico2026"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '6px' }}>
                Webhook URL
                <span style={{ fontSize: '12px', color: '#8a8578', marginLeft: '8px' }}>Copia esta URL en Meta</span>
              </label>
              <input type="text" readOnly value={webhookUrl}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#8a8578', background: '#f0ebe3', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <button type="submit" style={{ padding: '12px 24px', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                💾 Guardar credenciales
              </button>
            </div>
          </form>
        </div>

        {/* What you get */}
        <div style={{ background: '#faf9f6', border: '1px solid #e8e2d6', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>✨ ¿Qué hace el chatbot?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '📋', title: 'Crear reservas', desc: 'Los clientes reservan directamente por WhatsApp' },
              { icon: '📅', title: 'Consultar disponibilidad', desc: 'Responde si hay mesas libres' },
              { icon: '🍽️', title: 'Info de menús', desc: 'Envía precios y opciones de menús' },
              { icon: '❌', title: 'Cancelar reservas', desc: 'El cliente puede cancelar dando su referencia' },
              { icon: '✅', title: 'Confirmaciones automáticas', desc: 'SMS de confirmación con nº reserva' },
              { icon: '💳', title: 'Links de pago', desc: 'Envía enlace Stripe para señas' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', background: '#f0ebe3' }}>
                <span style={{ fontSize: '24px' }}>{f.icon}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{f.title}</p>
                  <p style={{ fontSize: '12px', color: '#8a8578', marginTop: '2px' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e8e2d6' }}>
            <a href="/dashboard/whatsapp" style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, background: '#ecfdf5', color: '#128C7E', textDecoration: 'none' }}>
              💬 Ver conversaciones →
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
