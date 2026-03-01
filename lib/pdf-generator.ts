// ─── Generador de PDF de selección de platos ─────────────────────────────────
//
// Usa pdf-lib (100% JS, sin dependencias de archivos) para generar un PDF
// limpio y profesional para imprimir en cocina.
// Se usa en: API /api/menu-selection/pdf y como adjunto en email al restaurante.

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import { supabaseAdmin } from '@/lib/supabase'
import { findMenu, getMenuChoices } from '@/core/menus'

// ─── Colores de marca (valores 0-1 para pdf-lib) ────────────────────────────
const DORADO = rgb(176 / 255, 141 / 255, 87 / 255)
const TERRACOTA = rgb(196 / 255, 114 / 255, 78 / 255)
const INK = rgb(26 / 255, 15 / 255, 5 / 255)
const GRIS = rgb(120 / 255, 120 / 255, 120 / 255)
const ROJO = rgb(192 / 255, 57 / 255, 43 / 255)
const VERDE = rgb(107 / 255, 144 / 255, 128 / 255)
const WHITE = rgb(1, 1, 1)
const BG_LIGHT = rgb(245 / 255, 243 / 255, 238 / 255)
const BG_RED = rgb(254 / 255, 242 / 255, 242 / 255)
const BORDER_RED = rgb(252 / 255, 165 / 255, 165 / 255)
const LINE_COLOR = rgb(232 / 255, 226 / 255, 214 / 255)

export async function generateDishPdf(reservationId: string): Promise<Buffer | null> {
  // ── Fetch data ──
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
  const refDisplay = reservation.reservation_number || reservation.id.substring(0, 8)

  const dishName = (course: string, id: string): string => {
    if (!choices) return id
    const courseChoices = choices[course as keyof typeof choices]
    if (!courseChoices) return id
    const dish = (courseChoices as { id: string; name: string }[]).find(d => d.id === id)
    return dish ? dish.name : id
  }

  const formatDate = (f: string) => {
    const [y, m, d] = f.split('-')
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
  }

  // ── Build counts ──
  const counts: Record<string, Record<string, number>> = {
    first_course: {},
    second_course: {},
    dessert: {},
  }
  const allergiesList: { guest: string; text: string }[] = []

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
      allergiesList.push({
        guest: sel.guest_name || `Comensal ${sel.guest_number}`,
        text: sel.allergies,
      })
    }
  }

  // ── Create PDF with pdf-lib ──
  const doc = await PDFDocument.create()
  doc.setTitle(`Platos - ${refDisplay}`)
  doc.setAuthor('Canal Olimpico')
  doc.setSubject(`Seleccion de platos para reserva ${refDisplay}`)

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const A4_W = 595.28
  const A4_H = 841.89
  const MARGIN = 50
  const pageW = A4_W - MARGIN * 2

  let page = doc.addPage([A4_W, A4_H])
  let curY = A4_H - 40 // Start from top (pdf-lib y=0 is bottom)

  // ── Helper: truncate text to fit width ──
  const truncate = (text: string, font: PDFFont, size: number, maxW: number): string => {
    if (font.widthOfTextAtSize(text, size) <= maxW) return text
    let t = text
    while (t.length > 0 && font.widthOfTextAtSize(t + '...', size) > maxW) {
      t = t.slice(0, -1)
    }
    return t + '...'
  }

  // ── Helper: check page space, add new page if needed ──
  const ensureSpace = (needed: number) => {
    if (curY - needed < 40) {
      page = doc.addPage([A4_W, A4_H])
      curY = A4_H - 40
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  HEADER                                                             ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  const titleText = 'Canal Olimpico'
  const titleW = fontBold.widthOfTextAtSize(titleText, 22)
  page.drawText(titleText, {
    x: MARGIN + (pageW - titleW) / 2,
    y: curY,
    size: 22,
    font: fontBold,
    color: DORADO,
  })
  curY -= 18

  const subtitleText = 'Seleccion de Platos para Cocina'
  const subtitleW = fontRegular.widthOfTextAtSize(subtitleText, 10)
  page.drawText(subtitleText, {
    x: MARGIN + (pageW - subtitleW) / 2,
    y: curY,
    size: 10,
    font: fontRegular,
    color: GRIS,
  })
  curY -= 15

  // Dorado line
  page.drawLine({
    start: { x: MARGIN, y: curY },
    end: { x: MARGIN + pageW, y: curY },
    thickness: 2,
    color: DORADO,
  })
  curY -= 20

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  INFO RESERVA                                                       ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  const infoH = 75
  page.drawRectangle({
    x: MARGIN,
    y: curY - infoH,
    width: pageW,
    height: infoH,
    color: BG_LIGHT,
  })

  const infoX = MARGIN + 15
  const col2X = MARGIN + pageW / 2 + 15
  let infoY = curY - 16

  page.drawText(`Reserva: ${refDisplay}`, { x: infoX, y: infoY, size: 11, font: fontBold, color: INK })
  page.drawText(`Fecha: ${formatDate(reservation.fecha)}`, { x: col2X, y: infoY, size: 11, font: fontRegular, color: INK })
  infoY -= 18

  page.drawText(`Cliente: ${reservation.customer_name}`, { x: infoX, y: infoY, size: 11, font: fontRegular, color: INK })
  page.drawText(`Hora: ${reservation.hora_inicio}h`, { x: col2X, y: infoY, size: 11, font: fontRegular, color: INK })
  infoY -= 18

  const menuText = truncate(`Menu: ${menu?.name || reservation.menu_code}`, fontRegular, 11, pageW / 2 - 30)
  page.drawText(menuText, { x: infoX, y: infoY, size: 11, font: fontRegular, color: INK })
  page.drawText(`Comensales: ${reservation.personas}`, { x: col2X, y: infoY, size: 11, font: fontBold, color: INK })

  if (reservation.customer_phone) {
    infoY -= 16
    page.drawText(`Tel: ${reservation.customer_phone}`, { x: infoX, y: infoY, size: 9, font: fontRegular, color: GRIS })
  }

  curY -= infoH + 20

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  RESUMEN DE CANTIDADES                                              ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  page.drawText('RESUMEN DE CANTIDADES', { x: MARGIN, y: curY, size: 14, font: fontBold, color: TERRACOTA })
  curY -= 22

  const drawCountsSection = (title: string, courseKey: string, color: typeof DORADO) => {
    const entries = Object.entries(counts[courseKey])
    if (entries.length === 0) return

    ensureSpace(22 + entries.length * 20 + 5)

    // Header row
    page.drawRectangle({ x: MARGIN, y: curY - 18, width: pageW, height: 22, color })
    page.drawText(title, { x: MARGIN + 10, y: curY - 12, size: 10, font: fontBold, color: WHITE })
    curY -= 22

    for (const [id, count] of entries) {
      page.drawRectangle({ x: MARGIN, y: curY - 16, width: pageW, height: 20, color: WHITE })
      page.drawLine({
        start: { x: MARGIN, y: curY - 16 },
        end: { x: MARGIN + pageW, y: curY - 16 },
        thickness: 0.5,
        color: LINE_COLOR,
      })

      const name = truncate(dishName(courseKey, id), fontRegular, 10, pageW - 80)
      page.drawText(name, { x: MARGIN + 10, y: curY - 11, size: 10, font: fontRegular, color: INK })

      const countStr = String(count)
      const countW = fontBold.widthOfTextAtSize(countStr, 13)
      page.drawText(countStr, { x: MARGIN + pageW - 15 - countW, y: curY - 12, size: 13, font: fontBold, color })
      curY -= 20
    }
  }

  if (choices?.first_course) {
    drawCountsSection('PRIMER PLATO', 'first_course', DORADO)
  }
  drawCountsSection('SEGUNDO PLATO', 'second_course', TERRACOTA)
  drawCountsSection('POSTRE', 'dessert', VERDE)

  curY -= 15

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  ALERGIAS                                                           ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  if (allergiesList.length > 0) {
    const allergyBoxH = 28 + allergiesList.length * 16
    ensureSpace(allergyBoxH + 10)

    page.drawRectangle({ x: MARGIN, y: curY - allergyBoxH, width: pageW, height: allergyBoxH, color: BG_RED })
    page.drawRectangle({
      x: MARGIN, y: curY - allergyBoxH, width: pageW, height: allergyBoxH,
      borderColor: BORDER_RED, borderWidth: 1,
    })

    page.drawText('ALERGIAS E INTOLERANCIAS', {
      x: MARGIN + 10, y: curY - 14, size: 11, font: fontBold, color: ROJO,
    })

    let allergyY = curY - 30
    for (const a of allergiesList) {
      const allergyText = truncate(`- ${a.guest}: ${a.text}`, fontRegular, 9, pageW - 20)
      page.drawText(allergyText, {
        x: MARGIN + 10, y: allergyY, size: 9, font: fontRegular, color: ROJO,
      })
      allergyY -= 16
    }

    curY -= allergyBoxH + 12
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  DETALLE POR COMENSAL                                               ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  ensureSpace(40 + selections.length * 20)

  page.drawText('DETALLE POR COMENSAL', { x: MARGIN, y: curY, size: 14, font: fontBold, color: TERRACOTA })
  curY -= 22

  const hasFirst = !!choices?.first_course
  const cols = hasFirst
    ? [
        { label: 'No', w: 25 },
        { label: 'Nombre', w: 75 },
        { label: 'Primero', w: 110 },
        { label: 'Segundo', w: 110 },
        { label: 'Postre', w: 80 },
        { label: 'Alergias', w: pageW - 25 - 75 - 110 - 110 - 80 },
      ]
    : [
        { label: 'No', w: 30 },
        { label: 'Nombre', w: 100 },
        { label: 'Segundo', w: 150 },
        { label: 'Postre', w: 100 },
        { label: 'Alergias', w: pageW - 30 - 100 - 150 - 100 },
      ]

  const rowH = 20

  // Header row
  page.drawRectangle({ x: MARGIN, y: curY - rowH + 4, width: pageW, height: rowH, color: INK })

  let colX = MARGIN
  for (const col of cols) {
    page.drawText(col.label, { x: colX + 4, y: curY - 10, size: 8, font: fontBold, color: WHITE })
    colX += col.w
  }
  curY -= rowH

  // Data rows
  for (const sel of selections) {
    ensureSpace(rowH + 5)

    const bg = sel.guest_number % 2 === 0 ? BG_LIGHT : WHITE
    page.drawRectangle({ x: MARGIN, y: curY - rowH + 4, width: pageW, height: rowH, color: bg })
    page.drawLine({
      start: { x: MARGIN, y: curY - rowH + 4 },
      end: { x: MARGIN + pageW, y: curY - rowH + 4 },
      thickness: 0.3,
      color: LINE_COLOR,
    })

    const rowData = hasFirst
      ? [
          String(sel.guest_number),
          sel.guest_name || '-',
          sel.first_course ? dishName('first_course', sel.first_course) : '-',
          sel.second_course ? dishName('second_course', sel.second_course) : '-',
          sel.dessert ? dishName('dessert', sel.dessert) : '-',
          sel.allergies || '-',
        ]
      : [
          String(sel.guest_number),
          sel.guest_name || '-',
          sel.second_course ? dishName('second_course', sel.second_course) : '-',
          sel.dessert ? dishName('dessert', sel.dessert) : '-',
          sel.allergies || '-',
        ]

    colX = MARGIN
    for (let i = 0; i < cols.length; i++) {
      const isAllergy = i === cols.length - 1 && sel.allergies
      const cellText = truncate(rowData[i], isAllergy ? fontBold : fontRegular, 8, cols[i].w - 8)
      page.drawText(cellText, {
        x: colX + 4,
        y: curY - 10,
        size: 8,
        font: isAllergy ? fontBold : fontRegular,
        color: isAllergy ? ROJO : INK,
      })
      colX += cols[i].w
    }
    curY -= rowH
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  FOOTER                                                             ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  curY -= 20
  ensureSpace(40)

  page.drawLine({
    start: { x: MARGIN, y: curY },
    end: { x: MARGIN + pageW, y: curY },
    thickness: 1,
    color: DORADO,
  })
  curY -= 14

  const now = new Date()
  const timestamp = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
  const footerText = `Generado: ${timestamp}`
  const footerW = fontRegular.widthOfTextAtSize(footerText, 8)
  page.drawText(footerText, { x: MARGIN + (pageW - footerW) / 2, y: curY, size: 8, font: fontRegular, color: GRIS })
  curY -= 12

  const brandText = 'Canal Olimpico - Sistema de Reservas'
  const brandW = fontRegular.widthOfTextAtSize(brandText, 8)
  page.drawText(brandText, { x: MARGIN + (pageW - brandW) / 2, y: curY, size: 8, font: fontRegular, color: GRIS })

  // ── Save ──
  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
