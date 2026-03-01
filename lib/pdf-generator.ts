// ─── Generador de PDF de selección de platos ─────────────────────────────────
//
// Usa pdfkit para generar un PDF limpio y profesional para imprimir en cocina.
// Se usa en: API /api/menu-selection/pdf y como adjunto en email al restaurante.

import PDFDocument from 'pdfkit'
import { supabaseAdmin } from '@/lib/supabase'
import { findMenu, getMenuChoices } from '@/core/menus'

// ─── Colores de marca ────────────────────────────────────────────────────────
const DORADO: [number, number, number] = [176, 141, 87]    // #B08D57
const TERRACOTA: [number, number, number] = [196, 114, 78] // #C4724E
const INK: [number, number, number] = [26, 15, 5]          // #1A0F05
const GRIS: [number, number, number] = [120, 120, 120]
const ROJO: [number, number, number] = [192, 57, 43]       // #c0392b
const VERDE: [number, number, number] = [107, 144, 128]    // #6b9080
const WHITE: [number, number, number] = [255, 255, 255]
const BG_LIGHT: [number, number, number] = [245, 243, 238] // #f5f3ee

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

  // ── Create PDF ──
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `Platos — ${refDisplay}`,
        Author: 'Canal Olímpico',
        Subject: `Selección de platos para reserva ${refDisplay}`,
      },
    })

    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    let y = doc.y

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  HEADER                                                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    doc.fontSize(22).fillColor(DORADO).text('Canal Olímpico', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(10).fillColor(GRIS).text('Selección de Platos para Cocina', { align: 'center' })
    doc.moveDown(0.5)

    // Línea dorada
    y = doc.y
    doc.moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.margins.left + pageWidth, y)
      .strokeColor(DORADO)
      .lineWidth(2)
      .stroke()
    doc.moveDown(0.8)

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  INFO RESERVA                                                       ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    const infoBoxY = doc.y
    doc.rect(doc.page.margins.left, infoBoxY, pageWidth, 80)
      .fillColor(BG_LIGHT).fill()

    doc.fillColor(INK)
    const infoX = doc.page.margins.left + 15
    const col2X = doc.page.margins.left + pageWidth / 2 + 15

    doc.fontSize(11).font('Helvetica-Bold')
      .text(`Reserva: ${refDisplay}`, infoX, infoBoxY + 12)
    doc.font('Helvetica')
      .text(`Cliente: ${reservation.customer_name}`, infoX, infoBoxY + 30)
    doc.text(`Menú: ${menu?.name || reservation.menu_code}`, infoX, infoBoxY + 48)

    doc.text(`Fecha: ${formatDate(reservation.fecha)}`, col2X, infoBoxY + 12)
    doc.text(`Hora: ${reservation.hora_inicio}h`, col2X, infoBoxY + 30)
    doc.font('Helvetica-Bold')
      .text(`Comensales: ${reservation.personas}`, col2X, infoBoxY + 48)
    doc.font('Helvetica')

    if (reservation.customer_phone) {
      doc.fontSize(9).fillColor(GRIS)
        .text(`Tel: ${reservation.customer_phone}`, infoX, infoBoxY + 64)
    }

    doc.y = infoBoxY + 90
    doc.moveDown(0.5)

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  RESUMEN DE CANTIDADES                                              ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    doc.fontSize(14).fillColor(TERRACOTA).font('Helvetica-Bold')
      .text('RESUMEN DE CANTIDADES', doc.page.margins.left)
    doc.font('Helvetica')
    doc.moveDown(0.4)

    const drawCountsSection = (title: string, courseKey: string, color: [number, number, number]) => {
      const entries = Object.entries(counts[courseKey])
      if (entries.length === 0) return

      y = doc.y
      // Header row
      doc.rect(doc.page.margins.left, y, pageWidth, 22).fillColor(color).fill()
      doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
        .text(title, doc.page.margins.left + 10, y + 6)
      doc.font('Helvetica')
      doc.y = y + 22

      for (const [id, count] of entries) {
        y = doc.y
        doc.rect(doc.page.margins.left, y, pageWidth, 20).fillColor(WHITE).fill()
        doc.moveTo(doc.page.margins.left, y + 20)
          .lineTo(doc.page.margins.left + pageWidth, y + 20)
          .strokeColor([232, 226, 214]).lineWidth(0.5).stroke()

        doc.fontSize(10).fillColor(INK)
          .text(dishName(courseKey, id), doc.page.margins.left + 10, y + 5, { width: pageWidth - 80 })
        doc.fontSize(12).fillColor(color).font('Helvetica-Bold')
          .text(`${count}`, doc.page.margins.left + pageWidth - 50, y + 4, { width: 40, align: 'right' })
        doc.font('Helvetica')
        doc.y = y + 20
      }
    }

    if (choices?.first_course) {
      drawCountsSection('PRIMER PLATO', 'first_course', DORADO)
    }
    drawCountsSection('SEGUNDO PLATO', 'second_course', TERRACOTA)
    drawCountsSection('POSTRE', 'dessert', VERDE)

    doc.moveDown(1)

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  ALERGIAS (si hay — resaltadas arriba del detalle)                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    if (allergiesList.length > 0) {
      // Check if we need a new page
      if (doc.y > doc.page.height - 160) doc.addPage()

      y = doc.y
      const allergyBoxH = 24 + allergiesList.length * 16
      doc.rect(doc.page.margins.left, y, pageWidth, allergyBoxH)
        .fillColor([254, 242, 242] as [number, number, number]).fill()
      doc.rect(doc.page.margins.left, y, pageWidth, allergyBoxH)
        .strokeColor([252, 165, 165] as [number, number, number]).lineWidth(1).stroke()

      doc.fontSize(11).fillColor(ROJO).font('Helvetica-Bold')
        .text('⚠ ALERGIAS E INTOLERANCIAS', doc.page.margins.left + 10, y + 6)
      doc.font('Helvetica').fontSize(9)

      let allergyY = y + 24
      for (const a of allergiesList) {
        doc.fillColor([153, 27, 27] as [number, number, number])
          .text(`• ${a.guest}: ${a.text}`, doc.page.margins.left + 10, allergyY, { width: pageWidth - 20 })
        allergyY += 16
      }

      doc.y = y + allergyBoxH + 10
      doc.moveDown(0.5)
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  DETALLE POR COMENSAL                                               ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    // Check page space
    if (doc.y > doc.page.height - 200) doc.addPage()

    doc.fontSize(14).fillColor(TERRACOTA).font('Helvetica-Bold')
      .text('DETALLE POR COMENSAL', doc.page.margins.left)
    doc.font('Helvetica')
    doc.moveDown(0.4)

    // ── Table header ──
    const hasFirst = !!choices?.first_course
    // Column widths
    const colNum = 25
    const colName = hasFirst ? 80 : 100
    const colFirst = hasFirst ? 110 : 0
    const colSecond = hasFirst ? 110 : 150
    const colDessert = hasFirst ? 80 : 100
    const colAllergy = pageWidth - colNum - colName - colFirst - colSecond - colDessert

    const cols = [
      { label: 'Nº', w: colNum },
      { label: 'Nombre', w: colName },
      ...(hasFirst ? [{ label: 'Primero', w: colFirst }] : []),
      { label: 'Segundo', w: colSecond },
      { label: 'Postre', w: colDessert },
      { label: 'Alergias', w: colAllergy },
    ]

    const rowH = 20
    y = doc.y

    // Header row background
    doc.rect(doc.page.margins.left, y, pageWidth, rowH).fillColor(INK).fill()

    let colX = doc.page.margins.left
    doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
    for (const col of cols) {
      doc.text(col.label, colX + 4, y + 6, { width: col.w - 8, ellipsis: true })
      colX += col.w
    }
    doc.font('Helvetica')
    doc.y = y + rowH

    // ── Data rows ──
    for (const sel of selections) {
      y = doc.y
      // New page check
      if (y > doc.page.height - 60) {
        doc.addPage()
        y = doc.y
      }

      const bg = sel.guest_number % 2 === 0 ? BG_LIGHT : WHITE
      doc.rect(doc.page.margins.left, y, pageWidth, rowH).fillColor(bg).fill()
      doc.moveTo(doc.page.margins.left, y + rowH)
        .lineTo(doc.page.margins.left + pageWidth, y + rowH)
        .strokeColor([232, 226, 214]).lineWidth(0.3).stroke()

      const rowData = [
        String(sel.guest_number),
        sel.guest_name || '-',
        ...(hasFirst ? [sel.first_course ? dishName('first_course', sel.first_course) : '-'] : []),
        sel.second_course ? dishName('second_course', sel.second_course) : '-',
        sel.dessert ? dishName('dessert', sel.dessert) : '-',
        sel.allergies || '-',
      ]

      colX = doc.page.margins.left
      for (let i = 0; i < cols.length; i++) {
        const isAllergy = i === cols.length - 1 && sel.allergies
        doc.fontSize(8)
          .fillColor(isAllergy ? ROJO : INK)
          .font(isAllergy ? 'Helvetica-Bold' : 'Helvetica')
          .text(rowData[i], colX + 4, y + 6, { width: cols[i].w - 8, ellipsis: true })
        colX += cols[i].w
      }
      doc.font('Helvetica')
      doc.y = y + rowH
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  FOOTER                                                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    doc.moveDown(1.5)
    y = doc.y
    doc.moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.margins.left + pageWidth, y)
      .strokeColor(DORADO).lineWidth(1).stroke()
    doc.moveDown(0.5)

    const now = new Date()
    const timestamp = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    doc.fontSize(8).fillColor(GRIS)
      .text(`Generado: ${timestamp}`, { align: 'center' })
    doc.text(`Canal Olímpico — Sistema de Reservas`, { align: 'center' })

    doc.end()
  })
}
