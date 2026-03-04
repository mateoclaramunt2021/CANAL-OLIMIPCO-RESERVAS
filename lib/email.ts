// ─── Servicio centralizado de Email — Canal Olímpico ────────────────────────
//
// Envía emails vía Gmail SMTP (Nodemailer) al cliente.
// Colores de marca: Dorado #B08D57, Terracota #C4724E, Crema #FFFAF4, Ink #1A0F05

import nodemailer from 'nodemailer'

// ─── Config ──────────────────────────────────────────────────────────────────

const GMAIL_USER = process.env.GMAIL_USER || 'reservascanalolimpico@gmail.com'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''
const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL || 'reservascanalolimpico@gmail.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://canalolimpicorestaurante.com'

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

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) {
    return { ok: false, error: 'Email no configurado' }
  }

  try {
    await transporter.sendMail({
      from: `"Canal Olímpico" <${GMAIL_USER}>`,
      to,
      bcc: RESTAURANT_EMAIL !== to ? RESTAURANT_EMAIL : undefined,
      subject,
      html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: 'application/pdf',
      })),
    })
    console.log(`[email] Email enviado a ${to} (bcc: ${RESTAURANT_EMAIL}): ${subject}`)
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

// ─── Helper: Botón de cancelar (discreto, al final) ────────────────────────

function cancelBlock(reservationNumber: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0;">
      <tr><td style="border-top:1px solid #e8e2d6;padding-top:20px;text-align:center;">
        <p style="color:#b0a898;font-size:12px;margin:0 0 10px;">¿Necesitas cancelar tu reserva?</p>
        <a href="${SITE_URL}/cancelar?ref=${encodeURIComponent(reservationNumber)}" style="color:#C4724E;font-size:12px;text-decoration:underline;">
          Cancelar reserva
        </a>
      </td></tr>
    </table>
  `
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
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(26,15,5,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#B08D57,#C4724E);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:0.5px;">🏊 Canal Olímpico</h1>
              <p style="color:#ffe8d6;margin:8px 0 0;font-size:14px;">Restaurante · Castelldefels</p>
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
            <td style="background-color:#faf9f6;padding:24px 40px;text-align:center;border-top:1px solid #e8e2d6;">
              <p style="color:#8a8578;font-size:13px;margin:0;">
                📍 Av. del Canal Olímpico 2, Castelldefels<br>
                📞 930 347 246<br>
                📧 canalolimpic@daliagrup.com
              </p>
              <p style="color:#b0a898;font-size:11px;margin:10px 0 0;">
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
    reservationNumber?: string | null
  }
): Promise<void> {
  const refDisplay = data.reservationNumber || data.reservationId.substring(0, 8)
  const content = `
    <h2 style="color:#6b9080;margin:0 0 20px;">✅ ¡Reserva Confirmada!</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu reserva ha sido confirmada.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;border-radius:8px;padding:20px;margin:0 0 20px;border:1px solid #e8e2d6;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#1A0F05;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#1A0F05;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#1A0F05;">👥 <strong>Personas:</strong> ${data.personas}</p>
        ${data.zone ? `<p style="margin:4px 0;color:#1A0F05;">📍 <strong>Zona:</strong> ${data.zone}</p>` : ''}
        <p style="margin:8px 0 4px;color:#B08D57;font-size:16px;">📋 <strong>Nº Reserva: ${refDisplay}</strong></p>
      </td></tr>
    </table>
    <p style="color:#1A0F05;font-size:15px;">¡Te esperamos! 🎉</p>
    <p style="color:#8a8578;font-size:13px;margin:15px 0 0;">📍 Av. del Canal Olímpico 2, Castelldefels</p>
    ${data.reservationNumber ? cancelBlock(data.reservationNumber) : ''}
  `

  await sendEmail(to, `✅ Reserva ${refDisplay} Confirmada — Canal Olímpico`, emailTemplate('Reserva Confirmada', content))
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
    reservationNumber?: string | null
  }
): Promise<void> {
  const refDisplay = data.reservationNumber || data.reservationId.substring(0, 8)
  const content = `
    <h2 style="color:#B08D57;margin:0 0 20px;">📋 Reserva de Grupo — Pendiente de Pago</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu reserva está creada. Para confirmarla, abona la señal del 40%.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;border-radius:8px;padding:20px;margin:0 0 20px;border:1px solid #e8e2d6;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#1A0F05;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#1A0F05;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#1A0F05;">👥 <strong>Personas:</strong> ${data.personas}</p>
        <p style="margin:4px 0;color:#1A0F05;">🍽️ <strong>Menú:</strong> ${data.menuName}</p>
        <p style="margin:8px 0 4px;color:#1A0F05;font-size:17px;">💰 <strong>Total: ${data.total}€</strong> (IVA incluido)</p>
        <p style="margin:4px 0;color:#C4724E;font-size:17px;">💳 <strong>Señal 40%: ${data.deposit}€</strong></p>
        <p style="margin:8px 0 4px;color:#B08D57;font-size:16px;">📋 <strong>Nº Reserva: ${refDisplay}</strong></p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:25px 0;">
      <a href="${data.paymentUrl}" style="background:linear-gradient(135deg,#B08D57,#C4724E);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
        💳 Pagar señal de ${data.deposit}€
      </a>
    </div>
    <p style="color:#C4724E;font-size:14px;text-align:center;">
      ⏳ Tienes <strong>${data.deadlineDays} días</strong> para completar el pago.<br>
      Si no se realiza, la reserva se cancelará automáticamente.
    </p>
    ${data.reservationNumber ? cancelBlock(data.reservationNumber) : ''}
  `

  await sendEmail(to, `💳 Reserva ${refDisplay} Pendiente de Pago — Canal Olímpico`, emailTemplate('Reserva Pendiente', content))
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
    reservationNumber?: string | null
    menuCode?: string | null
    dishSelectionToken?: string | null
  }
): Promise<void> {
  const refDisplay = data.reservationNumber || data.reservationId.substring(0, 8)

  // Check if this menu requires dish selection
  const needsDishSelection = data.menuCode && data.dishSelectionToken &&
    ['menu_grupo_34', 'menu_grupo_29', 'menu_infantil'].includes(data.menuCode)

  const dishSelectionBlock = needsDishSelection ? `
    <div style="background:linear-gradient(135deg,#fef9f0,#fff7ed);border-radius:10px;padding:20px;margin:20px 0;border:2px solid #B08D57;">
      <h3 style="color:#B08D57;margin:0 0 12px;font-size:18px;">🍽️ ¡Elige los platos para tu evento!</h3>
      <p style="color:#1A0F05;font-size:14px;margin:0 0 15px;">
        Cada comensal debe elegir sus platos del menú. Puedes ir rellenándolo poco a poco 
        y guardar borrador. <strong>Tenéis hasta 5 días antes del evento</strong> para completarlo.
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/elegir-platos/${data.dishSelectionToken}" 
           style="background:linear-gradient(135deg,#B08D57,#C4724E);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
          🍽️ Elegir platos (${data.personas} comensales)
        </a>
      </div>
      <p style="color:#8a8578;font-size:12px;text-align:center;margin:12px 0 0;">
        También puedes acceder más tarde desde este mismo enlace.
      </p>
    </div>
  ` : ''

  const content = `
    <h2 style="color:#6b9080;margin:0 0 20px;">✅ ¡Pago Recibido — Reserva Confirmada!</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, hemos recibido tu señal. ¡Tu reserva está confirmada!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;border-radius:8px;padding:20px;margin:0 0 20px;border:1px solid #e8e2d6;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#1A0F05;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#1A0F05;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#1A0F05;">👥 <strong>Personas:</strong> ${data.personas}</p>
        <p style="margin:4px 0;color:#6b9080;">💳 <strong>Señal pagada:</strong> ${data.deposit}€</p>
        <p style="margin:8px 0 4px;color:#B08D57;font-size:16px;">📋 <strong>Nº Reserva: ${refDisplay}</strong></p>
      </td></tr>
    </table>
    ${dishSelectionBlock}
    <div style="background-color:#fef9f0;border-radius:8px;padding:16px;margin:0 0 20px;border:1px solid #e8d5b2;">
      <p style="color:#92681e;font-size:14px;margin:0;"><strong>📌 Recuerda:</strong></p>
      <ul style="color:#92681e;font-size:14px;margin:8px 0 0;padding-left:20px;">
        ${needsDishSelection ? '<li><strong>Seleccionar los platos de cada comensal</strong></li>' : '<li>Confirmar platos y asistentes 5 días antes</li>'}
        <li>Comunicar alergias 72h antes</li>
        <li>Cambios de asistentes 72h antes</li>
      </ul>
    </div>
    <p style="color:#1A0F05;font-size:15px;">¡Te esperamos! 🎉</p>
    ${data.reservationNumber ? cancelBlock(data.reservationNumber) : ''}
  `

  await sendEmail(to, `✅ Pago Recibido — Reserva ${refDisplay} — Canal Olímpico`, emailTemplate('Pago Confirmado', content))
}

// ─── Enviar aviso de cancelación automática (no pagó) ───────────────────────

export async function sendAutoCancel(
  to: string,
  data: {
    nombre: string
    fecha: string
    reservationId: string
    reservationNumber?: string | null
  }
): Promise<void> {
  const refDisplay = data.reservationNumber || data.reservationId.substring(0, 8)
  const content = `
    <h2 style="color:#c0392b;margin:0 0 20px;">❌ Reserva Cancelada</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, lamentamos informarte de que tu reserva 
      <strong>${refDisplay}</strong> para el <strong>${formatDateEs(data.fecha)}</strong> 
      ha sido cancelada porque no hemos recibido el pago de la señal dentro del plazo.
    </p>
    <p style="color:#1A0F05;font-size:15px;">
      Si deseas hacer una nueva reserva, no dudes en contactarnos:
    </p>
    <p style="color:#1A0F05;font-size:15px;">
      📞 930 347 246<br>
      📧 canalolimpic@daliagrup.com
    </p>
  `

  await sendEmail(to, `❌ Reserva ${refDisplay} Cancelada — Canal Olímpico`, emailTemplate('Reserva Cancelada', content))
}

// ─── Notificar al restaurante de nueva reserva ─────────────────────────────

export async function notifyRestaurantNewReservation(
  data: {
    nombre: string
    telefono?: string | null
    email?: string | null
    fecha: string
    hora: string
    personas: number
    eventType: string
    tableId?: string | null
    reservationId: string
    reservationNumber?: string | null
  }
): Promise<void> {
  const eventLabels: Record<string, string> = {
    RESERVA_NORMAL: 'Mesa normal',
    INFANTIL_CUMPLE: 'Infantil / Cumpleaños',
    GRUPO_SENTADO: 'Grupo sentado',
    GRUPO_PICA_PICA: 'Grupo pica-pica',
    NOCTURNA_EXCLUSIVA: 'Nocturna exclusiva',
  }

  const refDisplay = data.reservationNumber || data.reservationId.substring(0, 8)
  const content = `
    <h2 style="color:#B08D57;margin:0 0 20px;">📋 Nueva Reserva Recibida</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Se ha registrado una nueva reserva en el sistema.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;border-radius:8px;padding:20px;margin:0 0 20px;border:1px solid #e8e2d6;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#1A0F05;">👤 <strong>Cliente:</strong> ${data.nombre}</p>
        ${data.telefono ? `<p style="margin:4px 0;color:#1A0F05;">📱 <strong>Teléfono:</strong> ${data.telefono}</p>` : ''}
        ${data.email ? `<p style="margin:4px 0;color:#1A0F05;">📧 <strong>Email:</strong> ${data.email}</p>` : ''}
        <p style="margin:4px 0;color:#1A0F05;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#1A0F05;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#1A0F05;">👥 <strong>Personas:</strong> ${data.personas}</p>
        <p style="margin:4px 0;color:#1A0F05;">🍽️ <strong>Tipo:</strong> ${eventLabels[data.eventType] || data.eventType}</p>
        ${data.tableId ? `<p style="margin:4px 0;color:#1A0F05;">🪑 <strong>Mesa:</strong> ${data.tableId}</p>` : ''}
        <p style="margin:8px 0 4px;color:#B08D57;font-size:16px;">📋 <strong>Nº Reserva: ${refDisplay}</strong></p>
      </td></tr>
    </table>
    <p style="color:#8a8578;font-size:13px;">Email automático del sistema de reservas.</p>
  `

  const fechaCorta = formatDateEs(data.fecha).split(' de ').slice(0, 2).join(' ')
  await sendEmail(
    RESTAURANT_EMAIL,
    `📋 ${refDisplay} — ${data.nombre} · ${fechaCorta} · ${data.hora} · ${data.personas} pax`,
    emailTemplate('Nueva Reserva', content)
  )
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
    reservationNumber?: string | null
  }
): Promise<void> {
  const isEvent = data.eventType !== 'RESERVA_NORMAL'
  const refDisplay = data.reservationNumber || ''

  const eventContent = `
    <h2 style="color:#B08D57;margin:0 0 20px;">📌 Recordatorio — Tu evento se acerca</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu evento del <strong>${formatDateEs(data.fecha)}</strong> está a solo 5 días.
    </p>
    ${refDisplay ? `<p style="color:#B08D57;font-size:15px;margin:0 0 15px;">📋 <strong>Nº Reserva: ${refDisplay}</strong></p>` : ''}
    <div style="background-color:#fef9f0;border-radius:8px;padding:16px;margin:0 0 20px;border:1px solid #e8d5b2;">
      <p style="color:#92681e;font-size:14px;margin:0;"><strong>Por favor confirma:</strong></p>
      <ul style="color:#92681e;font-size:14px;margin:8px 0 0;padding-left:20px;">
        <li>Número definitivo de asistentes</li>
        <li>Platos escogidos del menú</li>
        <li>Alergias o menús especiales</li>
      </ul>
    </div>
    <p style="color:#1A0F05;">📞 930 347 246</p>
    ${refDisplay ? cancelBlock(refDisplay) : ''}
  `

  const normalContent = `
    <h2 style="color:#B08D57;margin:0 0 20px;">📌 Recordatorio de tu reserva</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, te recordamos que tienes una reserva:
    </p>
    ${refDisplay ? `<p style="color:#B08D57;font-size:15px;margin:0 0 15px;">📋 <strong>Nº Reserva: ${refDisplay}</strong></p>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;border-radius:8px;padding:20px;margin:0 0 20px;border:1px solid #e8e2d6;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#1A0F05;">📅 <strong>Fecha:</strong> ${formatDateEs(data.fecha)}</p>
        <p style="margin:4px 0;color:#1A0F05;">🕐 <strong>Hora:</strong> ${data.hora}h</p>
        <p style="margin:4px 0;color:#1A0F05;">👥 <strong>Personas:</strong> ${data.personas}</p>
      </td></tr>
    </table>
    <p style="color:#1A0F05;font-size:15px;">¡Te esperamos! 📍 Canal Olímpico, Castelldefels</p>
    ${refDisplay ? cancelBlock(refDisplay) : ''}
  `

  const content = isEvent ? eventContent : normalContent
  await sendEmail(to, '📌 Recordatorio — Canal Olímpico', emailTemplate('Recordatorio', content))
}

// ─── Enviar confirmación cuando el cliente completa la selección de platos ──

export async function sendDishSelectionConfirmation(
  to: string,
  data: {
    nombre: string
    fecha: string
    personas: number
    reservationNumber: string
    summaryHtml: string
  }
): Promise<void> {
  const content = `
    <h2 style="color:#6b9080;margin:0 0 20px;">🍽️ ¡Selección de Platos Confirmada!</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, hemos recibido la selección de platos de los 
      <strong>${data.personas}</strong> comensales para tu evento del <strong>${formatDateEs(data.fecha)}</strong>.
    </p>
    <div style="background-color:#f0fdf4;border-radius:8px;padding:16px;margin:0 0 20px;border:1px solid #86efac;">
      <p style="color:#166534;font-size:14px;margin:0;">
        ✅ El restaurante ya tiene tu selección. Si necesitas modificar algo, contacta antes de las 72h previas al evento.
      </p>
    </div>
    <p style="color:#1A0F05;font-size:15px;">¡Te esperamos! 🎉</p>
    <p style="color:#8a8578;font-size:13px;">📞 930 347 246 · 📧 canalolimpic@daliagrup.com</p>
    ${cancelBlock(data.reservationNumber)}
  `

  await sendEmail(to, `🍽️ Platos Confirmados — ${data.reservationNumber} — Canal Olímpico`, emailTemplate('Platos Confirmados', content))
}

// ─── Enviar resumen de platos al restaurante ────────────────────────────────

export async function sendDishSummaryToRestaurant(
  data: {
    reservationId: string
    reservationNumber: string
    customerName: string
    fecha: string
    personas: number
    summaryHtml: string
  }
): Promise<void> {
  const fechaCorta = formatDateEs(data.fecha).split(' de ').slice(0, 2).join(' ')
  const content = `
    ${data.summaryHtml}
    <p style="color:#8a8578;font-size:13px;margin:20px 0 0;">📎 PDF adjunto para imprimir en cocina.</p>
    <p style="color:#8a8578;font-size:13px;margin:4px 0 0;">Selección automática del sistema de reservas.</p>
  `

  // Generate PDF attachment
  let attachments: { filename: string; content: Buffer }[] | undefined
  try {
    const { generateDishPdf } = await import('@/lib/pdf-generator')
    const pdfBuffer = await generateDishPdf(data.reservationId)
    if (pdfBuffer) {
      attachments = [{
        filename: `platos-${data.reservationNumber}.pdf`,
        content: pdfBuffer,
      }]
      console.log(`[email] PDF generado para ${data.reservationNumber} (${pdfBuffer.length} bytes)`)
    }
  } catch (err) {
    console.error('[email] Error generando PDF adjunto:', err)
    // Continuamos sin PDF — el email HTML sigue sirviendo
  }

  await sendEmail(
    RESTAURANT_EMAIL,
    `🍽️ ${data.reservationNumber} — Platos · ${data.customerName} · ${fechaCorta} · ${data.personas} pax`,
    emailTemplate('Selección de Platos', content),
    attachments
  )
}

// ─── Enviar recordatorio de selección de platos pendiente ───────────────────

export async function sendDishSelectionReminder(
  to: string,
  data: {
    nombre: string
    fecha: string
    personas: number
    reservationNumber: string
    dishSelectionToken: string
  }
): Promise<void> {
  const content = `
    <h2 style="color:#B08D57;margin:0 0 20px;">🍽️ Recordatorio — Selección de Platos Pendiente</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, te recordamos que aún no has completado la selección de platos 
      para tu evento del <strong>${formatDateEs(data.fecha)}</strong> (${data.personas} comensales).
    </p>
    <div style="background-color:#fef9f0;border-radius:8px;padding:16px;margin:0 0 20px;border:1px solid #e8d5b2;">
      <p style="color:#92681e;font-size:14px;margin:0;">
        ⏰ <strong>Es importante completar la selección lo antes posible</strong> para que el restaurante 
        pueda preparar tu evento correctamente.
      </p>
    </div>
    <div style="text-align:center;margin:25px 0;">
      <a href="${SITE_URL}/elegir-platos/${data.dishSelectionToken}" 
         style="background:linear-gradient(135deg,#B08D57,#C4724E);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
        🍽️ Elegir platos ahora
      </a>
    </div>
    <p style="color:#8a8578;font-size:13px;text-align:center;">📞 930 347 246 · 📧 canalolimpic@daliagrup.com</p>
    ${cancelBlock(data.reservationNumber)}
  `

  await sendEmail(to, `🍽️ Recordatorio Platos — ${data.reservationNumber} — Canal Olímpico`, emailTemplate('Selección Pendiente', content))
}

// ─── Enviar confirmación de cancelación al cliente ──────────────────────────

export async function sendCancellationConfirmation(
  to: string,
  data: {
    nombre: string
    fecha: string
    hora: string
    reservationNumber: string
  }
): Promise<void> {
  const content = `
    <h2 style="color:#c0392b;margin:0 0 20px;">❌ Reserva Cancelada</h2>
    <p style="color:#1A0F05;font-size:16px;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, tu reserva <strong>${data.reservationNumber}</strong> 
      para el <strong>${formatDateEs(data.fecha)}</strong> a las <strong>${data.hora}h</strong> 
      ha sido cancelada correctamente.
    </p>
    <p style="color:#1A0F05;font-size:15px;">
      Si deseas hacer una nueva reserva, visita nuestra web o contáctanos:
    </p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${SITE_URL}/#reservar" style="background:linear-gradient(135deg,#B08D57,#C4724E);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
        Hacer nueva reserva
      </a>
    </div>
    <p style="color:#8a8578;font-size:13px;text-align:center;">
      📞 930 347 246 · 📧 canalolimpic@daliagrup.com
    </p>
  `

  await sendEmail(to, `❌ Reserva ${data.reservationNumber} Cancelada — Canal Olímpico`, emailTemplate('Reserva Cancelada', content))
}
