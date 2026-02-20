import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { sendPaymentConfirmation } from '@/lib/whatsapp'
import { notifyPaymentReceived } from '@/lib/telegram'

// ─── POST: Webhook de Stripe ────────────────────────────────────────────────
// Cuando el cliente paga la señal del 40%, Stripe nos avisa aquí.
// → Cambiamos estado a CONFIRMED
// → Guardamos el pago
// → Enviamos WhatsApp de confirmación automáticamente

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!endpointSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // ── checkout.session.completed → pago recibido ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const reservationId = session.metadata?.reservation_id

    if (reservationId) {
      try {
        // 1. Actualizar reserva → CONFIRMED
        await supabaseAdmin
          .from('reservations')
          .update({
            status: 'CONFIRMED',
            stripe_session_id: session.id,
          })
          .eq('id', reservationId)

        // 2. Guardar pago en tabla payments
        await supabaseAdmin
          .from('payments')
          .insert({
            reservation_id: reservationId,
            method: 'stripe',
            amount: session.amount_total! / 100,
            stripe_session_id: session.id,
            status: 'completed',
          })

        // 3. Leer datos de la reserva para enviar WhatsApp
        const { data: reservation } = await supabaseAdmin
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single()

        if (reservation && reservation.customer_phone) {
          await sendPaymentConfirmation(reservation.customer_phone, {
            nombre: reservation.customer_name || 'Cliente',
            fecha: reservation.fecha,
            hora: reservation.hora_inicio,
            personas: reservation.personas,
            deposit: session.amount_total! / 100,
            reservationId: reservationId,
          })
        }

        console.log(`[stripe-webhook] Reservation ${reservationId} confirmed, payment ${session.amount_total! / 100}€`)

        // 4. Telegram notification
        notifyPaymentReceived({
          reservationId,
          nombre: reservation?.customer_name || 'Cliente',
          fecha: reservation?.fecha || '',
          amount: session.amount_total! / 100,
        }).catch(err => console.error('[stripe-webhook] Telegram error:', err))
      } catch (err) {
        console.error('[stripe-webhook] Error processing payment:', err)
      }
    }
  }

  // ── checkout.session.expired → sesión de pago caducada ──
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const reservationId = session.metadata?.reservation_id

    if (reservationId) {
      console.log(`[stripe-webhook] Payment session expired for reservation ${reservationId}`)
      // No cancelamos aquí — el cron job de 4 días se encarga
    }
  }

  return NextResponse.json({ received: true })
}