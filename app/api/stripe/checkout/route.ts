import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' })

const schema = z.object({ reservation_id: z.string() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reservation_id } = schema.parse(body)

    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('deposit_amount')
      .eq('id', reservation_id)
      .single()

    if (!reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Señal Reserva Canal Olímpico' },
          unit_amount: Math.round(reservation.deposit_amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
      metadata: { reservation_id }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}