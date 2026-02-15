// ─── Catálogo de Menús — Canal Olímpico 2026 ─────────────────────────────────
//
// Precios con IVA incluido.
// Señal: 40% del total.
// Plazo de pago: 4 días máximo tras reservar.
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
      'COMPARTIR: Embutidos ibéricos, pan coca tomate, bravas',
      'ESCOGER: Solomillo pimienta / Bacalao setas / Parrillada verduras',
      'POSTRE: Tarta o Helado',
      'BEBIDA: 1 refresco/cerveza/vino + agua + café/infusión',
    ].join('\n'),
    drinks: '1 bebida + agua + café',
    eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'],
  },
  {
    code: 'menu_grupo_29',
    name: 'Menú Grupo (29€)',
    price: 29,
    description: [
      'PRIMERO: Rigatoni crema tomate / Ensalada cabra frutos rojos',
      'ESCOGER: Solomillo pimienta verde / Lubina horno / Parrillada verduras',
      'POSTRE: Sorbete limón cava / Macedonia frutas',
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
      'Embutidos ibéricos, pan coca, bravas, brocheta sepia y gambas,',
      'alcachofas jamón pato, ensaladitas cabra, saquitos carrillera,',
      'croquetas, minihamburguesas brioxe',
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
      'Tortilla patatas, croquetas, minihamburguesas brioxe,',
      'calamarcitos andaluza, fingers pollo, nachos guacamole',
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
export const PAYMENT_DEADLINE_DAYS = 4     // 4 días para pagar
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

/** Verificar que la fecha tiene al menos 5 días de antelación */
export function checkMinAdvance(fechaStr: string): { ok: boolean; message?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fecha = new Date(fechaStr + 'T00:00:00')
  const diffMs = fecha.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < MIN_ADVANCE_DAYS) {
    return {
      ok: false,
      message: `La reserva debe hacerse con mínimo ${MIN_ADVANCE_DAYS} días de antelación. La fecha más próxima disponible es ${formatDate(addDays(today, MIN_ADVANCE_DAYS))}.`,
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
): QuoteResult | { error: string } {
  const menu = findMenu(menuCode)
  if (!menu) return { error: `Menú "${menuCode}" no encontrado` }

  const subtotal_menu = menu.price * personas

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

  const total = subtotal_menu + subtotal_extras
  const deposit = Math.round(total * DEPOSIT_PERCENTAGE * 100) / 100

  return {
    menu,
    personas,
    subtotal_menu,
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
