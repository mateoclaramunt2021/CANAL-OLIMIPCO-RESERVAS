/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Telegram Notifications
   Envía alertas al grupo de gestión vía Telegram Bot API.
   ═══════════════════════════════════════════════════════════════════════════ */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8390530080:AAFx7-AqDF4-h1_4CoYEE_cD1xo-UD2Cb10'
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7837396185'
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// ─── Core send function ──────────────────────────────────────────────────────

async function sendMessage(text: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Telegram] Error sending message:', res.status, err)
      return false
    }

    return true
  } catch (err) {
    console.error('[Telegram] Network error:', err)
    return false
  }
}

// ─── Notification Types ──────────────────────────────────────────────────────

/** Nueva reserva creada (web o VAPI) */
export async function notifyNewReservation(data: {
  reservationId: string
  nombre: string
  telefono: string
  fecha: string
  hora: string
  personas: number
  eventType: string
  menuName?: string
  total?: number | null
  deposit?: number | null
  source?: 'web' | 'vapi' | 'whatsapp'
}): Promise<boolean> {
  const source = data.source === 'vapi' ? '📞 VAPI' : data.source === 'whatsapp' ? '💬 WhatsApp' : '🌐 Web'
  const lines = [
    `🆕 *NUEVA RESERVA* (${source})`,
    ``,
    `👤 ${data.nombre}`,
    `📱 ${data.telefono}`,
    `📅 ${data.fecha} a las ${data.hora}h`,
    `👥 ${data.personas} personas`,
    `🎯 ${data.eventType}`,
  ]

  if (data.menuName) lines.push(`🍽️ ${data.menuName}`)
  if (data.total) lines.push(`💰 Total: ${data.total}€`)
  if (data.deposit) lines.push(`💳 Señal: ${data.deposit}€`)
  lines.push(``, `🔖 Ref: \`${data.reservationId}\``)

  return sendMessage(lines.join('\n'))
}

/** Pago confirmado vía Stripe */
export async function notifyPaymentReceived(data: {
  reservationId: string
  nombre: string
  fecha: string
  amount: number
}): Promise<boolean> {
  return sendMessage([
    `✅ *PAGO RECIBIDO*`,
    ``,
    `👤 ${data.nombre}`,
    `📅 ${data.fecha}`,
    `💳 ${data.amount}€ (señal 40%)`,
    `🔖 Ref: \`${data.reservationId}\``,
    ``,
    `La reserva está *CONFIRMADA*.`,
  ].join('\n'))
}

/** Llamada VAPI finalizada */
export async function notifyVapiCallEnded(data: {
  callId?: string
  phone?: string
  duration?: number
  summary?: string
  endedReason?: string
}): Promise<boolean> {
  const mins = data.duration ? Math.floor(data.duration / 60) : 0
  const secs = data.duration ? data.duration % 60 : 0

  const lines = [
    `📞 *LLAMADA VAPI FINALIZADA*`,
    ``,
  ]

  if (data.phone) lines.push(`📱 ${data.phone}`)
  if (data.duration) lines.push(`⏱️ ${mins}m ${secs}s`)
  if (data.endedReason) lines.push(`📌 Motivo: ${data.endedReason}`)
  if (data.summary) lines.push(``, `📝 *Resumen:*`, data.summary)
  if (data.callId) lines.push(``, `🔖 Call: \`${data.callId}\``)

  return sendMessage(lines.join('\n'))
}

/** Reserva auto-cancelada por falta de pago */
export async function notifyAutoCancel(data: {
  reservationId: string
  nombre: string
  fecha: string
}): Promise<boolean> {
  return sendMessage([
    `⚠️ *RESERVA AUTO-CANCELADA*`,
    ``,
    `👤 ${data.nombre}`,
    `📅 ${data.fecha}`,
    `❌ No pagó la señal en plazo (5 días)`,
    `🔖 Ref: \`${data.reservationId}\``,
  ].join('\n'))
}

/** Recordatorio enviado a cliente */
export async function notifyReminderSent(data: {
  reservationId: string
  nombre: string
  fecha: string
  eventType: string
}): Promise<boolean> {
  return sendMessage([
    `🔔 *RECORDATORIO ENVIADO*`,
    ``,
    `👤 ${data.nombre}`,
    `📅 ${data.fecha}`,
    `🎯 ${data.eventType}`,
    `🔖 Ref: \`${data.reservationId}\``,
  ].join('\n'))
}

/** Notificación genérica */
export async function notifyAdmin(text: string): Promise<boolean> {
  return sendMessage(`ℹ️ *Canal Olímpico*\n\n${text}`)
}
