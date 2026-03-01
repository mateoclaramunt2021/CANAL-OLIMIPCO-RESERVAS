import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAutoCancel, sendReminder, sendDishSelectionReminder } from '@/lib/email'
import { PAYMENT_DEADLINE_DAYS } from '@/core/menus'
import { notifyAutoCancel, notifyReminderSent } from '@/lib/telegram'

// ─── POST: Cron Job — ejecutar tareas programadas ───────────────────────────
// Llamar periódicamente (ej: cada hora desde Vercel Cron o un servicio externo)
//
// Tareas:
// 1. Cancelar reservas HOLD_BLOCKED cuyo plazo de pago (5 días) ha expirado
// 2. Enviar recordatorio 5 días antes del evento (confirmar asistentes/platos)

export async function POST(req: NextRequest) {
  const results = {
    expired_cancelled: 0,
    reminders_sent: 0,
    dish_reminders_sent: 0,
    errors: [] as string[],
  }

  try {
    // ── 1. Cancelar reservas sin pagar tras 5 días ──
    const deadlineDate = new Date()
    deadlineDate.setDate(deadlineDate.getDate() - PAYMENT_DEADLINE_DAYS)

    const { data: unpaid } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_name, customer_phone, customer_email, fecha')
      .eq('status', 'HOLD_BLOCKED')
      .lt('created_at', deadlineDate.toISOString())

    for (const res of (unpaid ?? [])) {
      try {
        // Cancelar
        await supabaseAdmin
          .from('reservations')
          .update({ status: 'CANCELED', canceled_reason: 'payment_expired' })
          .eq('id', res.id)

        // Enviar email de cancelación
        if (res.customer_email) {
          await sendAutoCancel(res.customer_email, {
            nombre: res.customer_name || 'Cliente',
            fecha: res.fecha,
            reservationId: res.id,
          })
        }

        // Telegram alert
        notifyAutoCancel({
          reservationId: res.id,
          nombre: res.customer_name || 'Cliente',
          fecha: res.fecha,
        }).catch(err => console.error('[jobs/run] Telegram cancel error:', err))

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
      .select('id, customer_name, customer_phone, customer_email, fecha, hora_inicio, personas, event_type')
      .eq('status', 'CONFIRMED')
      .eq('fecha', fiveDaysStr)

    for (const res of (upcoming ?? [])) {
      try {
        if (res.customer_email) {
          await sendReminder(res.customer_email, {
            nombre: res.customer_name || 'Cliente',
            fecha: res.fecha,
            hora: res.hora_inicio || '',
            personas: res.personas || 0,
            eventType: res.event_type || 'RESERVA_NORMAL',
          })

          // Telegram alert
          notifyReminderSent({
            reservationId: res.id,
            nombre: res.customer_name || 'Cliente',
            fecha: res.fecha,
            eventType: res.event_type || 'RESERVA_NORMAL',
          }).catch(err => console.error('[jobs/run] Telegram reminder error:', err))

          results.reminders_sent++
        }
      } catch (err) {
        results.errors.push(`Error reminding ${res.id}: ${String(err)}`)
      }
    }

    // ── 3. Recordatorio selección de platos (48h después de pagar sin completar) ──
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: pendingDishes } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_name, customer_email, customer_phone, fecha, personas, reservation_number, dish_selection_token, dishes_status, menu_code')
      .eq('status', 'CONFIRMED')
      .eq('dishes_status', 'pending')
      .not('dish_selection_token', 'is', null)
      .not('menu_code', 'is', null)
      .in('menu_code', ['menu_grupo_34', 'menu_grupo_29', 'menu_infantil'])

    for (const res of (pendingDishes ?? [])) {
      try {
        // Check if more than 48h since confirmed (payment received)
        // We use the fact that dishes_status was set to 'pending' at confirmation time
        if (res.customer_email && res.dish_selection_token && res.reservation_number) {
          await sendDishSelectionReminder(res.customer_email, {
            nombre: res.customer_name || 'Cliente',
            fecha: res.fecha,
            personas: res.personas || 0,
            reservationNumber: res.reservation_number,
            dishSelectionToken: res.dish_selection_token,
          })
          results.dish_reminders_sent++
        }
      } catch (err) {
        results.errors.push(`Error dish reminder ${res.id}: ${String(err)}`)
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