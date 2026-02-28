// ─── Servicio centralizado de Email — Canal Olímpico ────────────────────────
//
// Envía emails vía Gmail SMTP (Nodemailer) al cliente.
// Sustituye las notificaciones de WhatsApp al cliente.
// Telegram sigue para alertas internas al equipo.

import nodemailer from 'nodemailer'

// ─── Config ──────────────────────────────────────────────────────────────────

const GMAIL_USER = process.env.GMAIL_USER || 'reservascanalolimpico@gmail.com'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''

function getTransporter() {
  if (!GMAIL_APP_PASSWORD) {
    console.warn('[email] GMAIL_APP_PASSWORD no configurada, los emails no se enviarán')
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  })
}

// ─── Helper: Enviar email ───────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) {
    return { ok: false, error: 'Email no configurado' }
  }

  try {
    await transporter.sendMail({
      from: `"Canal Olímpico" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[email] Email enviado a ${to}: ${subject}`)
    return { ok: true }
  } catch (err) {
    console.error('[email] Error enviando email:', err)
    return { ok: false, error: 'Error al enviar email' }
  }
}

// ─── Helper: Formatear fecha ────────────────────────────────────────────────

function formatDateEs(fecha: string): string {
  const [y, m, d] = fecha.split('-')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
}

// ─── Plantilla base HTML ────────────────────────────────────────────────────

function emailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🏊 Canal Olímpico</h1>
              <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">Restaurante · Castelldefels</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:30px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:13px;margin:0;">
                📍 Av. del Canal Olímpico 2, Castelldefels<br>
                📞 938 587 088 · 629 358 562<br>
                📧 canalolimpic@daliagrup.com
              </p>
              <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">
                © ${new Date().getFullYear()} Canal Olímpico · Dalia Grup
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
  const content = `
    <h2 style="color:#16a34a;margin:0 0 20px;">✅ ¡Reserva Confirmada!</h2>
    <p style="color:#334155;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu reserva ha sido confirmada.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;padding:20px;margin:0 0 20px;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#334155;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#334155;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#334155;">👥 <strong>Personas:</strong> ${data.personas}</p>
        ${data.zone ? `<p style="margin:4px 0;color:#334155;">📍 <strong>Zona:</strong> ${data.zone}</p>` : ''}
        <p style="margin:4px 0;color:#334155;">📋 <strong>Referencia:</strong> ${data.reservationId.substring(0, 8)}</p>
      </td></tr>
    </table>
    <p style="color:#334155;font-size:15px;">¡Te esperamos! 🎉</p>
  `

  await sendEmail(to, '✅ Reserva Confirmada — Canal Olímpico', emailTemplate('Reserva Confirmada', content))
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
  const content = `
    <h2 style="color:#2563eb;margin:0 0 20px;">📋 Reserva de Grupo — Pendiente de Pago</h2>
    <p style="color:#334155;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu reserva está creada. Para confirmarla, abona la señal del 40%.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:8px;padding:20px;margin:0 0 20px;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#334155;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#334155;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#334155;">👥 <strong>Personas:</strong> ${data.personas}</p>
        <p style="margin:4px 0;color:#334155;">🍽️ <strong>Menú:</strong> ${data.menuName}</p>
        <p style="margin:8px 0 4px;color:#334155;font-size:17px;">💰 <strong>Total: ${data.total}€</strong> (IVA incluido)</p>
        <p style="margin:4px 0;color:#dc2626;font-size:17px;">💳 <strong>Señal 40%: ${data.deposit}€</strong></p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:25px 0;">
      <a href="${data.paymentUrl}" style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
        💳 Pagar señal de ${data.deposit}€
      </a>
    </div>
    <p style="color:#dc2626;font-size:14px;text-align:center;">
      ⏳ Tienes <strong>${data.deadlineDays} días</strong> para completar el pago.<br>
      Si no se realiza, la reserva se cancelará automáticamente.
    </p>
    <p style="color:#64748b;font-size:13px;margin:15px 0 0;">📋 Ref: ${data.reservationId.substring(0, 8)}</p>
  `

  await sendEmail(to, '💳 Reserva Pendiente de Pago — Canal Olímpico', emailTemplate('Reserva Pendiente', content))
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
  const content = `
    <h2 style="color:#16a34a;margin:0 0 20px;">✅ ¡Pago Recibido — Reserva Confirmada!</h2>
    <p style="color:#334155;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, hemos recibido tu señal. ¡Tu reserva está confirmada!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;padding:20px;margin:0 0 20px;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#334155;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#334155;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#334155;">👥 <strong>Personas:</strong> ${data.personas}</p>
        <p style="margin:4px 0;color:#16a34a;">💳 <strong>Señal pagada:</strong> ${data.deposit}€</p>
        <p style="margin:4px 0;color:#334155;">📋 <strong>Ref:</strong> ${data.reservationId.substring(0, 8)}</p>
      </td></tr>
    </table>
    <div style="background-color:#fefce8;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="color:#854d0e;font-size:14px;margin:0;"><strong>📌 Recuerda:</strong></p>
      <ul style="color:#854d0e;font-size:14px;margin:8px 0 0;padding-left:20px;">
        <li>Confirmar platos y asistentes 5 días antes</li>
        <li>Comunicar alergias 72h antes</li>
        <li>Cambios de asistentes 72h antes</li>
      </ul>
    </div>
    <p style="color:#334155;font-size:15px;">¡Te esperamos! 🎉</p>
  `

  await sendEmail(to, '✅ Pago Recibido — Reserva Confirmada — Canal Olímpico', emailTemplate('Pago Confirmado', content))
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
  const content = `
    <h2 style="color:#dc2626;margin:0 0 20px;">❌ Reserva Cancelada</h2>
    <p style="color:#334155;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, lamentamos informarte de que tu reserva para el 
      <strong>${formatDateEs(data.fecha)}</strong> ha sido cancelada porque no hemos recibido 
      el pago de la señal dentro del plazo.
    </p>
    <p style="color:#334155;font-size:15px;">
      Si deseas hacer una nueva reserva, no dudes en contactarnos:
    </p>
    <p style="color:#334155;font-size:15px;">
      📞 938 587 088 / 629 358 562<br>
      📧 canalolimpic@daliagrup.com
    </p>
  `

  await sendEmail(to, '❌ Reserva Cancelada — Canal Olímpico', emailTemplate('Reserva Cancelada', content))
}

// ─── Enviar recordatorio ────────────────────────────────────────────────────

export async function sendReminder(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    personas: number
    eventType: string
  }
): Promise<void> {
  const isEvent = data.eventType !== 'RESERVA_NORMAL'

  const eventContent = `
    <h2 style="color:#f59e0b;margin:0 0 20px;">📌 Recordatorio — Tu evento se acerca</h2>
    <p style="color:#334155;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu evento del <strong>${formatDateEs(data.fecha)}</strong> está a solo 5 días.
    </p>
    <div style="background-color:#fefce8;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="color:#854d0e;font-size:14px;margin:0;"><strong>Por favor confirma:</strong></p>
      <ul style="color:#854d0e;font-size:14px;margin:8px 0 0;padding-left:20px;">
        <li>Número definitivo de asistentes</li>
        <li>Platos escogidos del menú</li>
        <li>Alergias o menús especiales</li>
      </ul>
    </div>
    <p style="color:#334155;">📞 938 587 088 / 629 358 562</p>
  `

  const normalContent = `
    <h2 style="color:#f59e0b;margin:0 0 20px;">📌 Recordatorio de tu reserva</h2>
    <p style="color:#334155;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, te recordamos que tienes una reserva:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-radius:8px;padding:20px;margin:0 0 20px;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#334155;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#334155;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#334155;">👥 <strong>Personas:</strong> ${data.personas}</p>
      </td></tr>
    </table>
    <p style="color:#334155;font-size:15px;">¡Te esperamos! 📍 Canal Olímpico, Castelldefels</p>
  `

  const content = isEvent ? eventContent : normalContent
  await sendEmail(to, '📌 Recordatorio — Canal Olímpico', emailTemplate('Recordatorio', content))
}
