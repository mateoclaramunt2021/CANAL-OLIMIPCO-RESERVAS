import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import { computeBlockKey, validateRules, checkCapacity, calcTotals, computeDeposit, buildInvoiceHtml } from '@/core/business'
import { whatsAppProvider } from '@/lib/providers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' })

const createSchema = z.object({
  client: z.object({ name: z.string().min(1), phone: z.string().min(1) }),
  event_type: z.enum(['infantil', 'nocturna', 'grupos']),
  start_datetime: z.string().transform(s => new Date(s)),
  guests_estimated: z.number().int().positive(),
  menu_code: z.string().optional(),
  menu_payload: z.object({}).catchall(z.unknown()).optional(),
  drink_tickets_qty: z.number().int().min(0).default(0),
  extras: z.object({}).catchall(z.unknown()).optional(),
  conditions_accepted: z.boolean().refine(v => v === true, 'Debe aceptar condiciones')
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createSchema.parse(body)

    // Validar reglas
    const validation = validateRules({
      event_type: parsed.event_type,
      start_datetime: parsed.start_datetime,
      guests_estimated: parsed.guests_estimated,
      total_amount: 0 // calcular después
    })
    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }

    // Calcular total
    const extrasHours = String(parsed.extras?.hours_extra || '')
    const total = calcTotals(parsed.menu_code || '', parsed.guests_estimated, parsed.drink_tickets_qty, extrasHours)
    const deposit = computeDeposit(total)

    // Verificar capacidad
    const blockKey = computeBlockKey(parsed.start_datetime)
    const capacity = await checkCapacity(blockKey, supabaseAdmin)
    if (capacity.capacityUsed + parsed.guests_estimated > capacity.maxCapacity) {
      return NextResponse.json({ error: 'Capacidad excedida' }, { status: 400 })
    }

    // Crear cliente si no existe
    let { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('phone', parsed.client.phone)
      .single()

    if (!client) {
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({ name: parsed.client.name, phone: parsed.client.phone })
        .select('id')
        .single()
      if (clientError) throw clientError
      client = newClient
    }

    // Crear reserva
    const lockExpires = new Date(Date.now() + 120 * 60 * 60 * 1000) // 120h
    const { data: reservation, error } = await supabaseAdmin
      .from('reservations')
      .insert({
        client_id: client.id,
        event_type: parsed.event_type,
        start_datetime: parsed.start_datetime,
        end_datetime: new Date(parsed.start_datetime.getTime() + 2 * 60 * 60 * 1000), // +2h
        block_key: blockKey,
        guests_estimated: parsed.guests_estimated,
        menu_code: parsed.menu_code,
        menu_payload: parsed.menu_payload,
        drink_tickets_qty: parsed.drink_tickets_qty,
        extras: parsed.extras,
        total_amount: total,
        deposit_amount: deposit,
        lock_expires_at: lockExpires,
        conditions_accepted: parsed.conditions_accepted
      })
      .select()
      .single()

    if (error) throw error

    // Enviar WhatsApp con resumen
    const invoice = buildInvoiceHtml({ ...reservation, client_name: parsed.client.name })
    const message = `Reserva creada. Total: ${total}€, Señal: ${deposit}€. Link de pago: [generar]`
    await whatsAppProvider.sendMessage(parsed.client.phone, message)

    return NextResponse.json({ id: reservation.id, block_key: blockKey, total_amount: total, deposit_amount: deposit, lock_expires_at: lockExpires })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const blockKey = searchParams.get('block_key')

  let query = supabaseAdmin
    .from('reservations')
    .select(`
      id, event_type, start_datetime, status, total_amount, deposit_amount,
      clients (name, phone)
    `)

  if (status) query = query.eq('status', status)
  if (startDate) query = query.gte('start_datetime', startDate)
  if (blockKey) query = query.eq('block_key', blockKey)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}