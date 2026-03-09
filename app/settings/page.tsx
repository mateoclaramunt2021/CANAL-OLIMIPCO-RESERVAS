import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  // Server-side health checks
  let supabaseOk = false
  let supabaseDetail = 'Sin conexión'
  try {
    const { data, error } = await supabaseAdmin.from('reservations').select('id').limit(1)
    if (!error) { supabaseOk = true; supabaseDetail = 'Conexión activa' }
    else { supabaseDetail = error.message }
  } catch { supabaseDetail = 'Error de conexión' }

  let waOk = false
  let waDetail = 'No configurado'
  try {
    const waToken = process.env.WHATSAPP_TOKEN
    const waPhone = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (waToken && waPhone) { waOk = true; waDetail = 'Credenciales configuradas' }
    else { waDetail = 'Falta WHATSAPP_TOKEN o PHONE_NUMBER_ID' }
  } catch { /* noop */ }

  const stripeOk = !!process.env.STRIPE_SECRET_KEY
  const vapiOk = !!process.env.VAPI_API_KEY

  const checks = [
    { label: 'Supabase', desc: 'Base de datos y autenticación', icon: '🗄️', ok: supabaseOk, detail: supabaseDetail },
    { label: 'Stripe', desc: 'Pagos con tarjeta', icon: '💳', ok: stripeOk, detail: stripeOk ? 'Clave configurada' : 'STRIPE_SECRET_KEY no configurada' },
    { label: 'WhatsApp', desc: 'API de mensajería', icon: '💬', ok: waOk, detail: waDetail, href: '/settings/whatsapp' },
    { label: 'VAPI', desc: 'Asistente de voz IA', icon: '🎙️', ok: vapiOk, detail: vapiOk ? 'API Key configurada' : 'VAPI_API_KEY no configurada' },
  ]

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
      <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>⚙️ Configuración</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Estado de servicios e información del sistema</p>
        </div>

        {/* Health Checks */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Estado de Servicios</h2>
            <a href="/settings" style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: '#475569', textDecoration: 'none' }}>🔄 Refrescar</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {checks.map(c => {
              const inner = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{c.label}</h3>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.ok ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{c.desc}</p>
                    <p style={{ fontSize: '12px', marginTop: '4px', fontWeight: 500, color: c.ok ? '#059669' : '#dc2626' }}>{c.detail}</p>
                  </div>
                </div>
              )
              const style = {
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${c.ok ? '#a7f3d0' : '#fecaca'}`,
                background: c.ok ? 'rgba(236,253,245,0.5)' : 'rgba(254,242,242,0.5)',
                display: 'block',
                textDecoration: 'none',
              }
              return c.href ? (
                <a key={c.label} href={c.href} style={style}>{inner}</a>
              ) : (
                <div key={c.label} style={style}>{inner}</div>
              )
            })}
          </div>
        </div>

        {/* Restaurant Info */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>📍 Información del Restaurante</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {restaurantInfo.map(info => (
              <div key={info.label} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{info.label}</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0' }}>{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Variables Reference */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>🔑 Variables de Entorno</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Variables necesarias en Vercel / .env.local</p>
          {envVars.map(v => (
            <div key={v.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px' }}>
              <div>
                <code style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1e293b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{v.key}</code>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
