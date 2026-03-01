// ─── Servicio centralizado de WhatsApp — Canal Olímpico ─────────────────────
//
// Envía mensajes vía Meta WhatsApp Business API (Cloud API v18.0)
// Soporta: texto, botones interactivos, listas
// Guarda historial en tabla "messages" de Supabase

import { supabaseAdmin } from '@/lib/supabase'

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  if (!phoneNumberId || !token) {
    return null
  }

  return { phoneNumberId, token }
}

// ─── Enviar mensaje de texto ────────────────────────────────────────────────

export async function sendText(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig()
  if (!config) {
    console.warn('[whatsapp] Credentials not configured, skipping send')
    return { ok: false, error: 'WhatsApp no configurado' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone(to),
          type: 'text',
          text: { body: text },
        }),
      }
    )

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[whatsapp] API error:', errBody)
      return { ok: false, error: 'Error al enviar WhatsApp' }
    }

    return { ok: true }
  } catch (err) {
    console.error('[whatsapp] Send error:', err)
    return { ok: false, error: 'Error de conexión con WhatsApp' }
  }
}

// ─── Enviar mensaje con botones (interactive reply buttons) ─────────────────
// Máximo 3 botones, cada uno con id y título (max 20 chars)

export interface Button {
  id: string
  title: string  // max 20 chars
}

export async function sendButtons(
  to: string,
  bodyText: string,
  buttons: Button[],
  headerText?: string,
  footerText?: string,
): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig()
  if (!config) {
    console.warn('[whatsapp] Credentials not configured, skipping send')
    return { ok: false, error: 'WhatsApp no configurado' }
  }

  const interactive: any = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map(b => ({
        type: 'reply',
        reply: { id: b.id, title: b.title.substring(0, 20) },
      })),
    },
  }

  if (headerText) interactive.header = { type: 'text', text: headerText }
  if (footerText) interactive.footer = { text: footerText }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone(to),
          type: 'interactive',
          interactive,
        }),
      }
    )

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[whatsapp] Buttons API error:', errBody)
      return { ok: false, error: 'Error al enviar botones WhatsApp' }
    }

    return { ok: true }
  } catch (err) {
    console.error('[whatsapp] Buttons send error:', err)
    return { ok: false, error: 'Error de conexión con WhatsApp' }
  }
}

// ─── Enviar confirmación de reserva normal ──────────────────────────────────

export async function sendReservationConfirmation(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    personas: number
    tableId?: string | null
    zone?: string | null
    reservationId: string
  }
): Promise<void> {
  const message = [
    `✅ *¡Reserva Confirmada!*`,
    ``,
    `👤 ${data.nombre}`,
    `📅 ${formatDateEs(data.fecha)}`,
    `🕐 ${data.hora}h`,
    `👥 ${data.personas} personas`,
    data.tableId ? `🪑 Mesa ${data.tableId}${data.zone ? `, zona ${data.zone}` : ''}` : '',
    `📋 Ref: ${data.reservationId.substring(0, 8)}`,
    ``,
    `📍 Canal Olímpico, Castelldefels`,
    `📞 930.347.246`,
    ``,
    `¡Te esperamos! 🎉`,
  ].filter(Boolean).join('\n')

  await sendText(to, message)
  await saveMessage(to, message, 'outbound', data.reservationId)
}

// ─── Enviar link de pago para grupos ────────────────────────────────────────

export async function sendPaymentLink(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    personas: number
    menuName: string
    total: number
    deposit: number
    paymentUrl: string
    deadlineDays: number
    reservationId: string
  }
): Promise<void> {
  const message = [
    `📋 *Reserva de Grupo — Canal Olímpico*`,
    ``,
    `👤 ${data.nombre}`,
    `📅 ${formatDateEs(data.fecha)} a las ${data.hora}h`,
    `👥 ${data.personas} personas`,
    `🍽️ ${data.menuName}`,
    ``,
    `💰 *Total: ${data.total}€* (IVA incluido)`,
    `💳 *Señal 40%: ${data.deposit}€*`,
    ``,
    `🔗 *Paga aquí:*`,
    data.paymentUrl,
    ``,
    `⏳ Tienes *${data.deadlineDays} días* para completar el pago.`,
    `Si no se realiza el pago, la reserva se cancelará automáticamente.`,
    ``,
    `📌 Ref: ${data.reservationId.substring(0, 8)}`,
    `📞 Dudas: 930.347.246`,
  ].join('\n')

  await sendText(to, message)
  await saveMessage(to, message, 'outbound', data.reservationId)
}

// ─── Enviar confirmación de pago recibido ───────────────────────────────────

export async function sendPaymentConfirmation(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    personas: number
    deposit: number
    reservationId: string
  }
): Promise<void> {
  const message = [
    `✅ *¡Pago Recibido — Reserva Confirmada!*`,
    ``,
    `👤 ${data.nombre}`,
    `📅 ${formatDateEs(data.fecha)} a las ${data.hora}h`,
    `👥 ${data.personas} personas`,
    `💳 Señal pagada: ${data.deposit}€`,
    `📋 Ref: ${data.reservationId.substring(0, 8)}`,
    ``,
    `📌 Recuerda:`,
    `• Confirmar platos y asistentes 5 días antes`,
    `• Comunicar alergias 72h antes`,
    `• Cambios de asistentes 72h antes`,
    ``,
    `📍 Canal Olímpico, Castelldefels`,
    `📞 930.347.246`,
    ``,
    `¡Te esperamos! 🎉`,
  ].join('\n')

  await sendText(to, message)
  await saveMessage(to, message, 'outbound', data.reservationId)
}

// ─── Enviar aviso de cancelación automática (no pagó) ───────────────────────

export async function sendAutoCancel(
  to: string,
  data: {
    nombre: string
    fecha: string
    reservationId: string
  }
): Promise<void> {
  const message = [
    `❌ *Reserva Cancelada*`,
    ``,
    `Hola ${data.nombre}, tu reserva para el ${formatDateEs(data.fecha)} ha sido cancelada porque no recibimos el pago de la señal dentro del plazo.`,
    ``,
    `Si deseas hacer una nueva reserva, contacta con nosotros:`,
    `📞 930.347.246`,
    `📧 iguanacanalolimpic@outlook.com`,
  ].join('\n')

  await sendText(to, message)
  await saveMessage(to, message, 'outbound', data.reservationId)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cleanPhone(phone: string): string {
  // Quitar espacios, guiones, paréntesis. Dejar el + si existe
  return phone.replace(/[\s\-()]/g, '')
}

function formatDateEs(fecha: string): string {
  const [y, m, d] = fecha.split('-')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
}

async function saveMessage(
  phone: string,
  content: string,
  direction: 'inbound' | 'outbound',
  reservationId?: string,
): Promise<void> {
  try {
    // Si no tenemos reservation_id, buscar por teléfono
    let resId = reservationId
    if (!resId) {
      const { data } = await supabaseAdmin
        .from('reservations')
        .select('id')
        .eq('customer_phone', cleanPhone(phone))
        .in('status', ['HOLD_BLOCKED', 'CONFIRMED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      resId = data?.id
    }

    if (resId) {
      await supabaseAdmin.from('messages').insert({
        reservation_id: resId,
        direction,
        body: content,
      })
    }
  } catch (err) {
    console.error('[whatsapp] Error saving message:', err)
  }
}
