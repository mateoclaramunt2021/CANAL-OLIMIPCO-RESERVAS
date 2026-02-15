// ─── Motor de Conversación WhatsApp — Canal Olímpico ────────────────────────
//
// Máquina de estados por teléfono. Cada cliente tiene un "paso" guardado
// en Supabase (tabla conversations) y se va avanzando con cada mensaje.
//
// Flujo RESERVA_NORMAL:
//   inicio → fecha → hora → personas → zona → nombre → confirmar → FIN
//
// Flujo GRUPO/EVENTO:
//   inicio → tipo_evento → fecha → hora → personas → menu → nombre → confirmar
//   → se crea reserva + link Stripe → FIN
//
// Otros: consultar, cancelar, hablar con humano

import { supabaseAdmin } from '@/lib/supabase'
import { sendText, sendButtons } from '@/lib/whatsapp'
import { MENUS, getMenusForEvent, checkMinAdvance, calculateQuote } from '@/core/menus'
import { findBestTable } from '@/core/tables'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ConversationState {
  phone: string
  step: string
  data: Record<string, any>
  updated_at: string
}

type StepHandler = (phone: string, message: string, state: ConversationState) => Promise<void>

// ─── Timeout: si la conversación lleva más de 30 min sin actividad, reiniciar ─

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos

// ─── Cargar/guardar estado ───────────────────────────────────────────────────

async function getState(phone: string): Promise<ConversationState | null> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!data) return null

  // Check timeout
  const updated = new Date(data.updated_at).getTime()
  if (Date.now() - updated > CONVERSATION_TIMEOUT_MS) {
    await deleteState(phone)
    return null
  }

  return {
    phone: data.phone,
    step: data.step,
    data: typeof data.data === 'string' ? JSON.parse(data.data) : (data.data || {}),
    updated_at: data.updated_at,
  }
}

async function saveState(phone: string, step: string, data: Record<string, any>): Promise<void> {
  await supabaseAdmin
    .from('conversations')
    .upsert({
      phone,
      step,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone' })
}

async function deleteState(phone: string): Promise<void> {
  await supabaseAdmin
    .from('conversations')
    .delete()
    .eq('phone', phone)
}

// ─── Punto de entrada principal ──────────────────────────────────────────────

export async function handleIncomingMessage(phone: string, rawMessage: string): Promise<void> {
  const message = rawMessage.trim().toLowerCase()

  // Comando global: cancelar conversación
  if (message === 'salir' || message === 'cancelar conversación' || message === 'reset') {
    await deleteState(phone)
    await sendText(phone, '👋 Conversación reiniciada. Escribe *hola* cuando quieras empezar.')
    return
  }

  // Cargar estado actual
  let state = await getState(phone)

  if (!state) {
    // Nueva conversación
    await handleWelcome(phone, message)
    return
  }

  // Ejecutar el handler del paso actual
  const handler = STEP_HANDLERS[state.step]
  if (handler) {
    await handler(phone, rawMessage.trim(), state)
  } else {
    // Paso desconocido → reiniciar
    await deleteState(phone)
    await handleWelcome(phone, message)
  }
}

// ─── PASO: Bienvenida ───────────────────────────────────────────────────────

async function handleWelcome(phone: string, message: string): Promise<void> {
  await saveState(phone, 'elegir_accion', {})

  await sendButtons(phone,
    '¡Hola! 👋 Soy el asistente del *Canal Olímpico Castelldefels*.\n\n¿Qué te gustaría hacer?',
    [
      { id: 'reservar', title: '🍽️ Reservar' },
      { id: 'consultar', title: '📅 Consultar' },
      { id: 'cancelar_reserva', title: '❌ Cancelar reserva' },
    ],
    'Canal Olímpico',
    'Escribe "salir" en cualquier momento para reiniciar'
  )
}

// ─── PASO: Elegir acción ────────────────────────────────────────────────────

async function handleElegirAccion(phone: string, message: string, state: ConversationState): Promise<void> {
  const msg = message.toLowerCase()

  if (msg === 'reservar' || msg === '1' || msg.includes('reservar') || msg.includes('reserva')) {
    await saveState(phone, 'elegir_tipo', {})
    await sendButtons(phone,
      '¿Qué tipo de reserva necesitas?',
      [
        { id: 'RESERVA_NORMAL', title: '🪑 Mesa normal' },
        { id: 'EVENTO', title: '🎉 Grupo/Evento' },
      ],
      'Tipo de reserva'
    )
    return
  }

  if (msg === 'consultar' || msg === '2' || msg.includes('consultar') || msg.includes('disponibilidad')) {
    await saveState(phone, 'consultar_fecha', {})
    await sendText(phone, '¿Para qué fecha quieres consultar disponibilidad?\n\nEscribe la fecha en formato *DD/MM/AAAA*\n(ej: 20/03/2026)')
    return
  }

  if (msg === 'cancelar_reserva' || msg === '3' || msg.includes('cancelar')) {
    await saveState(phone, 'cancelar_ref', {})
    await sendText(phone, '¿Cuál es la referencia de tu reserva?\n\n(Son los primeros 8 caracteres que recibiste al confirmar)')
    return
  }

  // Si llega "humano" o "persona"
  if (msg.includes('humano') || msg.includes('persona') || msg.includes('hablar')) {
    await deleteState(phone)
    await sendText(phone, '📞 Para hablar con una persona, llama a:\n\n*938.587.088* o *629.358.562*\n\nO escribe a: iguanacanalolimpic@outlook.com')
    return
  }

  // No entendido → repetir
  await sendText(phone, 'No he entendido. Por favor elige una opción:\n\n1️⃣ *Reservar*\n2️⃣ *Consultar* disponibilidad\n3️⃣ *Cancelar* reserva\n\nO escribe *humano* para hablar con una persona.')
}

// ─── PASO: Elegir tipo (normal vs evento) ────────────────────────────────────

async function handleElegirTipo(phone: string, message: string, state: ConversationState): Promise<void> {
  const msg = message.toLowerCase()

  if (msg === 'reserva_normal' || msg.includes('normal') || msg.includes('mesa') || msg === '1') {
    await saveState(phone, 'pedir_fecha', { event_type: 'RESERVA_NORMAL' })
    await sendText(phone, '📅 ¿Para qué *fecha*?\n\nFormato: DD/MM/AAAA (ej: 20/03/2026)')
    return
  }

  if (msg === 'evento' || msg.includes('grupo') || msg.includes('evento') || msg.includes('fiesta') || msg === '2') {
    await saveState(phone, 'elegir_evento', {})
    await sendButtons(phone,
      '¿Qué tipo de evento?',
      [
        { id: 'INFANTIL_CUMPLE', title: '🎂 Infantil' },
        { id: 'GRUPO_SENTADO', title: '🍽️ Grupo sentado' },
        { id: 'GRUPO_PICA_PICA', title: '🥘 Pica-pica' },
      ],
      'Tipo de evento'
    )
    return
  }

  await sendText(phone, 'Elige una opción:\n\n1️⃣ *Mesa normal* (restaurante)\n2️⃣ *Grupo/Evento* (cumpleaños, grupos, nocturna)')
}

// ─── PASO: Elegir tipo de evento ────────────────────────────────────────────

async function handleElegirEvento(phone: string, message: string, state: ConversationState): Promise<void> {
  const msg = message.toLowerCase()
  let eventType: string | null = null

  if (msg === 'infantil_cumple' || msg.includes('infantil') || msg.includes('cumple') || msg === '1') {
    eventType = 'INFANTIL_CUMPLE'
  } else if (msg === 'grupo_sentado' || msg.includes('sentado') || msg === '2') {
    eventType = 'GRUPO_SENTADO'
  } else if (msg === 'grupo_pica_pica' || msg.includes('pica') || msg === '3') {
    eventType = 'GRUPO_PICA_PICA'
  } else if (msg.includes('nocturna') || msg.includes('exclusiva')) {
    eventType = 'NOCTURNA_EXCLUSIVA'
  }

  if (!eventType) {
    await sendText(phone, 'Elige una opción:\n\n1️⃣ *Infantil* (cumpleaños)\n2️⃣ *Grupo sentado*\n3️⃣ *Pica-pica*\n\nO escribe *nocturna* para evento nocturno exclusivo.')
    return
  }

  await saveState(phone, 'pedir_fecha', { event_type: eventType })
  await sendText(phone, '📅 ¿Para qué *fecha*?\n\nFormato: DD/MM/AAAA (ej: 20/03/2026)')
}

// ─── PASO: Pedir fecha ──────────────────────────────────────────────────────

async function handlePedirFecha(phone: string, message: string, state: ConversationState): Promise<void> {
  const fecha = parseDate(message)
  if (!fecha) {
    await sendText(phone, '❌ Formato de fecha no válido.\n\nEscribe en formato *DD/MM/AAAA*\n(ej: 20/03/2026)')
    return
  }

  // Verificar antelación mínima de 5 días
  const advance = checkMinAdvance(fecha)
  if (!advance.ok) {
    await sendText(phone, `❌ ${advance.message}`)
    return
  }

  await saveState(phone, 'pedir_hora', { ...state.data, fecha })
  await sendText(phone, '🕐 ¿A qué *hora*?\n\nFormato: HH:MM (ej: 14:00, 21:30)')
}

// ─── PASO: Pedir hora ───────────────────────────────────────────────────────

async function handlePedirHora(phone: string, message: string, state: ConversationState): Promise<void> {
  const hora = parseTime(message)
  if (!hora) {
    await sendText(phone, '❌ Formato de hora no válido.\n\nEscribe en formato *HH:MM* (ej: 14:00)')
    return
  }

  // Reglas horarias
  if (state.data.event_type === 'INFANTIL_CUMPLE') {
    const [h] = hora.split(':').map(Number)
    if (h >= 21) {
      await sendText(phone, '❌ Los eventos infantiles no se permiten después de las 20:30.\n\nElige otra hora:')
      return
    }
  }

  if (state.data.event_type === 'NOCTURNA_EXCLUSIVA') {
    const [h, m] = hora.split(':').map(Number)
    if (h < 21 || (h === 21 && m < 30)) {
      await sendText(phone, '❌ Los eventos nocturnos exclusivos solo están disponibles a partir de las 21:30.\n\nElige otra hora:')
      return
    }
  }

  await saveState(phone, 'pedir_personas', { ...state.data, hora })
  await sendText(phone, '👥 ¿*Cuántas personas*?')
}

// ─── PASO: Pedir personas ───────────────────────────────────────────────────

async function handlePedirPersonas(phone: string, message: string, state: ConversationState): Promise<void> {
  const personas = parseInt(message, 10)
  if (isNaN(personas) || personas < 1) {
    await sendText(phone, '❌ Indica un número válido de personas (ej: 4)')
    return
  }

  if (state.data.event_type === 'RESERVA_NORMAL') {
    // Para reserva normal → preguntar zona
    await saveState(phone, 'pedir_zona', { ...state.data, personas })
    await sendButtons(phone,
      `¿Prefieres sentarte *fuera* o *dentro*?`,
      [
        { id: 'fuera', title: '☀️ Fuera' },
        { id: 'dentro', title: '🏠 Dentro' },
        { id: 'sin_preferencia', title: '🤷 Da igual' },
      ],
    )
  } else {
    // Para eventos → preguntar menú
    const menus = getMenusForEvent(state.data.event_type)
    if (menus.length === 0) {
      await sendText(phone, '❌ Error interno: no hay menús para este tipo de evento. Contacta con 938.587.088')
      await deleteState(phone)
      return
    }

    await saveState(phone, 'pedir_menu', { ...state.data, personas })

    let menuText = '🍽️ ¿Qué *menú* prefieres?\n\n'
    menus.forEach((m, i) => {
      menuText += `*${i + 1}.* ${m.name}\n${m.description}\n\n`
    })
    menuText += 'Escribe el *número* del menú que prefieres.'

    await sendText(phone, menuText)
  }
}

// ─── PASO: Pedir zona (solo RESERVA_NORMAL) ─────────────────────────────────

async function handlePedirZona(phone: string, message: string, state: ConversationState): Promise<void> {
  const msg = message.toLowerCase()
  let zona: 'fuera' | 'dentro' | undefined

  if (msg.includes('fuera') || msg === '1') zona = 'fuera'
  else if (msg.includes('dentro') || msg === '2') zona = 'dentro'
  // Si dice "da igual" o "3" → sin preferencia

  await saveState(phone, 'pedir_nombre', { ...state.data, zona })
  await sendText(phone, '👤 ¿A *nombre* de quién la reserva?')
}

// ─── PASO: Pedir menú (eventos) ─────────────────────────────────────────────

async function handlePedirMenu(phone: string, message: string, state: ConversationState): Promise<void> {
  const menus = getMenusForEvent(state.data.event_type)
  const idx = parseInt(message, 10) - 1

  if (isNaN(idx) || idx < 0 || idx >= menus.length) {
    await sendText(phone, `❌ Elige un número del 1 al ${menus.length}`)
    return
  }

  const selectedMenu = menus[idx]
  await saveState(phone, 'pedir_nombre', { ...state.data, menu_code: selectedMenu.code })

  // Mostrar resumen del menú elegido
  const quote = calculateQuote(selectedMenu.code, state.data.personas)
  if ('error' in quote) {
    await sendText(phone, '❌ Error calculando precio. Contacta con 938.587.088')
    return
  }

  await sendText(phone,
    `✅ *${selectedMenu.name}*\n` +
    `👥 ${state.data.personas} personas × ${selectedMenu.price}€ = *${quote.total}€*\n` +
    `💳 Señal 40%: *${quote.deposit}€*\n\n` +
    `👤 ¿A *nombre* de quién la reserva?`
  )
}

// ─── PASO: Pedir nombre ─────────────────────────────────────────────────────

async function handlePedirNombre(phone: string, message: string, state: ConversationState): Promise<void> {
  if (message.length < 2) {
    await sendText(phone, '❌ Escribe un nombre válido.')
    return
  }

  await saveState(phone, 'confirmar', { ...state.data, nombre: message })

  // Construir resumen
  const d = state.data
  let resumen = `📋 *Resumen de tu reserva:*\n\n`
  resumen += `👤 *${message}*\n`
  resumen += `📅 ${formatDateEs(d.fecha)}\n`
  resumen += `🕐 ${d.hora}h\n`
  resumen += `👥 ${d.personas} personas\n`

  if (d.event_type === 'RESERVA_NORMAL') {
    resumen += `🪑 Mesa de restaurante${d.zona ? ` (zona ${d.zona})` : ''}\n`
  } else {
    const menu = MENUS.find(m => m.code === d.menu_code)
    if (menu) {
      const quote = calculateQuote(d.menu_code, d.personas)
      if (!('error' in quote)) {
        resumen += `🎉 ${getEventTypeLabel(d.event_type)}\n`
        resumen += `🍽️ ${menu.name}\n`
        resumen += `💰 Total: ${quote.total}€\n`
        resumen += `💳 Señal 40%: ${quote.deposit}€\n`
      }
    }
  }

  resumen += `\n¿Confirmas la reserva?`

  await sendButtons(phone, resumen, [
    { id: 'confirmar_si', title: '✅ Confirmar' },
    { id: 'confirmar_no', title: '❌ Cancelar' },
  ])
}

// ─── PASO: Confirmar ────────────────────────────────────────────────────────

async function handleConfirmar(phone: string, message: string, state: ConversationState): Promise<void> {
  const msg = message.toLowerCase()

  if (msg === 'confirmar_no' || msg.includes('no') || msg.includes('cancelar')) {
    await deleteState(phone)
    await sendText(phone, '❌ Reserva cancelada. Si quieres empezar de nuevo, escribe *hola*.')
    return
  }

  if (msg !== 'confirmar_si' && !msg.includes('si') && !msg.includes('sí') && !msg.includes('confirmar') && !msg.includes('ok')) {
    await sendText(phone, 'Escribe *sí* para confirmar o *no* para cancelar.')
    return
  }

  const d = state.data

  try {
    // Llamar a la API interna para crear la reserva
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: d.nombre,
        telefono: phone,
        fecha: d.fecha,
        hora: d.hora,
        personas: d.personas,
        event_type: d.event_type,
        zona: d.zona || undefined,
        menu_code: d.menu_code || undefined,
      }),
    })

    const result = await res.json()

    if (!result.ok) {
      await sendText(phone, `❌ No se pudo crear la reserva: ${result.error}\n\nEscribe *hola* para intentar de nuevo.`)
      await deleteState(phone)
      return
    }

    // La lógica de envío de confirmación/link de pago está en el POST de reservations
    // Solo limpiar la conversación
    await deleteState(phone)

    // Si es reserva normal, confirmar aquí (el POST ya envía el WhatsApp)
    if (d.event_type === 'RESERVA_NORMAL') {
      await sendText(phone, '✅ ¡Reserva creada! En unos segundos recibirás la confirmación.')
    } else {
      await sendText(phone, '✅ ¡Reserva creada! En unos segundos recibirás los detalles y el enlace de pago.')
    }

  } catch (err) {
    console.error('[conversation] Error creating reservation:', err)
    await sendText(phone, '❌ Error al procesar la reserva. Por favor llama al 938.587.088')
    await deleteState(phone)
  }
}

// ─── PASO: Consultar fecha ──────────────────────────────────────────────────

async function handleConsultarFecha(phone: string, message: string, state: ConversationState): Promise<void> {
  const fecha = parseDate(message)
  if (!fecha) {
    await sendText(phone, '❌ Formato no válido. Escribe la fecha en formato *DD/MM/AAAA*')
    return
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const res = await fetch(`${baseUrl}/api/tables?fecha=${fecha}&hora=14:00`)
    const data = await res.json()

    if (data.ok) {
      await sendText(phone,
        `📅 Disponibilidad para el ${formatDateEs(fecha)}:\n\n` +
        `🪑 Mesas libres (mediodía): ${data.libres}/${data.total}\n\n` +
        `Para más detalle, indica una *hora concreta* o llama al 938.587.088`
      )
    } else {
      await sendText(phone, '❌ No se pudo consultar. Intenta más tarde o llama al 938.587.088')
    }
  } catch {
    await sendText(phone, '❌ Error al consultar. Llama al 938.587.088')
  }

  await deleteState(phone)
}

// ─── PASO: Cancelar reserva ─────────────────────────────────────────────────

async function handleCancelarRef(phone: string, message: string, state: ConversationState): Promise<void> {
  const ref = message.trim()

  if (ref.length < 4) {
    await sendText(phone, '❌ Referencia no válida. Escribe la referencia de tu reserva.')
    return
  }

  await sendText(phone,
    `Para cancelar la reserva *${ref}*, por favor contacta directamente:\n\n` +
    `📞 *938.587.088* o *629.358.562*\n` +
    `📧 iguanacanalolimpic@outlook.com\n\n` +
    `📌 Recuerda: la cancelación debe comunicarse con 72h de antelación.`
  )
  await deleteState(phone)
}

// ─── Registro de handlers ───────────────────────────────────────────────────

const STEP_HANDLERS: Record<string, StepHandler> = {
  'elegir_accion': handleElegirAccion,
  'elegir_tipo': handleElegirTipo,
  'elegir_evento': handleElegirEvento,
  'pedir_fecha': handlePedirFecha,
  'pedir_hora': handlePedirHora,
  'pedir_personas': handlePedirPersonas,
  'pedir_zona': handlePedirZona,
  'pedir_menu': handlePedirMenu,
  'pedir_nombre': handlePedirNombre,
  'confirmar': handleConfirmar,
  'consultar_fecha': handleConsultarFecha,
  'cancelar_ref': handleCancelarRef,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parsear fecha DD/MM/AAAA → YYYY-MM-DD */
function parseDate(input: string): string | null {
  // Soportar DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA
  const clean = input.replace(/[.\-]/g, '/')
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) {
    // También soportar AAAA-MM-DD directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
    return null
  }

  const d = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const y = parseInt(match[3], 10)

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2026) return null

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Parsear hora HH:MM o H:MM */
function parseTime(input: string): string | null {
  const clean = input.replace(/[.\-h]/gi, ':').replace(/\s/g, '')
  const match = clean.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)

  if (h < 0 || h > 23 || m < 0 || m > 59) return null

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatDateEs(fecha: string): string {
  const [y, m, d] = fecha.split('-')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'RESERVA_NORMAL': 'Mesa de restaurante',
    'INFANTIL_CUMPLE': 'Cumpleaños infantil',
    'GRUPO_SENTADO': 'Grupo sentado',
    'GRUPO_PICA_PICA': 'Grupo pica-pica',
    'NOCTURNA_EXCLUSIVA': 'Evento nocturno exclusivo',
  }
  return labels[type] || type
}
