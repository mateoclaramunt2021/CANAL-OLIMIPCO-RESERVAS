// ─── Servicio centralizado de SMS — Canal Olímpico ──────────────────────────
//
// Envía SMS vía Twilio Messaging Service con Alpha Sender "CanalOlimp".
// Canal principal de confirmación al cliente (sustituye al email).
// El restaurante sigue recibiendo por email + Telegram.

import twilio from 'twilio'

// ─── Config ──────────────────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || ''

// Hardcoded to avoid Netlify deploy-preview URLs in SMS links
const SITE_URL = 'https://canalolimpicorestaurante.com'

let _client: twilio.Twilio | null = null

function getClient(): twilio.Twilio | null {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('[sms] ❌ TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configurados')
    return null
  }
  if (!_client) {
    _client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  }
  return _client
}

// ─── Normalizar teléfono ─────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('34') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    cleaned = '+34' + cleaned
  }
  return cleaned
}

// ─── Envío genérico ──────────────────────────────────────────────────────────

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const client = getClient()
  if (!client) {
    console.warn('[sms] ⚠️ Cliente Twilio no disponible, SMS no enviado')
    return false
  }

  if (!TWILIO_MESSAGING_SERVICE_SID) {
    console.error('[sms] ❌ TWILIO_MESSAGING_SERVICE_SID no configurado')
    return false
  }

  const toNormalized = normalizePhone(to)

  try {
    const message = await client.messages.create({
      body,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      to: toNormalized,
    })
    console.log(`[sms] ✅ SMS enviado a ${toNormalized} → SID: ${message.sid}`)
    return true
  } catch (err: any) {
    console.error(`[sms] ❌ Error enviando SMS a ${toNormalized}:`, err?.message || err)
    return false
  }
}

// ─── SMS: Confirmación reserva normal ────────────────────────────────────────

export async function sendReservationConfirmationSMS(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    personas: number
    reservationNumber?: string | null
  }
): Promise<boolean> {
  const { nombre, fecha, hora, personas, reservationNumber } = data

  // Formatear fecha a español
  const [y, m, d] = fecha.split('-')
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const ref = reservationNumber || ''

  const body = [
    `Canal Olimpico - Reserva Confirmada`,
    ``,
    `Hola ${nombre}!`,
    `Tu reserva esta confirmada:`,
    `Fecha: ${fechaFormateada}`,
    `Hora: ${hora}h`,
    `Personas: ${personas}`,
    ref ? `Tu codigo de reserva: ${ref}` : '',
    ``,
    `Para cancelar, llama al 930 347 246 y di tu codigo (min 72h antes).`,
    ``,
    `Te esperamos!`,
  ].filter(Boolean).join('\n')

  return sendSMS(to, body)
}

// ─── SMS: Enlace para reserva de grupo ───────────────────────────────────────

export async function sendGroupReservationLinkSMS(
  to: string,
  data: {
    nombre: string
    phone: string
  }
): Promise<boolean> {
  const { nombre, phone } = data

  const params = new URLSearchParams({
    nombre,
    telefono: phone,
    mode: 'evento',
  })

  const url = `${SITE_URL}/reservar?${params.toString()}`

  const body = [
    `Canal Olimpico - Reserva de Grupo`,
    ``,
    `Hola ${nombre}!`,
    `Para completar tu reserva de grupo o evento, entra aqui:`,
    ``,
    url,
    ``,
    `Podras elegir menu, fecha, personas y pagar la senal comodamente.`,
    ``,
    `Dudas? Llama al 930 347 246`,
  ].join('\n')

  return sendSMS(to, body)
}

// ─── SMS: Link de pago (grupos con Stripe) ───────────────────────────────────

export async function sendPaymentLinkSMS(
  to: string,
  data: {
    nombre: string
    deposit: number
    paymentUrl: string
    reservationNumber?: string | null
  }
): Promise<boolean> {
  const { nombre, deposit, paymentUrl, reservationNumber } = data

  const ref = reservationNumber ? ` (Ref: ${reservationNumber})` : ''

  const body = [
    `Canal Olimpico - Pago Senal${ref}`,
    ``,
    `Hola ${nombre}!`,
    `Para confirmar tu reserva, paga la senal de ${deposit}EUR:`,
    ``,
    paymentUrl,
    ``,
    `Tienes 5 dias para completar el pago.`,
    `930 347 246`,
  ].join('\n')

  return sendSMS(to, body)
}

// ─── SMS: Confirmación de pago recibido ──────────────────────────────────────

export async function sendPaymentConfirmationSMS(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    personas: number
    deposit: number
    reservationNumber?: string | null
    dishSelectionUrl?: string | null
  }
): Promise<boolean> {
  const { nombre, fecha, hora, personas, deposit, reservationNumber, dishSelectionUrl } = data

  const [y, m, d] = fecha.split('-')
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const ref = reservationNumber ? ` Ref: ${reservationNumber}` : ''

  const lines = [
    `Canal Olimpico - Pago Confirmado!`,
    ``,
    `Hola ${nombre}!`,
    `Pago de ${deposit}EUR recibido.${ref}`,
    ``,
    `Tu evento:`,
    `Fecha: ${fechaFormateada}`,
    `Hora: ${hora}h`,
    `Personas: ${personas}`,
  ]

  if (dishSelectionUrl) {
    lines.push(
      ``,
      `Siguiente paso - elige los platos:`,
      dishSelectionUrl,
    )
  }

  lines.push(
    ``,
    `Recuerda: confirma asistentes 72h antes.`,
    `930 347 246`,
  )

  return sendSMS(to, lines.join('\n'))
}

// ─── SMS: Transferencia bancaria (datos de pago) ─────────────────────────────

export async function sendBankTransferSMS(
  to: string,
  data: {
    nombre: string
    deposit: number
    reservationNumber?: string | null
  }
): Promise<boolean> {
  const { nombre, deposit, reservationNumber } = data

  const ref = reservationNumber || 'tu reserva'

  const body = [
    `Canal Olimpico - Datos Transferencia`,
    ``,
    `Hola ${nombre}!`,
    `Senal: ${deposit}EUR`,
    `IBAN: ES66 2100 3141 9522 0056 2723`,
    `Concepto: ${ref}`,
    `Titular: CANAL OLIMPICO SL`,
    ``,
    `Envia justificante a reservascanalolimpico@gmail.com`,
    `Plazo: 5 dias.`,
    `930 347 246`,
  ].join('\n')

  return sendSMS(to, body)
}
