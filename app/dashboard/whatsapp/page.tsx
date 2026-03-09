import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function formatPhoneDisplay(phone: string) {
  if (phone.startsWith('34') && phone.length === 11) {
    return `+34 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`
  }
  return phone.startsWith('+') ? phone : `+${phone}`
}

interface ConversationSummary {
  phone: string
  name: string
  lastMessage: string
  lastDirection: string
  lastAt: string
  totalMessages: number
  activeStep: string | null
}

export default async function WhatsAppDashboardPage({ searchParams }: { searchParams: Promise<{ phone?: string; ok?: string; error?: string; q?: string }> }) {
  const params = await searchParams
  const selectedPhone = params.phone || null
  const search = (params.q || '').toLowerCase()

  // Fetch conversations server-side
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, reservation_id, direction, body, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  const reservationIds = [...new Set((messages || []).map((m: any) => m.reservation_id).filter(Boolean))]
  let phoneMap: Record<string, { phone: string; name: string }> = {}
  if (reservationIds.length > 0) {
    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_phone, customer_name')
      .in('id', reservationIds)
    for (const r of reservations || []) {
      phoneMap[r.id] = { phone: r.customer_phone, name: r.customer_name }
    }
  }

  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select('phone, step, updated_at')
  const activeSteps: Record<string, string> = {}
  for (const c of conversations || []) {
    activeSteps[c.phone] = c.step
  }

  // Build conversation summaries
  const convMap = new Map<string, ConversationSummary>()
  for (const msg of messages || []) {
    const info = phoneMap[msg.reservation_id]
    if (!info) continue
    const phone = info.phone
    if (!convMap.has(phone)) {
      convMap.set(phone, {
        phone,
        name: info.name || phone,
        lastMessage: msg.body || '',
        lastDirection: msg.direction,
        lastAt: msg.created_at,
        totalMessages: 0,
        activeStep: activeSteps[phone.replace('+', '')] || null,
      })
    }
    convMap.get(phone)!.totalMessages++
  }
  let convList = Array.from(convMap.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  if (search) {
    convList = convList.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search))
  }

  // Fetch messages for selected phone
  let selectedMessages: any[] = []
  let selectedName = ''
  if (selectedPhone) {
    const found = convList.find(c => c.phone === selectedPhone)
    selectedName = found?.name || selectedPhone

    const { data: phoneReservations } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('customer_phone', selectedPhone)
    const resIds = (phoneReservations || []).map((r: any) => r.id)
    if (resIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from('messages')
        .select('id, direction, body, created_at')
        .in('reservation_id', resIds)
        .order('created_at', { ascending: true })
      selectedMessages = msgs || []
    }
  }

  const waConfigured = !!(process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_PHONE_NUMBER_ID)

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        {/* Sidebar: Conversation List */}
        <div style={{ width: '320px', borderRight: '1px solid #e8e2d6', display: 'flex', flexDirection: 'column', background: '#faf9f6', flexShrink: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e8e2d6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>WhatsApp</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {waConfigured ? (
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} title="Conectado" />
                ) : (
                  <a href="/settings/whatsapp" style={{ fontSize: '12px', color: '#c0392b', textDecoration: 'none' }}>⚠️ Configurar</a>
                )}
                <a href="/settings/whatsapp" style={{ padding: '4px', textDecoration: 'none' }} title="Configurar">⚙️</a>
              </div>
            </div>
            <form method="GET" action="/dashboard/whatsapp">
              {selectedPhone && <input type="hidden" name="phone" value={selectedPhone} />}
              <input name="q" type="text" placeholder="🔍 Buscar conversación..." defaultValue={params.q || ''}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', boxSizing: 'border-box' }} />
            </form>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {convList.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>💬</p>
                <p style={{ color: '#8a8578', fontSize: '14px' }}>No hay conversaciones</p>
                <p style={{ color: '#b0a898', fontSize: '12px', marginTop: '4px' }}>Los mensajes aparecerán aquí</p>
              </div>
            ) : (
              convList.map(c => (
                <a
                  key={c.phone}
                  href={`/dashboard/whatsapp?phone=${encodeURIComponent(c.phone)}`}
                  style={{
                    display: 'flex', gap: '12px', padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #f0ebe3',
                    background: selectedPhone === c.phone ? '#f0ebe3' : 'transparent',
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '14px', flexShrink: 0 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize: '10px', color: '#b0a898', flexShrink: 0, marginLeft: '8px' }}>{formatDate(c.lastAt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <p style={{ fontSize: '12px', color: '#8a8578', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                        {c.lastDirection === 'outbound' ? '✓ ' : ''}{c.lastMessage.substring(0, 50)}
                      </p>
                      {c.activeStep && (
                        <span style={{ marginLeft: '4px', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 700, background: '#d1fae5', color: '#059669', flexShrink: 0 }}>
                          BOT
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {!selectedPhone ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#5c5549', marginBottom: '8px' }}>WhatsApp Business</h3>
              <p style={{ color: '#b0a898', fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
                Selecciona una conversación de la lista para ver los mensajes.
              </p>
              {!waConfigured && (
                <a href="/settings/whatsapp" style={{ marginTop: '24px', display: 'inline-block', padding: '12px 20px', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 500, textDecoration: 'none', background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                  ⚙️ Configurar WhatsApp
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #e8e2d6', background: '#faf9f6' }}>
                <a href="/dashboard/whatsapp" style={{ fontSize: '18px', textDecoration: 'none', color: '#5c5549' }}>←</a>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                  {selectedName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a', margin: 0 }}>{selectedName}</p>
                  <p style={{ fontSize: '12px', color: '#b0a898', margin: 0 }}>{formatPhoneDisplay(selectedPhone)}</p>
                </div>
                <a href={`/dashboard/whatsapp?phone=${encodeURIComponent(selectedPhone)}`} style={{ fontSize: '12px', color: '#B08D57', textDecoration: 'none' }}>🔄</a>
              </div>

              {params.ok && (
                <div style={{ padding: '8px 16px', background: 'rgba(39,174,96,0.05)', fontSize: '13px', color: '#27ae60', borderBottom: '1px solid #e8e2d6' }}>
                  ✅ Mensaje enviado
                </div>
              )}
              {params.error && (
                <div style={{ padding: '8px 16px', background: '#fef2f2', fontSize: '13px', color: '#c0392b', borderBottom: '1px solid #e8e2d6' }}>
                  ⚠️ {params.error}
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f5f0e8' }}>
                {selectedMessages.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#b0a898', fontSize: '14px' }}>
                    No hay mensajes con este contacto
                  </div>
                ) : (
                  selectedMessages.map((msg: any, i: number) => {
                    const showDate = i === 0 || formatDate(selectedMessages[i - 1].created_at) !== formatDate(msg.created_at)
                    const isOut = msg.direction === 'outbound'
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                            <span style={{ fontSize: '11px', color: '#8a8578', background: '#e8e2d6', padding: '4px 12px', borderRadius: '8px' }}>
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
                          <div style={{
                            maxWidth: '70%', padding: '8px 12px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.5,
                            background: isOut ? '#dcf8c6' : '#fff',
                            border: isOut ? 'none' : '1px solid #e8e2d6',
                            color: '#1a1a1a',
                          }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</p>
                            <span style={{ fontSize: '10px', color: '#8a8578', display: 'block', textAlign: 'right', marginTop: '2px' }}>
                              {formatTime(msg.created_at)}{isOut ? ' ✓' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Send Form */}
              <form method="POST" action="/api/conversations/send" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e8e2d6', background: '#faf9f6' }}>
                <input type="hidden" name="phone" value={selectedPhone} />
                <input name="message" type="text" placeholder="Escribe un mensaje..." required
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '20px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fff', boxSizing: 'border-box' }} />
                <button type="submit" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ➤
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
