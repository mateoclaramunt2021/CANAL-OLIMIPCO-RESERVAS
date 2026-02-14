import { addHours, format, isBefore, parseISO } from 'date-fns'

const TIMEZONE = 'Europe/Madrid'

export function computeBlockKey(dateTime: Date): string {
  const hour = dateTime.getHours()
  const blockHour = Math.floor(hour / 2) * 2
  return format(dateTime, `yyyy-MM-dd_${blockHour.toString().padStart(2, '0')}:00`)
}

export function validateRules(draft: {
  event_type: string
  start_datetime: Date
  guests_estimated: number
  total_amount: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const localTime = new Date(draft.start_datetime.getTime() + (1 * 60 * 60 * 1000)) // Approx Madrid
  const hour = localTime.getHours()

  if (draft.event_type === 'infantil' && hour > 20) {
    errors.push('Cumpleaños infantil solo hasta las 20:30')
  }
  if (draft.event_type === 'nocturna' && hour < 21) {
    errors.push('Nocturna solo desde las 21:30')
  }
  if (draft.event_type === 'nocturna' && draft.total_amount < 1000) {
    errors.push('Nocturna requiere mínimo 1000€')
  }
  if (draft.guests_estimated <= 0) {
    errors.push('Debe haber al menos 1 invitado')
  }
  return { valid: errors.length === 0, errors }
}

export async function checkCapacity(blockKey: string, supabaseAdmin: any): Promise<{ capacityUsed: number; maxCapacity: number }> {
  const { data } = await supabaseAdmin
    .from('reservations')
    .select('guests_estimated')
    .eq('block_key', blockKey)
    .in('status', ['pending_payment', 'confirmed', 'pending_final'])

  const capacityUsed = data?.reduce((sum: number, r: any) => sum + r.guests_estimated, 0) || 0
  return { capacityUsed, maxCapacity: 100 }
}

export function calcTotals(menuCode: string, guests: number, drinkTickets: number, extrasHours: string): number {
  let total = 0
  if (menuCode.startsWith('infantil')) total += 14.5 * guests
  else if (menuCode === 'padres') total += 38 * guests
  else if (menuCode === 'grupo29') total += 29 * guests
  else if (menuCode === 'grupo34') total += 34 * guests
  else if (menuCode === 'pica30') total += 30 * guests
  else if (menuCode === 'pica34premium') total += 34 * guests

  total += drinkTickets * 3

  if (extrasHours === '02:00') total += 100
  else if (extrasHours === '03:00') total += 300

  return total
}

export function computeDeposit(total: number): number {
  return Math.round(total * 0.4 * 100) / 100
}

export function buildInvoiceHtml(reservation: any): string {
  return `
    <html>
      <body>
        <h1>Factura Reserva - Canal Olímpico</h1>
        <p>Cliente: ${reservation.client_name}</p>
        <p>Fecha: ${reservation.start_datetime}</p>
        <p>Total: ${reservation.total_amount}€</p>
        <p>Señal 40%: ${reservation.deposit_amount}€</p>
        <p>IVA incluido</p>
        <p>Nota: Reserva bloqueada 120h hasta ${reservation.lock_expires_at}</p>
      </body>
    </html>
  `
}