import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  sendReservationConfirmation,
  sendPaymentLink,
  sendPaymentConfirmation,
  sendReminder,
  notifyRestaurantNewReservation,
  verifyEmailConnection,
} from '@/lib/email'
import { findMenu } from '@/core/menus'

// ─── POST: Reenviar email de confirmación ────────────────────────────────────
// Permite reenviar el email apropiado según el estado y tipo de reserva

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    // Verificar conexión SMTP primero
    const smtpCheck = await verifyEmailConnection()
    if (!smtpCheck.ok) {
      return NextResponse.json({
        ok: false,
        error: `Error SMTP: ${smtpCheck.error}. Verifica las credenciales de Gmail en las variables de entorno.`,
      }, { status: 503 })
    }

    // Obtener reserva
    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()

    if (resErr || !reservation) {
      return NextResponse.json({ ok: false, error: 'Reserva no encontrada' }, { status: 404 })
    }

    const email = reservation.customer_email
    if (!email) {
      return NextResponse.json({
        ok: false,
        error: 'La reserva no tiene email del cliente. Actualiza el email primero.',
      }, { status: 400 })
    }

    // Parsear body para tipo de email (opcional)
    let emailType = 'auto'
    try {
      const body = await req.json()
      if (body.type) emailType = body.type
    } catch {
      // No body, usar auto
    }

    let result: { sent: string; to: string; error?: string }

    if (emailType === 'restaurant') {
      // Reenviar notificación al restaurante
      try {
        await notifyRestaurantNewReservation({
          nombre: reservation.customer_name,
          telefono: reservation.customer_phone,
          email: reservation.customer_email,
          fecha: reservation.fecha,
          hora: reservation.hora_inicio,
          personas: reservation.personas,
          eventType: reservation.event_type,
          tableId: reservation.table_id,
          reservationId: reservation.id,
          reservationNumber: reservation.reservation_number,
        })
        result = { sent: 'restaurant_notification', to: 'restaurante' }
      } catch (err: any) {
        result = { sent: 'restaurant_notification', to: 'restaurante', error: err?.message || 'Error desconocido' }
      }
    } else if (emailType === 'reminder') {
      // Enviar recordatorio al cliente
      try {
        await sendReminder(email, {
          nombre: reservation.customer_name,
          fecha: reservation.fecha,
          hora: reservation.hora_inicio?.substring(0, 5) || reservation.hora_inicio,
          personas: reservation.personas,
          eventType: reservation.event_type,
          reservationNumber: reservation.reservation_number,
        })
        result = { sent: 'reminder', to: email }
      } catch (err: any) {
        result = { sent: 'reminder', to: email, error: err?.message || 'Error desconocido' }
      }
    } else {
      // Auto-detectar tipo de email según estado
      try {
        if (reservation.status === 'CONFIRMED' && reservation.event_type === 'RESERVA_NORMAL') {
          // Reserva normal confirmada → email de confirmación
          await sendReservationConfirmation(email, {
            nombre: reservation.customer_name,
            fecha: reservation.fecha,
            hora: reservation.hora_inicio,
            personas: reservation.personas,
            tableId: reservation.table_id,
            zone: null,
            reservationId: reservation.id,
            reservationNumber: reservation.reservation_number,
          })
          result = { sent: 'confirmation', to: email }

        } else if (reservation.status === 'CONFIRMED' && reservation.event_type !== 'RESERVA_NORMAL') {
          // Evento confirmado (pagado) → email de confirmación de pago
          await sendPaymentConfirmation(email, {
            nombre: reservation.customer_name,
            fecha: reservation.fecha,
            hora: reservation.hora_inicio,
            personas: reservation.personas,
            deposit: reservation.deposit_amount || 0,
            reservationId: reservation.id,
            reservationNumber: reservation.reservation_number,
            menuCode: reservation.menu_code,
            dishSelectionToken: reservation.dish_selection_token,
          })
          result = { sent: 'payment_confirmation', to: email }

        } else if (reservation.status === 'HOLD_BLOCKED' && reservation.stripe_checkout_url) {
          // Pendiente de pago → email con link de pago
          const menuName = reservation.menu_code ? (findMenu(reservation.menu_code)?.name || 'Menú seleccionado') : 'Menú seleccionado'
          await sendPaymentLink(email, {
            nombre: reservation.customer_name,
            fecha: reservation.fecha,
            hora: reservation.hora_inicio,
            personas: reservation.personas,
            menuName,
            total: reservation.total_amount || 0,
            deposit: reservation.deposit_amount || 0,
            paymentUrl: reservation.stripe_checkout_url,
            deadlineDays: 3,
            reservationId: reservation.id,
            reservationNumber: reservation.reservation_number,
          })
          result = { sent: 'payment_link', to: email }

        } else {
          // Fallback: enviar confirmación genérica
          await sendReservationConfirmation(email, {
            nombre: reservation.customer_name,
            fecha: reservation.fecha,
            hora: reservation.hora_inicio,
            personas: reservation.personas,
            tableId: reservation.table_id,
            zone: null,
            reservationId: reservation.id,
            reservationNumber: reservation.reservation_number,
          })
          result = { sent: 'confirmation', to: email }
        }
      } catch (err: any) {
        console.error(`[resend-email] Error reenviando email para reserva ${id}:`, err)
        return NextResponse.json({
          ok: false,
          error: `Error enviando email: ${err?.message || 'Error desconocido'}`,
        }, { status: 500 })
      }
    }

    if (result.error) {
      return NextResponse.json({
        ok: false,
        error: `Error enviando email: ${result.error}`,
      }, { status: 500 })
    }

    console.log(`[resend-email] ✅ Email reenviado: tipo=${result.sent}, a=${result.to}, reserva=${id}`)

    return NextResponse.json({
      ok: true,
      message: `Email reenviado correctamente a ${result.to}`,
      type: result.sent,
    })
  } catch (err: any) {
    console.error(`[resend-email] Error inesperado:`, err)
    return NextResponse.json({
      ok: false,
      error: `Error interno: ${err?.message || 'Error desconocido'}`,
    }, { status: 500 })
  }
}
