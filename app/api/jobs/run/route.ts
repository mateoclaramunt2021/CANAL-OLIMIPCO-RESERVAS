import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAutoCancel, sendText } from '@/lib/whatsapp'
import { PAYMENT_DEADLINE_DAYS } from '@/core/menus'

// ─── POST: Cron Job — ejecutar tareas programadas ───────────────────────────
// Llamar periódicamente (ej: cada hora desde Vercel Cron o un servicio externo)
//
// Tareas:
// 1. Cancelar reservas HOLD_BLOCKED cuyo plazo de pago (4 días) ha expirado
// 2. Enviar recordatorio 5 días antes del evento (confirmar asistentes/platos)

export async function POST(req: NextRequest) {
  const results = {
    expired_cancelled: 0,
    reminders_sent: 0,
    errors: [] as string[],
  }

  try {
    // ── 1. Cancelar reservas sin pagar tras 4 días ──
    const deadlineDate = new Date()
    deadlineDate.setDate(deadlineDate.getDate() - PAYMENT_DEADLINE_DAYS)

    const { data: unpaid } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_name, customer_phone, fecha')
      .eq('status', 'HOLD_BLOCKED')
      .lt('created_at', deadlineDate.toISOString())

    for (const res of (unpaid ?? [])) {
      try {
        // Cancelar
        await supabaseAdmin
          .from('reservations')
          .update({ status: 'CANCELED', canceled_reason: 'payment_expired' })
          .eq('id', res.id)

        // Enviar WhatsApp de cancelación
        if (res.customer_phone) {
          await sendAutoCancel(res.customer_phone, {
            nombre: res.customer_name || 'Cliente',
            fecha: res.fecha,
            reservationId: res.id,
          })
        }

        results.expired_cancelled++
      } catch (err) {
        results.errors.push(`Error cancelling ${res.id}: ${String(err)}`)
      }
    }

    // ── 2. Recordatorio 5 días antes del evento ──
    const fiveDaysFromNow = new Date()
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)
    const fiveDaysStr = fiveDaysFromNow.toISOString().split('T')[0]

    const { data: upcoming } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_name, customer_phone, fecha, hora_inicio, personas, event_type')
      .eq('status', 'CONFIRMED')
      .eq('fecha', fiveDaysStr)

    for (const res of (upcoming ?? [])) {
      try {
        if (res.customer_phone) {
          const isEvent = res.event_type !== 'RESERVA_NORMAL'
          const message = isEvent
            ? `📌 *Recordatorio — ${res.customer_name}*\n\n` +
              `Tu evento del ${res.fecha} se acerca.\n\n` +
              `Por favor confirma:\n` +
              `• Número definitivo de asistentes\n` +
              `• Platos escogidos del menú\n` +
              `• Alergias o menús especiales\n\n` +
              `📞 938.587.088 / 629.358.562`
            : `📌 *Recordatorio — ${res.customer_name}*\n\n` +
              `Tu reserva para el ${res.fecha} a las ${res.hora_inicio}h (${res.personas} personas) sigue confirmada.\n\n` +
              `¡Te esperamos! 📍 Canal Olímpico, Castelldefels`

          await sendText(res.customer_phone, message)
          results.reminders_sent++
        }
      } catch (err) {
        results.errors.push(`Error reminding ${res.id}: ${String(err)}`)
      }
    }
  } catch (err) {
    console.error('[jobs/run] Error:', err)
    results.errors.push(String(err))
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  })
}

// ── GET: para Vercel Cron (que usa GET) ──
export async function GET(req: NextRequest) {
  // Redirigir al POST
  return POST(req)
}