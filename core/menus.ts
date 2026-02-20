// ─── Catálogo de Menús — Canal Olímpico 2026 ─────────────────────────────────
//
// Precios con IVA incluido.
// Señal: 40% del total.
// Plazo de pago: 5 días (120h) máximo tras reservar.
// Antelación mínima: 5 días antes del evento.
// Modificar asistentes: 72h antes. Alergias: 72h antes.
// Cancelación: 72h antes → señal retenida nueva fecha. Fuera plazo → se pierde.

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MenuItem {
  code: string
  name: string
  price: number          // € por persona (IVA incluido)
  description: string
  drinks: string
  eventTypes: string[]   // Tipos de evento compatibles
}

export interface ExtraHorario {
  label: string
  from: string
  to: string
  cost: number  // € fijo
}

export interface QuoteResult {
  menu: MenuItem
  personas: number
  subtotal_menu: number
  drink_tickets: number
  subtotal_drink_tickets: number
  extras_horarios: ExtraHorario[]
  subtotal_extras: number
  total: number
  deposit: number        // 40% del total
  deposit_percentage: number
  payment_deadline_days: number
  min_advance_days: number
}

// ─── Catálogo de menús ───────────────────────────────────────────────────────

export const MENUS: MenuItem[] = [
  {
    code: 'menu_grupo_34',
    name: 'Menú Grupo Premium (34€)',
    price: 34,
    description: [
      'PARA COMPARTIR: Surtido de embutidos ibéricos, Pan de coca con tomate, aceite de oliva y romero, Patatas bravas',
      'PARA ESCOGER: Solomillo de cerdo a la pimienta / Bacalao con cremoso de setas / Parrillada de verduras',
      'POSTRE: Tarta o Helado',
      'BEBIDA: 1 refresco/cerveza/vino + agua + café o infusión',
    ].join('\n'),
    drinks: '1 bebida + agua + café o infusión',
    eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'],
  },
  {
    code: 'menu_grupo_29',
    name: 'Menú Grupo (29€)',
    price: 29,
    description: [
      'PRIMERO: Rigatoni con crema suave de tomate / Ensalada de queso de cabra con frutos rojos',
      'PARA ESCOGER: Solomillo a la pimienta verde / Lubina al horno con patata panadera / Parrillada de verduras',
      'POSTRE: Sorbete de limón al cava / Macedonia de frutas',
      'BEBIDA: 1 refresco/cerveza/vino + agua',
    ].join('\n'),
    drinks: '1 bebida + agua',
    eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'],
  },
  {
    code: 'menu_infantil',
    name: 'Menú Infantil (14,50€)',
    price: 14.5,
    description: [
      'ESCOGER: Macarrones tomate / Hamburguesa patatas / Fingers pollo / Canelones',
      'POSTRE: Tarta / Helado / Yogur',
      'BEBIDA: 1 refresco/zumo/agua',
    ].join('\n'),
    drinks: '1 bebida',
    eventTypes: ['INFANTIL_CUMPLE'],
  },
  {
    code: 'menu_pica_34',
    name: 'Pica-Pica Premium (34€)',
    price: 34,
    description: [
      'Surtido embutidos ibéricos, Pan de coca con tomate y aceite de oliva, Bravas,',
      'Brocheta sepia y gambas, Alcachofas con jamón de pato,',
      'Miniensaladas de queso de cabra con frutos rojos, Saquitos de carrillera,',
      'Croquetas, Minihamburguesas en pan de brioxe',
      'BEBIDA: 2 refrescos/vino/cerveza',
    ].join('\n'),
    drinks: '2 bebidas',
    eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'],
  },
  {
    code: 'menu_pica_30',
    name: 'Pica-Pica (30€)',
    price: 30,
    description: [
      'Tacos de tortilla de patatas, Mix de croquetas, Minihamburguesas en pan de brioxe,',
      'Calamarcitos a la andaluza, Fingers de pollo,',
      'Nachos con guacamole, chile y pico de gallo',
      'BEBIDA: 2 refrescos/vino/cerveza',
    ].join('\n'),
    drinks: '2 bebidas',
    eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'],
  },
]

// ─── Menú de padres (para acompañantes adultos en cumpleaños infantil) ───────

export const MENU_PADRES: MenuItem = {
  code: 'menu_padres_38',
  name: 'Menú Padres/Adultos (38€)',
  price: 38,
  description: 'Menú para adultos acompañantes en eventos infantiles',
  drinks: '1 bebida + agua + café',
  eventTypes: ['INFANTIL_CUMPLE'],
}

// ─── Extras horarios ────────────────────────────────────────────────────────

export const EXTRAS_HORARIOS: ExtraHorario[] = [
  { label: 'Extensión 1:00–2:00 AM', from: '01:00', to: '02:00', cost: 100 },
  { label: 'Extensión 2:00–3:00 AM', from: '02:00', to: '03:00', cost: 200 },
]

// ─── Constantes de negocio ───────────────────────────────────────────────────

export const DEPOSIT_PERCENTAGE = 0.40     // 40%
export const PAYMENT_DEADLINE_DAYS = 5     // 5 días (120h) para pagar
export const MIN_ADVANCE_DAYS = 5          // Mínimo 5 días de antelación
export const CANCEL_NOTICE_HOURS = 72      // 72h para cancelar/modificar
export const ALLERGY_NOTICE_HOURS = 72     // 72h para avisar alergias

// ─── Funciones ───────────────────────────────────────────────────────────────

/** Buscar menú por código */
export function findMenu(code: string): MenuItem | undefined {
  if (code === MENU_PADRES.code) return MENU_PADRES
  return MENUS.find(m => m.code === code)
}

/** Obtener menús compatibles con un tipo de evento */
export function getMenusForEvent(eventType: string): MenuItem[] {
  return MENUS.filter(m => m.eventTypes.includes(eventType))
}

/** Verificar antelación mínima según tipo de reserva.
 *  - RESERVA_NORMAL: mínimo 4 horas de antelación.
 *  - EVENTOS/GRUPOS: mínimo 5 días de antelación.
 */
export function checkMinAdvance(fechaStr: string, horaStr?: string, eventType?: string): { ok: boolean; message?: string } {
  const now = new Date()

  // Eventos y grupos: 5 días de antelación
  const isEvent = eventType && eventType !== 'RESERVA_NORMAL'
  if (isEvent) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fecha = new Date(fechaStr + 'T00:00:00')
    const diffMs = fecha.getTime() - today.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < MIN_ADVANCE_DAYS) {
      return {
        ok: false,
        message: `Los eventos deben reservarse con mínimo ${MIN_ADVANCE_DAYS} días de antelación. La fecha más próxima disponible es ${formatDate(addDays(today, MIN_ADVANCE_DAYS))}.`,
      }
    }
    return { ok: true }
  }

  // Reserva normal: mínimo 4 horas de antelación
  const hora = horaStr || '12:00'
  const reservationDate = new Date(`${fechaStr}T${hora}:00`)
  const diffMs = reservationDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 4) {
    return {
      ok: false,
      message: 'Las reservas de mesa deben hacerse con al menos 4 horas de antelación.',
    }
  }

  // No permitir fechas pasadas
  if (diffMs < 0) {
    return {
      ok: false,
      message: 'No se puede reservar en una fecha y hora que ya ha pasado.',
    }
  }

  return { ok: true }
}

/** Calcular fecha límite de pago (4 días desde ahora) */
export function getPaymentDeadline(): Date {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + PAYMENT_DEADLINE_DAYS)
  return deadline
}

/** Verificar si el plazo de pago ha expirado */
export function isPaymentExpired(createdAt: string): boolean {
  const created = new Date(createdAt)
  const deadline = new Date(created.getTime() + PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
  return new Date() > deadline
}

/** Verificar si se puede cancelar (72h antes del evento) */
export function canCancel(fechaEvento: string, horaEvento: string): { ok: boolean; message?: string } {
  const eventDate = new Date(`${fechaEvento}T${horaEvento}:00`)
  const now = new Date()
  const diffMs = eventDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < CANCEL_NOTICE_HOURS) {
    return {
      ok: false,
      message: `La cancelación/modificación debe comunicarse con ${CANCEL_NOTICE_HOURS}h de antelación. Ya no es posible.`,
    }
  }
  return { ok: true }
}

/** Calcular presupuesto completo */
export function calculateQuote(
  menuCode: string,
  personas: number,
  extrasHorariosCodes?: string[], // ['01:00-02:00', '02:00-03:00']
  drinkTickets: number = 0,       // Tickets de bebida extra (3€ c/u)
): QuoteResult | { error: string } {
  const menu = findMenu(menuCode)
  if (!menu) return { error: `Menú "${menuCode}" no encontrado` }

  const subtotal_menu = menu.price * personas
  const subtotal_drink_tickets = drinkTickets * 3

  const extras: ExtraHorario[] = []
  let subtotal_extras = 0

  if (extrasHorariosCodes) {
    for (const code of extrasHorariosCodes) {
      const extra = EXTRAS_HORARIOS.find(e => `${e.from}-${e.to}` === code)
      if (extra) {
        extras.push(extra)
        subtotal_extras += extra.cost
      }
    }
  }

  const total = subtotal_menu + subtotal_drink_tickets + subtotal_extras
  const deposit = Math.round(total * DEPOSIT_PERCENTAGE * 100) / 100

  return {
    menu,
    personas,
    subtotal_menu,
    drink_tickets: drinkTickets,
    subtotal_drink_tickets,
    extras_horarios: extras,
    subtotal_extras,
    total,
    deposit,
    deposit_percentage: DEPOSIT_PERCENTAGE * 100,
    payment_deadline_days: PAYMENT_DEADLINE_DAYS,
    min_advance_days: MIN_ADVANCE_DAYS,
  }
}

/** Formatear presupuesto como texto para WhatsApp */
export function formatQuoteMessage(quote: QuoteResult, reservationRef: string): string {
  const lines = [
    `📋 *Presupuesto Reserva — Canal Olímpico*`,
    ``,
    `🍽️ *${quote.menu.name}*`,
    `👥 ${quote.personas} personas × ${quote.menu.price}€ = ${quote.subtotal_menu}€`,
  ]

  if (quote.drink_tickets > 0) {
    lines.push(`🍺 ${quote.drink_tickets} tickets bebida × 3€ = ${quote.subtotal_drink_tickets}€`)
  }

  if (quote.extras_horarios.length > 0) {
    lines.push(``)
    lines.push(`⏰ *Extras horarios:*`)
    for (const extra of quote.extras_horarios) {
      lines.push(`  ${extra.label}: +${extra.cost}€`)
    }
  }

  lines.push(``)
  lines.push(`💰 *Total: ${quote.total}€* (IVA incluido)`)
  lines.push(`💳 *Señal ${quote.deposit_percentage}%: ${quote.deposit}€*`)
  lines.push(``)
  lines.push(`⏳ Tienes *${quote.payment_deadline_days} días* para realizar el pago.`)
  lines.push(`📌 Ref: ${reservationRef}`)

  return lines.join('\n')
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
