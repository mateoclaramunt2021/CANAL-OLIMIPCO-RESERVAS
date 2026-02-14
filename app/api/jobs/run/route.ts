import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { whatsAppProvider, callProvider } from '@/lib/providers'

export async function POST(req: NextRequest) {
  // Expirar locks
  const expired = await supabaseAdmin
    .from('reservations')
    .update({ status: 'canceled' })
    .eq('status', 'pending_payment')
    .lt('lock_expires_at', new Date())
    .select('id')

  // Recordatorios 5 días antes
  const fiveDaysFromNow = new Date()
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

  const upcoming = await supabaseAdmin
    .from('reservations')
    .select('id, start_datetime, clients (phone)')
    .eq('status', 'confirmed')
    .gte('start_datetime', fiveDaysFromNow)
    .lt('start_datetime', new Date(fiveDaysFromNow.getTime() + 24 * 60 * 60 * 1000))

  const remindersWithCallNeeded: string[] = []

  for (const res of upcoming) {
    const message = 'Recordatorio: Confirme asistentes y menús 5 días antes.'
    await whatsAppProvider.sendMessage(res.clients.phone, message)
    // Flag this reservation for follow-up call (handled by next cron run)
    remindersWithCallNeeded.push(res.id)
  }

  return NextResponse.json({
    expired_locks: expired?.data?.length ?? 0,
    sent_reminders: upcoming?.data?.length ?? 0,
    pending_followup_calls: remindersWithCallNeeded.length
  })
}