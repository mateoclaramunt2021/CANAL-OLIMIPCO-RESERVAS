// ─── Generador de resumen HTML de selección de platos ────────────────────────
//
// Función reutilizable: la usa el API /api/menu-selection/summary
// y también el POST de /api/menu-selection al finalizar.

import { supabaseAdmin } from '@/lib/supabase'
import { findMenu, getMenuChoices } from '@/core/menus'

export interface DishSummaryResult {
  html: string
  summary: {
    reservation_number: string
    customer_name: string
    fecha: string
    personas: number
    menu_name: string
    counts: Record<string, Record<string, number>>
    allergies: string[]
    total_selections: number
  }
}

export async function generateDishSummary(reservationId: string): Promise<DishSummaryResult | null> {
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, reservation_number, customer_name, customer_phone, fecha, hora_inicio, personas, menu_code, event_type')
    .eq('id', reservationId)
    .single()

  if (!reservation) return null

  const { data: selections } = await supabaseAdmin
    .from('menu_selections')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('guest_number', { ascending: true })

  if (!selections || selections.length === 0) return null

  const menu = findMenu(reservation.menu_code || '')
  const choices = getMenuChoices(reservation.menu_code || '')

  // Build summary counts
  const counts: Record<string, Record<string, number>> = {
    first_course: {},
    second_course: {},
    dessert: {},
  }

  const allergiesList: string[] = []

  for (const sel of selections) {
    if (sel.first_course) {
      counts.first_course[sel.first_course] = (counts.first_course[sel.first_course] || 0) + 1
    }
    if (sel.second_course) {
      counts.second_course[sel.second_course] = (counts.second_course[sel.second_course] || 0) + 1
    }
    if (sel.dessert) {
      counts.dessert[sel.dessert] = (counts.dessert[sel.dessert] || 0) + 1
    }
    if (sel.allergies && sel.allergies.trim()) {
      allergiesList.push(`${sel.guest_name || `Comensal ${sel.guest_number}`}: ${sel.allergies}`)
    }
  }

  // Helper: resolve dish id → name
  const dishName = (course: string, id: string): string => {
    if (!choices) return id
    const courseChoices = choices[course as keyof typeof choices]
    if (!courseChoices) return id
    const dish = courseChoices.find((d: any) => d.id === id)
    return dish ? dish.name : id
  }

  const formatDate = (f: string) => {
    const [y, m, d] = f.split('-')
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
  }

  const refDisplay = reservation.reservation_number || reservation.id.substring(0, 8)

  // ── Build HTML ──
  let html = `
    <h2 style="color:#B08D57;margin:0 0 15px;">🍽️ Selección de Platos — ${refDisplay}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;border-radius:8px;padding:16px;margin:0 0 20px;border:1px solid #e8e2d6;">
      <tr><td style="padding:8px 16px;">
        <p style="margin:4px 0;color:#1A0F05;">👤 <strong>${reservation.customer_name}</strong></p>
        <p style="margin:4px 0;color:#1A0F05;">📅 ${formatDate(reservation.fecha)} · ${reservation.hora_inicio}h</p>
        <p style="margin:4px 0;color:#1A0F05;">👥 ${reservation.personas} comensales</p>
        <p style="margin:4px 0;color:#1A0F05;">🍽️ ${menu?.name || reservation.menu_code}</p>
        ${reservation.customer_phone ? `<p style="margin:4px 0;color:#1A0F05;">📱 ${reservation.customer_phone}</p>` : ''}
      </td></tr>
    </table>
  `

  // ── Summary counts ──
  html += `<h3 style="color:#C4724E;margin:0 0 10px;">📊 Resumen de Cantidades</h3>`
  html += `<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">`

  if (choices?.first_course && Object.keys(counts.first_course).length > 0) {
    html += `<tr style="background:#B08D57;color:#fff;"><td colspan="2" style="padding:8px 12px;font-weight:700;border-radius:6px 6px 0 0;">🥗 Primer Plato</td></tr>`
    for (const [id, count] of Object.entries(counts.first_course)) {
      html += `<tr style="border-bottom:1px solid #e8e2d6;"><td style="padding:8px 12px;color:#1A0F05;">${dishName('first_course', id)}</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:#B08D57;">${count}</td></tr>`
    }
  }

  if (choices?.second_course && Object.keys(counts.second_course).length > 0) {
    html += `<tr style="background:#C4724E;color:#fff;"><td colspan="2" style="padding:8px 12px;font-weight:700;">🍽️ Segundo Plato</td></tr>`
    for (const [id, count] of Object.entries(counts.second_course)) {
      html += `<tr style="border-bottom:1px solid #e8e2d6;"><td style="padding:8px 12px;color:#1A0F05;">${dishName('second_course', id)}</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:#C4724E;">${count}</td></tr>`
    }
  }

  if (choices?.dessert && Object.keys(counts.dessert).length > 0) {
    html += `<tr style="background:#6b9080;color:#fff;"><td colspan="2" style="padding:8px 12px;font-weight:700;">🍰 Postre</td></tr>`
    for (const [id, count] of Object.entries(counts.dessert)) {
      html += `<tr style="border-bottom:1px solid #e8e2d6;"><td style="padding:8px 12px;color:#1A0F05;">${dishName('dessert', id)}</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:#6b9080;">${count}</td></tr>`
    }
  }

  html += `</table>`

  // ── Detail per guest ──
  html += `<h3 style="color:#C4724E;margin:0 0 10px;">👥 Detalle por Comensal</h3>`
  html += `<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;font-size:13px;">`
  html += `<tr style="background:#1A0F05;color:#fff;">`
  html += `<th style="padding:8px;text-align:left;">Nº</th>`
  html += `<th style="padding:8px;text-align:left;">Nombre</th>`
  if (choices?.first_course) html += `<th style="padding:8px;text-align:left;">Primero</th>`
  html += `<th style="padding:8px;text-align:left;">Segundo</th>`
  html += `<th style="padding:8px;text-align:left;">Postre</th>`
  html += `<th style="padding:8px;text-align:left;">Alergias</th>`
  html += `</tr>`

  for (const sel of selections) {
    const bgColor = sel.guest_number % 2 === 0 ? '#f5f3ee' : '#ffffff'
    html += `<tr style="background:${bgColor};border-bottom:1px solid #e8e2d6;">`
    html += `<td style="padding:6px 8px;">${sel.guest_number}</td>`
    html += `<td style="padding:6px 8px;">${sel.guest_name || '-'}</td>`
    if (choices?.first_course) html += `<td style="padding:6px 8px;">${sel.first_course ? dishName('first_course', sel.first_course) : '-'}</td>`
    html += `<td style="padding:6px 8px;">${sel.second_course ? dishName('second_course', sel.second_course) : '-'}</td>`
    html += `<td style="padding:6px 8px;">${sel.dessert ? dishName('dessert', sel.dessert) : '-'}</td>`
    html += `<td style="padding:6px 8px;${sel.allergies ? 'color:#c0392b;font-weight:700;' : ''}">${sel.allergies || '-'}</td>`
    html += `</tr>`
  }

  html += `</table>`

  // ── Allergies highlight ──
  if (allergiesList.length > 0) {
    html += `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;">`
    html += `<p style="color:#c0392b;font-weight:700;margin:0 0 8px;">⚠️ ALERGIAS E INTOLERANCIAS</p>`
    for (const a of allergiesList) {
      html += `<p style="color:#991b1b;margin:2px 0;">• ${a}</p>`
    }
    html += `</div>`
  }

  return {
    html,
    summary: {
      reservation_number: refDisplay,
      customer_name: reservation.customer_name,
      fecha: reservation.fecha,
      personas: reservation.personas,
      menu_name: menu?.name || reservation.menu_code,
      counts,
      allergies: allergiesList,
      total_selections: selections.length,
    },
  }
}
