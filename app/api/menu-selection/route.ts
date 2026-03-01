import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMenuChoices, menuRequiresSelection, findMenu } from '@/core/menus'
import { sendDishSelectionConfirmation, sendDishSummaryToRestaurant } from '@/lib/email'

// ─── GET: Cargar datos de selección de platos por token ─────────────────────
// Query: ?token=abc123
// → Devuelve: reserva + menú + opciones + selecciones existentes

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  // Buscar reserva por token
  const { data: reservation, error: resErr } = await supabaseAdmin
    .from('reservations')
    .select('id, reservation_number, customer_name, customer_email, event_type, fecha, hora_inicio, personas, menu_code, dishes_status, dishes_deadline, status')
    .eq('dish_selection_token', token)
    .single()

  if (resErr || !reservation) {
    return NextResponse.json({ error: 'Enlace no válido o reserva no encontrada' }, { status: 404 })
  }

  // Verificar que la reserva está confirmada
  if (reservation.status !== 'CONFIRMED') {
    return NextResponse.json({ error: 'La reserva no está confirmada' }, { status: 400 })
  }

  // Verificar que el menú requiere selección
  const menuCode = reservation.menu_code
  if (!menuCode || !menuRequiresSelection(menuCode)) {
    return NextResponse.json({ error: 'Este menú no requiere selección de platos' }, { status: 400 })
  }

  // Verificar deadline
  if (reservation.dishes_deadline) {
    const deadline = new Date(reservation.dishes_deadline + 'T23:59:59')
    if (new Date() > deadline) {
      return NextResponse.json({ error: 'El plazo para seleccionar platos ha expirado. Contacta con el restaurante al 930 347 246.' }, { status: 400 })
    }
  }

  const menu = findMenu(menuCode)
  const choices = getMenuChoices(menuCode)

  // Cargar selecciones existentes
  const { data: selections } = await supabaseAdmin
    .from('menu_selections')
    .select('*')
    .eq('reservation_id', reservation.id)
    .order('guest_number', { ascending: true })

  return NextResponse.json({
    reservation: {
      id: reservation.id,
      reservation_number: reservation.reservation_number,
      customer_name: reservation.customer_name,
      fecha: reservation.fecha,
      hora_inicio: reservation.hora_inicio,
      personas: reservation.personas,
      event_type: reservation.event_type,
      dishes_status: reservation.dishes_status,
      dishes_deadline: reservation.dishes_deadline,
    },
    menu: menu ? { code: menu.code, name: menu.name, price: menu.price, description: menu.description } : null,
    choices,
    selections: selections || [],
  })
}

// ─── POST: Guardar selecciones de platos (parcial o completa) ───────────────
// Body: { token, guests: [{ guest_number, guest_name, first_course, second_course, dessert, allergies }], finalize: boolean }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, guests, finalize } = body

    if (!token || !guests || !Array.isArray(guests)) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Buscar reserva
    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('reservations')
      .select('id, personas, menu_code, dishes_status, dishes_deadline, status, customer_name, customer_email, reservation_number, fecha, hora_inicio')
      .eq('dish_selection_token', token)
      .single()

    if (resErr || !reservation) {
      return NextResponse.json({ error: 'Enlace no válido' }, { status: 404 })
    }

    if (reservation.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'La reserva no está confirmada' }, { status: 400 })
    }

    if (reservation.dishes_status === 'completed') {
      return NextResponse.json({ error: 'La selección de platos ya está completada' }, { status: 400 })
    }

    // Verificar deadline
    if (reservation.dishes_deadline) {
      const deadline = new Date(reservation.dishes_deadline + 'T23:59:59')
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'El plazo ha expirado' }, { status: 400 })
      }
    }

    const menuCode = reservation.menu_code
    if (!menuCode || !menuRequiresSelection(menuCode)) {
      return NextResponse.json({ error: 'Este menú no requiere selección' }, { status: 400 })
    }

    const choices = getMenuChoices(menuCode)!

    // Validar cada guest
    for (const guest of guests) {
      if (guest.guest_number < 1 || guest.guest_number > reservation.personas) {
        return NextResponse.json({ error: `Número de comensal inválido: ${guest.guest_number}` }, { status: 400 })
      }

      // Validate dish choices against menu options
      if (finalize) {
        if (choices.first_course && !choices.first_course.some(d => d.id === guest.first_course)) {
          return NextResponse.json({ error: `Primer plato inválido para comensal ${guest.guest_number}` }, { status: 400 })
        }
        if (choices.second_course && !choices.second_course.some(d => d.id === guest.second_course)) {
          return NextResponse.json({ error: `Segundo plato inválido para comensal ${guest.guest_number}` }, { status: 400 })
        }
        if (choices.dessert && !choices.dessert.some(d => d.id === guest.dessert)) {
          return NextResponse.json({ error: `Postre inválido para comensal ${guest.guest_number}` }, { status: 400 })
        }
      }
    }

    // Upsert selections
    for (const guest of guests) {
      const { error } = await supabaseAdmin
        .from('menu_selections')
        .upsert({
          reservation_id: reservation.id,
          guest_number: guest.guest_number,
          guest_name: guest.guest_name || null,
          first_course: guest.first_course || null,
          second_course: guest.second_course || null,
          dessert: guest.dessert || null,
          allergies: guest.allergies || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'reservation_id,guest_number',
        })

      if (error) {
        console.error('[menu-selection] Upsert error:', error)
        return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
      }
    }

    // Si finalize → verificar que todos los comensales tienen selección completa
    if (finalize) {
      const { data: allSelections } = await supabaseAdmin
        .from('menu_selections')
        .select('*')
        .eq('reservation_id', reservation.id)

      const completed = allSelections?.length === reservation.personas
      if (!completed) {
        return NextResponse.json({
          error: `Faltan selecciones. Tienes ${allSelections?.length || 0} de ${reservation.personas} comensales.`,
        }, { status: 400 })
      }

      // Marcar como completado
      await supabaseAdmin
        .from('reservations')
        .update({ dishes_status: 'completed' })
        .eq('id', reservation.id)

      // Send confirmation email to customer
      if (reservation.customer_email) {
        sendDishSelectionConfirmation(reservation.customer_email, {
          nombre: reservation.customer_name || 'Cliente',
          fecha: reservation.fecha,
          personas: reservation.personas,
          reservationNumber: reservation.reservation_number || reservation.id.substring(0, 8),
          summaryHtml: '',
        }).catch(err => console.error('[menu-selection] Email confirmation error:', err))
      }

      // Fetch summary HTML and send to restaurant
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://reservascanalolimpico.netlify.app'
        const summaryRes = await fetch(`${siteUrl}/api/menu-selection/summary?reservation_id=${reservation.id}`)
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          sendDishSummaryToRestaurant({
            reservationNumber: reservation.reservation_number || reservation.id.substring(0, 8),
            customerName: reservation.customer_name || 'Cliente',
            fecha: reservation.fecha,
            personas: reservation.personas,
            summaryHtml: summaryData.html,
          }).catch(err => console.error('[menu-selection] Restaurant email error:', err))
        }
      } catch (err) {
        console.error('[menu-selection] Summary fetch error:', err)
      }

      return NextResponse.json({
        ok: true,
        finalized: true,
        message: 'Selección de platos completada. ¡Gracias!',
        reservation_id: reservation.id,
      })
    }

    return NextResponse.json({
      ok: true,
      finalized: false,
      message: 'Selección guardada como borrador',
    })
  } catch (err) {
    console.error('[menu-selection] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
