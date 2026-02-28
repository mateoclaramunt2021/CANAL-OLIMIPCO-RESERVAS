'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Enterprise Landing 2026
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── SVG Icon Components ─────────────────────────────────────────────────── */
const Icon = {
  MapPin: () => <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Phone: () => <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Users: () => <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Utensils: () => <svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>,
  Star: () => <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Gift: () => <svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>,
  Moon: () => <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  CreditCard: () => <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Calendar: () => <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  AlertCircle: () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  RefreshCw: () => <svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  FileText: () => <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  Wine: () => <svg viewBox="0 0 24 24"><path d="M8 22h8M12 18v4M12 18a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S13 2 12 2s-2.5 1.5-4 3.5S5 9 5 11a7 7 0 0 0 7 7z"/></svg>,
  Check: () => <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
  X: () => <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevronDown: () => <svg width="28" height="28" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>,
  ArrowLeft: () => <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>,
  Mail: () => <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/></svg>,
  Instagram: () => <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
}

/* ─── Menu data ───────────────────────────────────────────────────────────── */
const MENUS_DISPLAY = [
  { name: 'Menú Grupo Premium', price: '34€', priceSub: 'por persona', badge: 'PREMIUM', cat: 'grupo', courses: [
    { label: 'PARA COMPARTIR', text: 'Surtido de embutidos ibéricos · Pan de coca con tomate, aceite de oliva y romero · Patatas bravas' },
    { label: 'PARA ESCOGER', text: 'Solomillo de cerdo a la pimienta / Bacalao con cremoso de setas / Parrillada de verduras' },
    { label: 'POSTRE', text: 'Tarta o Helado' },
  ], drinks: '1 bebida + agua + café o infusión', accent: 'terracota' as const },
  { name: 'Menú Grupo', price: '29€', priceSub: 'por persona', badge: null, cat: 'grupo', courses: [
    { label: 'PRIMERO', text: 'Rigatoni con crema suave de tomate / Ensalada de queso de cabra con frutos rojos' },
    { label: 'PARA ESCOGER', text: 'Solomillo a la pimienta verde / Lubina al horno con patata panadera / Parrillada de verduras' },
    { label: 'POSTRE', text: 'Sorbete de limón al cava / Macedonia de frutas' },
  ], drinks: '1 bebida + agua', accent: 'gold' as const },
  { name: 'Pica-Pica Premium', price: '34€', priceSub: 'por persona', badge: 'PREMIUM', cat: 'picapica', courses: [
    { label: 'SELECCIÓN', text: 'Surtido embutidos ibéricos · Pan de coca con tomate y aceite de oliva · Bravas · Brocheta sepia y gambas' },
    { label: 'CLÁSICOS', text: 'Alcachofas con jamón de pato · Miniensaladas de queso de cabra con frutos rojos · Saquitos de carrillera · Croquetas · Minihamburguesas en pan de brioxe' },
  ], drinks: '2 bebidas (refresco / vino / cerveza)', accent: 'terracota' as const },
  { name: 'Pica-Pica', price: '30€', priceSub: 'por persona', badge: null, cat: 'picapica', courses: [
    { label: 'SELECCIÓN', text: 'Tacos de tortilla de patatas · Mix de croquetas · Minihamburguesas en pan de brioxe · Calamarcitos a la andaluza' },
    { label: 'CLÁSICOS', text: 'Fingers de pollo · Nachos con guacamole, chile y pico de gallo' },
  ], drinks: '2 bebidas (refresco / vino / cerveza)', accent: 'gold' as const },
  { name: 'Menú Infantil', price: '14,50€', priceSub: 'por niño', badge: null, cat: 'infantil', courses: [
    { label: 'PRINCIPAL', text: 'Macarrones tomate / Hamburguesa con patatas / Fingers de pollo / Canelones' },
    { label: 'POSTRE', text: 'Tarta / Helado / Yogur' },
  ], drinks: '1 refresco / zumo / agua', accent: 'terracota' as const },
  { name: 'Menú Padres/Adultos', price: '38€', priceSub: 'por persona', badge: null, cat: 'infantil', courses: [
    { label: 'MENÚ COMPLETO', text: 'Para adultos acompañantes en eventos infantiles' },
  ], drinks: '1 bebida + agua + café', accent: 'gold' as const },
]

/* ─── API menu mapping ────────────────────────────────────────────────────── */
interface MenuOption { code: string; name: string; price: number; eventTypes: string[] }
const API_MENUS: MenuOption[] = [
  { code: 'menu_grupo_34', name: 'Menú Grupo Premium', price: 34, eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'] },
  { code: 'menu_grupo_29', name: 'Menú Grupo', price: 29, eventTypes: ['GRUPO_SENTADO', 'NOCTURNA_EXCLUSIVA'] },
  { code: 'menu_pica_34', name: 'Pica-Pica Premium', price: 34, eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'] },
  { code: 'menu_pica_30', name: 'Pica-Pica', price: 30, eventTypes: ['GRUPO_PICA_PICA', 'NOCTURNA_EXCLUSIVA'] },
  { code: 'menu_infantil', name: 'Menú Infantil', price: 14.5, eventTypes: ['INFANTIL_CUMPLE'] },
  { code: 'menu_padres_38', name: 'Menú Padres/Adultos', price: 38, eventTypes: ['INFANTIL_CUMPLE'] },
]

const EVENT_TYPES_MAP: Record<string, string> = {
  'GRUPO_SENTADO': 'Grupo Sentado',
  'GRUPO_PICA_PICA': 'Pica-Pica',
  'INFANTIL_CUMPLE': 'Infantil / Cumpleaños',
  'NOCTURNA_EXCLUSIVA': 'Nocturna Exclusiva',
}

const EVENT_DISPLAY = [
  { key: 'GRUPO_SENTADO', title: 'Grupo Sentado', desc: 'Comidas y cenas de grupo con menú servido a mesa. Desde 7 personas.', icon: 'utensils', price: 'Desde 29€/pers.' },
  { key: 'GRUPO_PICA_PICA', title: 'Pica-Pica', desc: 'Formato cocktail con selección de platos para compartir de pie.', icon: 'star', price: 'Desde 30€/pers.' },
  { key: 'INFANTIL_CUMPLE', title: 'Cumpleaños Infantil', desc: 'Celebraciones para los más pequeños con zona reservada y tarta.', icon: 'gift', price: 'Desde 14,50€/niño' },
  { key: 'NOCTURNA_EXCLUSIVA', title: 'Nocturna Exclusiva', desc: 'Eventos nocturnos con terraza privada y experiencia premium.', icon: 'moon', price: 'Presupuesto a medida' },
]

const CONDITIONS_DATA = [
  { icon: 'card', text: 'Señal del 40% para confirmar' },
  { icon: 'calendar', text: 'Mínimo 5 días de antelación' },
  { icon: 'clock', text: '4 días para realizar el pago' },
  { icon: 'refresh', text: 'Modificación hasta 72h antes' },
  { icon: 'alert', text: 'Alergias: avisar 72h antes' },
  { icon: 'file', text: 'IVA incluido en todos los precios' },
]

const CONDITION_ICONS: Record<string, () => React.JSX.Element> = {
  card: Icon.CreditCard, calendar: Icon.Calendar, clock: Icon.Clock,
  refresh: Icon.RefreshCw, alert: Icon.AlertCircle, file: Icon.FileText,
}

const EVENT_ICONS: Record<string, () => React.JSX.Element> = {
  utensils: Icon.Utensils, star: Icon.Star, gift: Icon.Gift, moon: Icon.Moon,
}

/* ─── FAQ data ────────────────────────────────────────────────────────────── */
const FAQ_DATA = [
  { q: '¿Cuál es el horario del restaurante?', a: 'De lunes a viernes de 8:00 a 18:00h. Sábados y domingos de 9:00 a 18:00h. Para eventos nocturnos privados, consultar disponibilidad.' },
  { q: '¿Hay parking disponible?', a: 'Sí, disponemos de un amplio aparcamiento gratuito junto al restaurante, ideal para grupos grandes.' },
  { q: '¿Puedo reservar para más de 6 personas?', a: 'Por supuesto. Para grupos de 7 o más personas selecciona la opción "Grupo / Evento" en el formulario de reserva. Tenemos menús cerrados desde 29€/persona con todo incluido.' },
  { q: '¿Cómo funciona la señal para grupos?', a: 'Al reservar un evento o grupo se requiere una señal del 40% del total, que puedes pagar online de forma segura. Tienes 4 días para completar el pago desde la confirmación.' },
  { q: '¿Puedo cancelar o modificar mi reserva?', a: 'Puedes modificar tu reserva hasta 72 horas antes del evento. Si cancelas fuera de plazo, la señal no se devuelve. Para mesas individuales, puedes cancelar con 24h de antelación.' },
  { q: '¿Tienen opciones para alérgenos o intolerancias?', a: 'Sí. Solo necesitas indicarlo con un mínimo de 72 horas de antelación para que nuestro equipo de cocina prepare las adaptaciones necesarias.' },
  { q: '¿Pueden venir niños?', a: 'Sí, tenemos menú infantil (14,50€) con opciones adaptadas. También organizamos cumpleaños y fiestas infantiles con zona reservada.' },
  { q: '¿Se admiten mascotas en la terraza?', a: 'Sí, las mascotas son bienvenidas en la terraza exterior. Solo pedimos que estén atadas y no molesten al resto de clientes.' },
  { q: '¿Hay algún mínimo de personas para reservar?', a: 'Para mesas individuales puedes reservar desde 1 persona. Para grupos y eventos, el mínimo es de 7 personas.' },
  { q: '¿Se puede personalizar el menú de grupo?', a: 'Los menús de grupo son cerrados para garantizar la calidad del servicio. Si necesitas adaptaciones por alergias o intolerancias, no dudes en contactarnos con antelación.' },
]

/* ─── Time options ────────────────────────────────────────────────────────── */
function generateTimeSlots(start: number, end: number, step: number): string[] {
  const slots: string[] = []
  for (let m = start; m <= end; m += step) {
    const h = Math.floor(m / 60), mi = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`)
  }
  return slots
}
const TIME_SLOTS_NORMAL = generateTimeSlots(8 * 60, 17 * 60 + 30, 30)
const TIME_SLOTS_EVENT = generateTimeSlots(12 * 60, 22 * 60, 30)

/* ─── Hooks & Utils ───────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el) } },
      { threshold: 0.12 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal()
  return <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>
}

/* ─── Animated Counter ────────────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { setStarted(true); obs.unobserve(el) }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const startTime = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCount(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, target, duration])

  return <span ref={ref} className="counter__value">{count}{suffix}</span>
}

/* ─── Smooth FAQ ──────────────────────────────────────────────────────────── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.scrollHeight)
  }, [a])

  return (
    <div className={`faq__item ${open ? 'faq__item--open' : ''}`}>
      <button className="faq__q" onClick={() => setOpen(o => !o)}>
        <span className="faq__q-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="faq__q-text">{q}</span>
        <span className="faq__toggle">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 9l6 6 6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"/></svg>
        </span>
      </button>
      <div className="faq__a-wrap" style={{ maxHeight: open ? height + 24 : 0 }}>
        <div ref={contentRef} className="faq__a"><p>{a}</p></div>
      </div>
    </div>
  )
}

/* ─── Menu Tabs ───────────────────────────────────────────────────────────── */
const MENU_CATS = [
  { key: 'all', label: 'Todos' },
  { key: 'grupo', label: 'Grupo Sentado' },
  { key: 'picapica', label: 'Pica-Pica' },
  { key: 'infantil', label: 'Infantil' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   RESERVATION FORM
   ═══════════════════════════════════════════════════════════════════════════ */
type ReservationType = 'individual' | 'group' | null
type FormStep = 1 | 2 | 3 | 4 | 5

interface FormState {
  type: ReservationType
  fecha: string; hora: string; personas: number; zona: 'fuera' | 'dentro' | ''
  event_type: string; menu_code: string
  nombre: string; telefono: string; email: string; condiciones: boolean
  _hp: string; _ts: number
}

const INITIAL_FORM: FormState = {
  type: null, fecha: '', hora: '', personas: 2, zona: '',
  event_type: '', menu_code: '', nombre: '', telefono: '', email: '',
  condiciones: false, _hp: '', _ts: Date.now(),
}

function ReservationForm() {
  const [step, setStep] = useState<FormStep>(1)
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, _ts: Date.now() })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [availability, setAvailability] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; stripeUrl?: string; tableId?: string } | null>(null)
  const [confetti, setConfetti] = useState(false)

  const set = useCallback((updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }))
    const keys = Object.keys(updates)
    setErrors(prev => { const next = { ...prev }; keys.forEach(k => delete next[k]); return next })
  }, [])

  // ── Availability check ──
  useEffect(() => {
    if (step !== 2 || !form.fecha || !form.hora || !form.personas) return
    const eventType = form.type === 'individual' ? 'RESERVA_NORMAL' : form.event_type
    if (!eventType) return

    setAvailability({ status: 'loading', message: 'Comprobando disponibilidad...' })
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha: form.fecha, hora: form.hora, personas: form.personas, event_type: eventType, zona: form.zona || undefined }),
          signal: ctrl.signal,
        })
        const data = await res.json()
        if (data.available) {
          setAvailability({ status: 'ok', message: data.message || 'Disponible' })
        } else {
          const alts = data.alternatives?.length ? ` Alternativas: ${data.alternatives.join(', ')}` : ''
          setAvailability({ status: 'error', message: (data.message || 'No disponible') + alts })
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') setAvailability({ status: 'error', message: 'Error al comprobar disponibilidad' })
      }
    }, 500)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [step, form.fecha, form.hora, form.personas, form.type, form.event_type, form.zona])

  const validateStep = (s: FormStep): boolean => {
    const errs: Record<string, string> = {}
    if (s === 1) { if (!form.type) errs.type = 'Selecciona un tipo de reserva' }
    if (s === 2) {
      if (!form.fecha) errs.fecha = 'Selecciona una fecha'
      if (!form.hora) errs.hora = 'Selecciona una hora'
      if (!form.personas || form.personas < 1) errs.personas = 'Mínimo 1 persona'
      if (form.type === 'individual' && form.personas > 6) errs.personas = 'Para más de 6 personas, selecciona "Grupo / Evento"'
      if (form.type === 'group') {
        if (!form.event_type) errs.event_type = 'Selecciona el tipo de evento'
        if (!form.menu_code) errs.menu_code = 'Selecciona un menú'
        if (form.personas < 7) errs.personas = 'Grupos requieren mínimo 7 personas'
      }
      if (availability.status === 'error') errs._avail = 'No hay disponibilidad en la fecha/hora seleccionada'
      if (availability.status === 'loading') errs._avail = 'Espera a que se compruebe la disponibilidad'
    }
    if (s === 3) {
      if (!form.nombre || form.nombre.trim().length < 2) errs.nombre = 'Nombre obligatorio (mín. 2 caracteres)'
      if (!form.telefono || !/^[+\d\s()-]{6,20}$/.test(form.telefono)) errs.telefono = 'Teléfono inválido'
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido'
      if (!form.condiciones) errs.condiciones = 'Debes aceptar las condiciones'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (!validateStep(step)) return; setStep(s => Math.min(s + 1, 4) as FormStep) }
  const back = () => setStep(s => Math.max(s - 1, 1) as FormStep)

  const submit = async () => {
    if (!validateStep(3)) return
    setSubmitting(true)
    const eventType = form.type === 'individual' ? 'RESERVA_NORMAL' : form.event_type
    const payload: Record<string, unknown> = {
      nombre: form.nombre.trim(), telefono: form.telefono.trim(), email: form.email.trim().toLowerCase(),
      fecha: form.fecha, hora: form.hora, personas: form.personas, event_type: eventType, _hp: form._hp, _ts: form._ts,
    }
    if (form.zona) payload.zona = form.zona
    if (form.type === 'group' && form.menu_code) payload.menu_code = form.menu_code

    try {
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok && data.ok) {
        setResult({ ok: true, message: data.message || 'Reserva creada correctamente', stripeUrl: data.stripe_url, tableId: data.table_id })
        setConfetti(true)
        setTimeout(() => setConfetti(false), 4000)
      } else {
        setResult({ ok: false, message: data.error || 'Error al crear la reserva' })
      }
    } catch { setResult({ ok: false, message: 'Error de conexión. Inténtalo de nuevo.' }) }
    finally { setSubmitting(false); setStep(5) }
  }

  const selectedMenu = API_MENUS.find(m => m.code === form.menu_code)
  const total = selectedMenu ? selectedMenu.price * form.personas : 0
  const deposit = Math.round(total * 0.4 * 100) / 100
  const isGroup = form.type === 'group'
  const availableMenus = API_MENUS.filter(m => m.eventTypes.includes(form.event_type))
  const timeSlots = form.type === 'individual' ? TIME_SLOTS_NORMAL : TIME_SLOTS_EVENT
  const today = new Date()
  const minDateObj = new Date(today)
  if (isGroup) minDateObj.setDate(minDateObj.getDate() + 5)
  else minDateObj.setDate(minDateObj.getDate() + 1)
  const minDate = minDateObj.toISOString().split('T')[0]
  const STEP_LABELS = ['Tipo', 'Detalles', 'Datos', 'Confirmar']

  const reset = () => {
    setStep(1); setForm({ ...INITIAL_FORM, _ts: Date.now() }); setErrors({})
    setAvailability({ status: 'idle', message: '' }); setResult(null); setConfetti(false)
  }

  const progressPercent = step <= 4 ? ((step - 1) / 3) * 100 : 100

  return (
    <div className="rf">
      {/* Confetti */}
      {confetti && (
        <div className="rf__confetti">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="rf__confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              backgroundColor: ['#B08D57', '#C4724E', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed'][Math.floor(Math.random() * 6)],
            }} />
          ))}
        </div>
      )}

      {/* Progress */}
      {step <= 4 && (
        <div className="rf__progress">
          <div className="rf__progress-bar" style={{ width: `${progressPercent}%` }} />
          <div className="rf__progress-steps">
            {STEP_LABELS.map((label, i) => {
              const num = i + 1
              const isActive = step === num
              const isDone = step > num
              return (
                <div key={i} className={`rf__step ${isActive ? 'rf__step--active' : ''} ${isDone ? 'rf__step--done' : ''}`}>
                  <span className="rf__step-num">{isDone ? '✓' : num}</span>
                  <span className="rf__step-label">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rf__body">
        <div className="rf__hp" aria-hidden="true">
          <label htmlFor="rf_website">Website</label>
          <input id="rf_website" type="text" tabIndex={-1} autoComplete="off" value={form._hp} onChange={e => set({ _hp: e.target.value })} />
        </div>

        {/* ── STEP 1: Type ── */}
        {step === 1 && (
          <div className="rf__slide" key="s1">
            <div className="rf__header">
              <span className="rf__header-icon"><Icon.Sparkles /></span>
              <h3>¿Qué tipo de reserva necesitas?</h3>
              <p>Selecciona una opción para continuar</p>
            </div>
            <div className="rf__types">
              <div className={`rf__type ${form.type === 'individual' ? 'rf__type--active' : ''}`} onClick={() => set({ type: 'individual', event_type: '', menu_code: '', personas: 2 })}>
                <div className="rf__type-glow" />
                <span className="rf__type-icon"><Icon.Users /></span>
                <h4>Mesa Individual</h4>
                <p>De 1 a 6 personas</p>
                <span className="rf__type-badge">Confirmación inmediata</span>
              </div>
              <div className={`rf__type ${form.type === 'group' ? 'rf__type--active' : ''}`} onClick={() => set({ type: 'group', personas: 10 })}>
                <div className="rf__type-glow" />
                <span className="rf__type-icon"><Icon.Utensils /></span>
                <h4>Grupo / Evento</h4>
                <p>7+ personas · Menú fijo</p>
                <span className="rf__type-badge">Señal 40%</span>
              </div>
            </div>
            {errors.type && <p className="rf__error" style={{ textAlign: 'center', marginTop: 12 }}>{errors.type}</p>}
            <div className="rf__actions"><button className="btn btn--primary btn--lg" onClick={next}>Continuar →</button></div>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div className="rf__slide" key="s2">
            <div className="rf__row">
              <div className="rf__field">
                <label className="rf__label">📅 Fecha</label>
                <input type="date" className={`rf__input ${errors.fecha ? 'rf__input--error' : ''}`} value={form.fecha} min={minDate} onChange={e => set({ fecha: e.target.value })} />
                {errors.fecha && <span className="rf__error">{errors.fecha}</span>}
              </div>
              <div className="rf__field">
                <label className="rf__label">🕐 Hora</label>
                <select className={`rf__input ${errors.hora ? 'rf__input--error' : ''}`} value={form.hora} onChange={e => set({ hora: e.target.value })}>
                  <option value="">Seleccionar hora</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t}h</option>)}
                </select>
                {errors.hora && <span className="rf__error">{errors.hora}</span>}
              </div>
            </div>
            <div className="rf__row">
              <div className="rf__field">
                <label className="rf__label">👥 Personas</label>
                <input type="number" className={`rf__input ${errors.personas ? 'rf__input--error' : ''}`} value={form.personas} min={isGroup ? 7 : 1} max={isGroup ? 100 : 6} onChange={e => set({ personas: parseInt(e.target.value) || 0 })} />
                {errors.personas && <span className="rf__error">{errors.personas}</span>}
              </div>
              <div className="rf__field">
                <label className="rf__label">📍 Zona</label>
                <select className="rf__input" value={form.zona} onChange={e => set({ zona: e.target.value as any })}>
                  <option value="">Sin preferencia</option>
                  <option value="fuera">Terraza</option>
                  <option value="dentro">Interior</option>
                </select>
              </div>
            </div>

            {isGroup && (
              <div className="rf__row rf__row--full">
                <div className="rf__field">
                  <label className="rf__label">🎉 Tipo de evento</label>
                  <select className={`rf__input ${errors.event_type ? 'rf__input--error' : ''}`} value={form.event_type} onChange={e => set({ event_type: e.target.value, menu_code: '' })}>
                    <option value="">Seleccionar tipo</option>
                    {Object.entries(EVENT_TYPES_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {errors.event_type && <span className="rf__error">{errors.event_type}</span>}
                </div>
              </div>
            )}

            {isGroup && form.event_type && (
              <>
                <label className="rf__label" style={{ marginBottom: 10, display: 'block' }}>🍽️ Selecciona tu menú</label>
                <div className="rf__menus">
                  {availableMenus.map(m => (
                    <label key={m.code} className={`rf__menu-opt ${form.menu_code === m.code ? 'rf__menu-opt--active' : ''}`} onClick={() => set({ menu_code: m.code })}>
                      <input type="radio" name="menu" value={m.code} checked={form.menu_code === m.code} readOnly />
                      <span className="rf__menu-radio" />
                      <div className="rf__menu-info">
                        <h5>{m.name}</h5>
                        <p>IVA incluido</p>
                      </div>
                      <span className="rf__menu-price">{m.price}€<small>/pers.</small></span>
                    </label>
                  ))}
                </div>
                {errors.menu_code && <span className="rf__error">{errors.menu_code}</span>}
              </>
            )}

            {form.fecha && form.hora && (
              <div className="rf__avail-wrap">
                {availability.status === 'loading' && <span className="rf__avail rf__avail--loading"><span className="rf__spinner" /> Comprobando...</span>}
                {availability.status === 'ok' && <span className="rf__avail rf__avail--ok"><Icon.Check /> Disponible</span>}
                {availability.status === 'error' && <span className="rf__avail rf__avail--no"><Icon.X /> {availability.message}</span>}
              </div>
            )}
            {errors._avail && <p className="rf__error" style={{ textAlign: 'center' }}>{errors._avail}</p>}

            <div className="rf__actions">
              <button className="rf__back" onClick={back}>← Atrás</button>
              <button className="btn btn--primary" onClick={next}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Personal data ── */}
        {step === 3 && (
          <div className="rf__slide" key="s3">
            <div className="rf__header">
              <h3>Datos de contacto</h3>
              <p>Te enviaremos la confirmación por email</p>
            </div>
            <div className="rf__row">
              <div className="rf__field">
                <label className="rf__label">👤 Nombre completo</label>
                <input type="text" placeholder="Tu nombre" className={`rf__input ${errors.nombre ? 'rf__input--error' : ''}`} value={form.nombre} onChange={e => set({ nombre: e.target.value })} autoComplete="name" />
                {errors.nombre && <span className="rf__error">{errors.nombre}</span>}
              </div>
              <div className="rf__field">
                <label className="rf__label">📱 Teléfono</label>
                <input type="tel" placeholder="+34 600 000 000" className={`rf__input ${errors.telefono ? 'rf__input--error' : ''}`} value={form.telefono} onChange={e => set({ telefono: e.target.value })} autoComplete="tel" />
                {errors.telefono && <span className="rf__error">{errors.telefono}</span>}
              </div>
            </div>
            <div className="rf__row rf__row--full">
              <div className="rf__field">
                <label className="rf__label">📧 Email</label>
                <input type="email" placeholder="tu@email.com" className={`rf__input ${errors.email ? 'rf__input--error' : ''}`} value={form.email} onChange={e => set({ email: e.target.value })} autoComplete="email" />
                {errors.email && <span className="rf__error">{errors.email}</span>}
                <span className="rf__hint">Recibirás la confirmación y los detalles en este correo</span>
              </div>
            </div>

            <label className="rf__check">
              <input type="checkbox" checked={form.condiciones} onChange={e => set({ condiciones: e.target.checked })} />
              <span>
                Acepto las <Link href="/condiciones" target="_blank"><strong>condiciones de reserva</strong></Link>: señal 40%, modificaciones hasta 72h antes, cancelación fuera de plazo implica pérdida de la señal. IVA incluido.
              </span>
            </label>
            {errors.condiciones && <p className="rf__error">{errors.condiciones}</p>}

            <div className="rf__actions">
              <button className="rf__back" onClick={back}>← Atrás</button>
              <button className="btn btn--primary" onClick={() => { if (validateStep(3)) setStep(4) }}>Revisar Resumen →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Summary ── */}
        {step === 4 && (
          <div className="rf__slide" key="s4">
            <div className="rf__summary">
              <h4>📋 Resumen de tu reserva</h4>
              <div className="rf__summary-row"><span>Tipo</span><span>{form.type === 'individual' ? 'Mesa Individual' : EVENT_TYPES_MAP[form.event_type] || 'Grupo'}</span></div>
              <div className="rf__summary-row"><span>Fecha y hora</span><span>{form.fecha} a las {form.hora}h</span></div>
              <div className="rf__summary-row"><span>Personas</span><span>{form.personas}</span></div>
              {form.zona && <div className="rf__summary-row"><span>Zona</span><span>{form.zona === 'fuera' ? 'Terraza' : 'Interior'}</span></div>}
              <div className="rf__summary-row"><span>Nombre</span><span>{form.nombre}</span></div>
              <div className="rf__summary-row"><span>Email</span><span>{form.email}</span></div>
              <div className="rf__summary-row"><span>Teléfono</span><span>{form.telefono}</span></div>
              {isGroup && selectedMenu && (
                <>
                  <div className="rf__summary-row"><span>Menú</span><span>{selectedMenu.name}</span></div>
                  <div className="rf__summary-total"><span>Total</span><span>{total}€</span></div>
                  <div className="rf__deposit"><span>Señal 40%</span><span>{deposit}€</span></div>
                </>
              )}
            </div>

            {isGroup && (
              <div className="rf__notice">
                <Icon.Shield />
                <p>Al confirmar recibirás un <strong>email con el enlace de pago</strong> para la señal de {deposit}€. Tienes 4 días para completar el pago. Pago seguro con Stripe.</p>
              </div>
            )}

            <div className="rf__actions">
              <button className="rf__back" onClick={back}>← Modificar</button>
              <button className="btn btn--primary btn--lg" onClick={submit} disabled={submitting}>
                {submitting ? <><span className="rf__spinner" /> Procesando...</> : '✓ Confirmar Reserva'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Result ── */}
        {step === 5 && result && (
          <div className="rf__slide" key="s5">
            <div className="rf__result">
              <div className={`rf__result-icon ${result.ok ? 'rf__result-icon--ok' : 'rf__result-icon--err'}`}>
                {result.ok ? <Icon.Check /> : <Icon.X />}
              </div>
              <h3>{result.ok ? '¡Reserva Confirmada!' : 'Algo salió mal'}</h3>
              <p>{result.message}</p>
              {result.ok && result.tableId && <p className="rf__result-detail">Mesa asignada: <strong>{result.tableId}</strong></p>}
              {result.ok && <p className="rf__result-detail">📧 Hemos enviado la confirmación a <strong>{form.email}</strong></p>}
              {result.ok && result.stripeUrl && (
                <a href={result.stripeUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--lg" style={{ marginTop: 20 }}>
                  💳 Pagar Señal ({deposit}€)
                </a>
              )}
              <div style={{ marginTop: 28 }}>
                <button className="btn btn--outline btn--sm" onClick={reset}>Nueva Reserva</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [menuCat, setMenuCat] = useState('all')
  const menuScrollRef = useRef<HTMLDivElement>(null)
  const [activeMenu, setActiveMenu] = useState(0)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const el = menuScrollRef.current
    if (!el) return
    const onScroll = () => {
      const card = el.querySelector('.mc') as HTMLElement | null
      if (!card) return
      const w = card.offsetWidth + 24
      const idx = Math.round(el.scrollLeft / w)
      setActiveMenu(Math.max(0, Math.min(idx, filteredMenus.length - 1)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  })

  const scrollMenus = useCallback((dir: 'left' | 'right') => {
    if (!menuScrollRef.current) return
    const card = menuScrollRef.current.querySelector('.mc') as HTMLElement | null
    const amt = card ? card.offsetWidth + 24 : menuScrollRef.current.offsetWidth
    menuScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' })
  }, [])

  const scrollTo = useCallback((id: string) => {
    setMobileMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const filteredMenus = menuCat === 'all' ? MENUS_DISPLAY : MENUS_DISPLAY.filter(m => m.cat === menuCat)

  const NAV_ITEMS = [
    { id: 'about', label: 'Nosotros' },
    { id: 'carta', label: 'Carta' },
    { id: 'reservar', label: 'Reservar' },
    { id: 'eventos', label: 'Eventos' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contacto', label: 'Contacto' },
  ]

  return (
    <main className="landing">

      {/* ━━━ NAVBAR ━━━ */}
      <nav className={`nav ${scrolled ? 'nav--solid' : ''}`}>
        <div className="nav__inner">
          <button className="nav__logo" onClick={() => scrollTo('hero')}>
            <span className="nav__logo-text">CANAL OLÍMPICO</span>
          </button>
          <div className="nav__links">
            {NAV_ITEMS.map(n => <button key={n.id} onClick={() => scrollTo(n.id)}>{n.label}</button>)}
            <button className="nav__cta" onClick={() => scrollTo('reservar')}>Reservar</button>
          </div>
          <button className="nav__burger" onClick={() => setMobileMenu(v => !v)} aria-label="Menú">
            <span className={mobileMenu ? 'open' : ''} />
            <span className={mobileMenu ? 'open' : ''} />
            <span className={mobileMenu ? 'open' : ''} />
          </button>
        </div>
        <div className={`nav__mobile ${mobileMenu ? 'nav__mobile--open' : ''}`}>
          {NAV_ITEMS.map(n => <button key={n.id} onClick={() => scrollTo(n.id)}>{n.label}</button>)}
          <button className="nav__mobile-cta" onClick={() => scrollTo('reservar')}>🗓️ Reservar Mesa</button>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section id="hero" className="hero">
        <Image src="/hero.jpg" alt="Canal Olímpico Restaurante" fill priority className="hero__img" sizes="100vw" />
        <div className="hero__overlay" />
        <div className="hero__vignette" />
        <div className="hero__content">
          <div className="hero__gold-line hero__anim" style={{ animationDelay: '.2s' }} />
          <span className="hero__tag hero__anim" style={{ animationDelay: '.4s' }}>Restaurante · Terraza · Eventos</span>
          <h1 className="hero__title">
            <span className="hero__title-top hero__anim" style={{ animationDelay: '.7s' }}>Canal</span>
            <span className="hero__title-bot hero__anim" style={{ animationDelay: '.9s' }}>Olímpico</span>
          </h1>
          <div className="hero__ornament hero__anim" style={{ animationDelay: '1.1s' }}>
            <svg viewBox="0 0 200 16" fill="none">
              <line x1="0" y1="8" x2="78" y2="8" stroke="url(#goldGrad)" strokeWidth=".7" />
              <path d="M90 8L96 2L102 8L96 14Z" stroke="url(#goldGrad)" strokeWidth=".7" fill="none" />
              <line x1="114" y1="8" x2="200" y2="8" stroke="url(#goldGrad)" strokeWidth=".7" />
              <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="200" y2="0"><stop offset="0%" stopColor="transparent" /><stop offset="20%" stopColor="#B08D57" /><stop offset="50%" stopColor="#d4b87a" /><stop offset="80%" stopColor="#B08D57" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
            </svg>
          </div>
          <p className="hero__subtitle hero__anim" style={{ animationDelay: '1.3s' }}>Gastronomía mediterránea junto al canal</p>
          <p className="hero__loc hero__anim" style={{ animationDelay: '1.5s' }}>
            <span className="hero__loc-icon">◆</span> Castelldefels, Barcelona
          </p>
          <div className="hero__buttons hero__anim" style={{ animationDelay: '1.7s' }}>
            <button className="btn btn--primary btn--hero" onClick={() => scrollTo('reservar')}>Reservar Mesa</button>
            <button className="btn btn--glass btn--hero" onClick={() => scrollTo('carta')}>Descubrir Carta</button>
          </div>
        </div>
        <button className="hero__arrow" onClick={() => scrollTo('about')} aria-label="Scroll">
          <Icon.ChevronDown />
        </button>
      </section>

      {/* ━━━ TRUST BAR ━━━ */}
      <section className="trust-bar">
        <div className="container">
          <div className="trust-bar__grid">
            <div className="trust-bar__item">
              <AnimatedCounter target={98} />
              <span className="trust-bar__text">Plazas disponibles</span>
            </div>
            <div className="trust-bar__item">
              <AnimatedCounter target={500} suffix="+" />
              <span className="trust-bar__text">Eventos realizados</span>
            </div>
            <div className="trust-bar__item">
              <AnimatedCounter target={4} suffix=".8★" />
              <span className="trust-bar__text">Valoración Google</span>
            </div>
            <div className="trust-bar__item">
              <span className="counter__value">24h</span>
              <span className="trust-bar__text">Reserva online</span>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ NOSOTROS ━━━ */}
      <section id="about" className="sec sec--cream">
        <div className="container">
          <Reveal>
            <span className="sec__label">RESTAURANTE</span>
            <h2 className="sec__heading">Cocina mediterránea<br />junto al Canal Olímpico</h2>
            <div className="sec__line" />
          </Reveal>

          <div className="about-split">
            <Reveal className="about-split__txt">
              <p>
                <strong>Terraza con vistas al agua, cocina mediterránea de calidad y un espacio perfecto para cualquier ocasión.</strong>
              </p>
              <p>
                Ya sea una comida entre amigos, una cena en familia o la celebración que llevas tiempo planeando — en Canal Olímpico tenemos el menú, el espacio y el equipo para hacerlo realidad.
              </p>
              <p>
                Menús de grupo desde 29€/persona con todo incluido. Reserva online en 2 minutos, sin llamar, sin esperar.
              </p>
              <div className="about-chips">
                <span className="chip">🌊 Vistas al agua</span>
                <span className="chip">☀️ Terraza 200m²</span>
                <span className="chip">🍃 Producto Km 0</span>
                <span className="chip">♿ Accesible</span>
              </div>
              <button className="btn btn--primary" onClick={() => scrollTo('reservar')} style={{ marginTop: 20 }}>
                Reservar ahora →
              </button>
            </Reveal>
            <Reveal className="about-split__img" delay={200}>
              <Image src="/terraza.jpg" alt="Terraza Canal Olímpico" width={580} height={400} className="about-photo" sizes="(max-width:768px) 100vw, 50vw" />
            </Reveal>
          </div>

          <Reveal>
            <div className="info-row">
              <div className="info-item">
                <div className="info-item__icon"><Icon.MapPin /></div>
                <div>
                  <h4>Ubicación</h4>
                  <p>Av. del Canal Olímpic, 2<br />08860 Castelldefels, Barcelona</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-item__icon"><Icon.Clock /></div>
                <div>
                  <h4>Horarios</h4>
                  <p>Lunes a Viernes: 8:00 – 18:00<br />Sábados y Domingos: 9:00 – 18:00</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-item__icon"><Icon.Phone /></div>
                <div>
                  <h4>Reservas</h4>
                  <p><a href="tel:938587088">938 58 70 88</a><br /><a href="tel:629358562">629 35 85 62</a></p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━ CARTA ━━━ */}
      <section id="carta" className="sec sec--white">
        <div className="container">
          <Reveal>
            <span className="sec__label">NUESTROS MENÚS</span>
            <h2 className="sec__heading">La carta para tu celebración</h2>
            <div className="sec__line" />
            <p className="sec__sub">Menús cerrados para grupos y eventos. Todo incluido, IVA incluido, sin sorpresas.</p>
          </Reveal>

          {/* Menu category tabs */}
          <Reveal>
            <div className="menu-tabs">
              {MENU_CATS.map(c => (
                <button key={c.key} className={`menu-tab ${menuCat === c.key ? 'menu-tab--active' : ''}`} onClick={() => setMenuCat(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="menus-wrap">
            <button className="menus-arr menus-arr--l" onClick={() => scrollMenus('left')} aria-label="Anterior"><Icon.ArrowLeft /></button>
            <div className="menus-scroll" ref={menuScrollRef}>
              {filteredMenus.map((m, i) => (
                <article key={`${m.name}-${menuCat}`} className={`mc mc--${m.accent}`} style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="mc__accent" />
                  {m.badge && <span className="mc__badge">{m.badge}</span>}
                  <div className="mc__top">
                    <h3>{m.name}</h3>
                    <div className="mc__price">
                      <span className="mc__val">{m.price}</span>
                      <span className="mc__per">{m.priceSub}</span>
                    </div>
                  </div>
                  <div className="mc__sep" />
                  <div className="mc__courses">
                    {m.courses.map((c, j) => (
                      <div key={j} className="mc__course">
                        <span className="mc__clabel">{c.label}</span>
                        <span className="mc__ctext">{c.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mc__foot"><Icon.Wine /> {m.drinks}</div>
                  <div className="mc__cta">
                    <button className="btn btn--primary btn--sm mc__cta-btn" onClick={() => scrollTo('reservar')}>Reservar con este menú</button>
                  </div>
                </article>
              ))}
            </div>
            <button className="menus-arr menus-arr--r" onClick={() => scrollMenus('right')} aria-label="Siguiente"><Icon.ArrowRight /></button>
          </div>
          <div className="menus-dots">
            {filteredMenus.map((_, i) => (
              <button key={i} className={`menus-dot ${i === activeMenu ? 'menus-dot--active' : ''}`} aria-label={`Menú ${i + 1}`}
                onClick={() => { if (!menuScrollRef.current) return; const card = menuScrollRef.current.querySelector('.mc') as HTMLElement | null; const w = card ? card.offsetWidth + 24 : 0; menuScrollRef.current.scrollTo({ left: w * i, behavior: 'smooth' }) }} />
            ))}
          </div>
          <p className="menus-hint">← Desliza para ver todos los menús →</p>
        </Reveal>
      </section>

      {/* ━━━ CTA BANNER ━━━ */}
      <section className="cta-banner">
        <div className="cta-banner__overlay" />
        <div className="container cta-banner__inner">
          <Reveal>
            <span className="cta-banner__label">TU PRÓXIMO EVENTO</span>
            <h2 className="cta-banner__title">¿Celebras algo especial?</h2>
            <p className="cta-banner__sub">Cumpleaños, comuniones, comidas de empresa, fiestas privadas — reserva tu evento en 2 minutos.</p>
            <div className="cta-banner__btns">
              <button className="btn btn--primary btn--hero" onClick={() => scrollTo('reservar')}>Reservar evento →</button>
              <a href="tel:629358562" className="btn btn--glass btn--hero">📞 629 35 85 62</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━ RESERVAR ━━━ */}
      <section id="reservar" className="sec sec--cream">
        <div className="container">
          <Reveal>
            <span className="sec__label">RESERVAS</span>
            <h2 className="sec__heading">Reserva tu mesa o evento</h2>
            <div className="sec__line" />
            <p className="sec__sub">
              Completa el formulario y recibirás confirmación inmediata por email.
              Para grupos, el pago de la señal se gestiona de forma segura online.
            </p>
          </Reveal>
          <Reveal>
            <ReservationForm />
          </Reveal>
        </div>
      </section>

      {/* ━━━ EVENTOS ━━━ */}
      <section id="eventos" className="sec sec--img">
        <Image src="/terraza2.jpg" alt="Eventos Canal Olímpico" fill className="sec--img__bg" sizes="100vw" />
        <div className="sec--img__ov" />
        <div className="container sec--img__z">
          <Reveal>
            <span className="sec__label sec__label--lt">CELEBRACIONES</span>
            <h2 className="sec__heading sec__heading--lt">Eventos &amp; Grupos</h2>
            <div className="sec__line" />
          </Reveal>
          <Reveal>
            <div className="ev-grid">
              {EVENT_DISPLAY.map((ev, i) => {
                const IconComp = EVENT_ICONS[ev.icon]
                return (
                  <div key={i} className="ev">
                    <div className="ev__icon">{IconComp && <IconComp />}</div>
                    <h3>{ev.title}</h3>
                    <p>{ev.desc}</p>
                    <span className="ev__price">{ev.price}</span>
                  </div>
                )
              })}
            </div>
          </Reveal>
          <Reveal>
            <div className="cond">
              <h3 className="cond__title">Condiciones de Reserva</h3>
              <div className="cond__grid">
                {CONDITIONS_DATA.map((c, i) => {
                  const IconComp = CONDITION_ICONS[c.icon]
                  return (
                    <div key={i} className="cond__item">
                      <div className="cond__item-icon">{IconComp && <IconComp />}</div>
                      <p>{c.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━ FAQ ━━━ */}
      <section id="faq" className="sec sec--cream">
        <div className="container">
          <Reveal>
            <span className="sec__label">PREGUNTAS FRECUENTES</span>
            <h2 className="sec__heading">Todo lo que necesitas saber</h2>
            <div className="sec__line" />
          </Reveal>
          <Reveal>
            <div className="faq">{FAQ_DATA.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} index={i} />)}</div>
          </Reveal>
        </div>
      </section>

      {/* ━━━ MAPA Y CONTACTO ━━━ */}
      <section id="mapa" className="sec sec--white">
        <div className="container">
          <Reveal>
            <span className="sec__label">CÓMO LLEGAR</span>
            <h2 className="sec__heading">Encuéntranos</h2>
            <div className="sec__line" />
          </Reveal>
          <Reveal>
            <div className="map-contact">
              <div className="map-contact__map">
                <iframe
                  src="https://maps.google.com/maps?q=Canal+Olimpic+de+Catalunya,+Castelldefels,+Barcelona&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%" height="400" style={{ border: 0, borderRadius: 'var(--radius)' }}
                  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Canal Olímpico" />
              </div>
              <div className="map-contact__info">
                <div className="map-contact__card">
                  <h3>Restaurante Canal Olímpico</h3>
                  <div className="map-contact__row"><Icon.MapPin /><p>Av. del Canal Olímpic, 2<br />08860 Castelldefels, Barcelona</p></div>
                  <div className="map-contact__row"><Icon.Clock /><div><p><strong>L-V:</strong> 8:00 – 18:00</p><p><strong>S-D:</strong> 9:00 – 18:00</p></div></div>
                  <div className="map-contact__row"><Icon.Phone /><div><p><a href="tel:938587088">938 58 70 88</a></p><p><a href="tel:629358562">629 35 85 62</a></p></div></div>
                  <div className="map-contact__row"><Icon.Mail /><p><a href="mailto:canalolimpic@daliagrup.com">canalolimpic@daliagrup.com</a></p></div>
                  <div className="map-contact__actions">
                    <button className="btn btn--primary" onClick={() => scrollTo('reservar')}>Reservar online</button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer id="contacto" className="foot">
        <div className="container">
          <div className="foot__grid">
            <div className="foot__col">
              <h4 className="foot__brand">CANAL OLÍMPICO</h4>
              <p className="foot__tagline">Restaurante · Terraza · Eventos</p>
              <p>Av. del Canal Olímpic, 2<br />08860 Castelldefels, Barcelona</p>
              <div className="foot__social">
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon.Instagram /></a>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" aria-label="Google Maps"><Icon.MapPin /></a>
              </div>
            </div>
            <div className="foot__col">
              <h4>Horario</h4>
              <p>Lunes a Viernes: 8:00 – 18:00</p>
              <p>Sábados y Domingos: 9:00 – 18:00</p>
              <p style={{ marginTop: 12 }} className="foot__highlight">📞 Reservas: <a href="tel:629358562">629 35 85 62</a></p>
            </div>
            <div className="foot__col">
              <h4>Legal</h4>
              <p><Link href="/condiciones">Condiciones de Reserva</Link></p>
              <p><Link href="/cookies">Política de Cookies</Link></p>
              <p><a href="mailto:canalolimpic@daliagrup.com">canalolimpic@daliagrup.com</a></p>
              <div className="foot__badges">
                <span className="foot__badge"><Icon.Shield /> Pago seguro</span>
                <span className="foot__badge"><Icon.Check /> SSL</span>
              </div>
            </div>
          </div>
          <div className="foot__line" />
          <div className="foot__bottom">
            <p>© {new Date().getFullYear()} Canal Olímpico · Dalia Grup — Todos los derechos reservados</p>
            <Link href="/login" className="foot__admin">Panel</Link>
          </div>
        </div>
      </footer>

      {/* ━━━ STICKY MOBILE CTA ━━━ */}
      <div className={`sticky-cta ${scrolled ? 'sticky-cta--show' : ''}`}>
        <button className="btn btn--primary btn--lg sticky-cta__btn" onClick={() => scrollTo('reservar')}>
          🗓️ Reservar Mesa
        </button>
      </div>
    </main>
  )
}
