import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const reservationId = session.metadata?.reservation_id

    if (reservationId) {
      await supabaseAdmin
        .from('reservations')
        .update({ status: 'confirmed', deposit_paid: true })
        .eq('id', reservationId)

      await supabaseAdmin
        .from('payments')
        .insert({
          reservation_id: reservationId,
          method: 'stripe',
          amount: session.amount_total! / 100,
          stripe_session_id: session.id,
          status: 'completed'
        })
    }
  }

  return NextResponse.json({ received: true })
}