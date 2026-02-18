'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Landing Page Enterprise Gourmet
   ═══════════════════════════════════════════════════════════════════════════ */

const MENUS = [
  {
    name: 'Menú Grupo Premium',
    price: '34€',
    priceSub: 'por persona',
    badge: 'PREMIUM',
    courses: [
      { label: 'COMPARTIR', text: 'Embutidos ibéricos · Pan coca tomate · Bravas' },
      { label: 'PRINCIPAL', text: 'Solomillo pimienta / Bacalao setas / Parrillada verduras' },
      { label: 'POSTRE', text: 'Tarta o Helado' },
    ],
    drinks: '1 bebida + agua + café/infusión',
    accent: 'terracota' as const,
  },
  {
    name: 'Menú Grupo',
    price: '29€',
    priceSub: 'por persona',
    badge: null,
    courses: [
      { label: 'PRIMERO', text: 'Rigatoni crema tomate / Ensalada cabra frutos rojos' },
      { label: 'PRINCIPAL', text: 'Solomillo pimienta verde / Lubina horno / Parrillada verduras' },
      { label: 'POSTRE', text: 'Sorbete limón cava / Macedonia frutas' },
    ],
    drinks: '1 bebida + agua',
    accent: 'gold' as const,
  },
  {
    name: 'Pica-Pica Premium',
    price: '34€',
    priceSub: 'por persona',
    badge: 'PREMIUM',
    courses: [
      { label: 'SELECCIÓN', text: 'Embutidos ibéricos · Pan coca · Bravas' },
      { label: 'MAR Y TIERRA', text: 'Brocheta sepia y gambas · Alcachofas jamón pato' },
      { label: 'CLÁSICOS', text: 'Ensaladitas cabra · Saquitos carrillera · Croquetas · Minihamburguesas' },
    ],
    drinks: '2 bebidas',
    accent: 'terracota' as const,
  },
  {
    name: 'Pica-Pica',
    price: '30€',
    priceSub: 'por persona',
    badge: null,
    courses: [
      { label: 'SELECCIÓN', text: 'Tortilla patatas · Croquetas' },
      { label: 'CLÁSICOS', text: 'Minihamburguesas brioxe · Calamarcitos andaluza' },
      { label: 'SNACKS', text: 'Fingers pollo · Nachos guacamole' },
    ],
    drinks: '2 bebidas',
    accent: 'gold' as const,
  },
  {
    name: 'Menú Infantil',
    price: '14,50€',
    priceSub: 'por niño',
    badge: null,
    courses: [
      { label: 'PRINCIPAL', text: 'Macarrones tomate / Hamburguesa patatas / Fingers pollo / Canelones' },
      { label: 'POSTRE', text: 'Tarta / Helado / Yogur' },
    ],
    drinks: '1 refresco/zumo/agua',
    accent: 'terracota' as const,
  },
  {
    name: 'Menú Padres / Adultos',
    price: '38€',
    priceSub: 'por persona',
    badge: null,
    courses: [
      { label: 'MENÚ COMPLETO', text: 'Para adultos acompañantes en eventos infantiles' },
    ],
    drinks: '1 bebida + agua + café',
    accent: 'gold' as const,
  },
]

const EVENT_TYPES = [
  { icon: '🍽️', title: 'Grupo Sentado', desc: 'Comidas y cenas de grupo con menú servido a mesa en un entorno exclusivo.' },
  { icon: '🥂', title: 'Pica-Pica', desc: 'Formato cocktail con una selección de platos para compartir en ambiente distendido.' },
  { icon: '🎂', title: 'Infantil / Cumpleaños', desc: 'Celebraciones para los más pequeños con menú adaptado y espacio dedicado.' },
  { icon: '✨', title: 'Nocturna Exclusiva', desc: 'Eventos nocturnos con terraza privada y posibilidad de extensión horaria.' },
]

const CONDITIONS = [
  { icon: '💳', text: 'Señal del 40% para confirmar' },
  { icon: '📅', text: 'Mínimo 5 días de antelación' },
  { icon: '⏳', text: '4 días para realizar el pago' },
  { icon: '🔄', text: 'Modificación hasta 72h antes' },
  { icon: '⚠️', text: 'Alergias: avisar 72h antes' },
  { icon: '📋', text: 'IVA incluido en todos los precios' },
]

/* ─── Hook: Reveal on scroll ─────────────────────────────────────────────── */
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

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal()
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const menuScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollMenus = useCallback((dir: 'left' | 'right') => {
    if (!menuScrollRef.current) return
    const amt = menuScrollRef.current.offsetWidth * 0.75
    menuScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' })
  }, [])

  const scrollTo = useCallback((id: string) => {
    setMobileMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const NAV_ITEMS = [
    { id: 'about', label: 'Nosotros' },
    { id: 'carta', label: 'Carta' },
    { id: 'eventos', label: 'Eventos' },
    { id: 'contacto', label: 'Contacto' },
  ]

  return (
    <main className="landing">

      {/* ━━━━━━━━━━━━━━━━━ NAVBAR ━━━━━━━━━━━━━━━━━ */}
      <nav className={`nav ${scrolled ? 'nav--solid' : ''}`}>
        <div className="nav__inner">
          <button className="nav__logo" onClick={() => scrollTo('hero')}>
            CANAL OLÍMPICO
          </button>
          <div className="nav__links">
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)}>{n.label}</button>
            ))}
          </div>
          <button className="nav__burger" onClick={() => setMobileMenu(v => !v)} aria-label="Menú">
            <span className={mobileMenu ? 'open' : ''} />
            <span className={mobileMenu ? 'open' : ''} />
            <span className={mobileMenu ? 'open' : ''} />
          </button>
        </div>
        <div className={`nav__mobile ${mobileMenu ? 'nav__mobile--open' : ''}`}>
          {NAV_ITEMS.map(n => (
            <button key={n.id} onClick={() => scrollTo(n.id)}>{n.label}</button>
          ))}
        </div>
      </nav>

      {/* ━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━ */}
      <section id="hero" className="hero">
        <Image src="/hero.jpg" alt="Canal Olímpico Restaurante" fill priority className="hero__img" sizes="100vw" />
        <div className="hero__overlay" />
        <div className="hero__content">
          <span className="hero__tag">Restaurante · Terraza · Eventos</span>
          <h1 className="hero__title">CANAL<br />OLÍMPICO</h1>
          <div className="hero__line" />
          <p className="hero__loc">Av. del Canal Olímpic, 2 — Castelldefels, Barcelona</p>
          <button className="btn btn--gold" onClick={() => scrollTo('carta')}>Descubre Nuestra Carta</button>
        </div>
        <button className="hero__arrow" onClick={() => scrollTo('about')} aria-label="Scroll">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </section>

      {/* ━━━━━━━━━━━━━━━━━ NOSOTROS ━━━━━━━━━━━━━━━━━ */}
      <section id="about" className="sec sec--cream">
        <div className="container">
          <Reveal>
            <span className="sec__label">BIENVENIDOS</span>
            <h2 className="sec__heading">Una experiencia<br />junto al canal</h2>
            <div className="sec__line" />
          </Reveal>

          <div className="about-split">
            <Reveal className="about-split__txt">
              <p>
                Situado en un enclave privilegiado junto al Canal Olímpico de Castelldefels,
                nuestro restaurante ofrece una propuesta gastronómica mediterránea cuidada,
                en un espacio diseñado para disfrutar de la mejor cocina al aire libre.
              </p>
              <p>
                Con una amplia terraza, ambiente acogedor y un equipo dedicado,
                somos el lugar ideal tanto para tu comida del día a día como para
                celebrar los momentos más especiales.
              </p>
            </Reveal>
            <Reveal className="about-split__img">
              <Image src="/terraza.jpg" alt="Terraza Canal Olímpico" width={580} height={400} className="about-photo" sizes="(max-width:768px) 100vw, 50vw" />
            </Reveal>
          </div>

          <Reveal>
            <div className="info-row">
              <div className="info-item">
                <div className="info-item__bar" />
                <div>
                  <h4>Ubicación</h4>
                  <p>Av. del Canal Olímpic, 2<br />08860 Castelldefels, Barcelona</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-item__bar" />
                <div>
                  <h4>Horarios</h4>
                  <p>Lunes a Viernes: 8:00 – 18:00<br />Sábados y Domingos: 9:00 – 18:00</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-item__bar" />
                <div>
                  <h4>Reservas</h4>
                  <p><a href="tel:938587088">938 58 70 88</a><br /><a href="tel:629358562">629 35 85 62</a></p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━ CARTA ━━━━━━━━━━━━━━━━━ */}
      <section id="carta" className="sec sec--white">
        <div className="container">
          <Reveal>
            <span className="sec__label">GASTRONOMÍA</span>
            <h2 className="sec__heading">Nuestra Carta</h2>
            <div className="sec__line" />
            <p className="sec__sub">Menús diseñados para grupos y celebraciones. IVA incluido.</p>
          </Reveal>
        </div>

        <Reveal>
          <div className="menus-wrap">
            <button className="menus-arr menus-arr--l" onClick={() => scrollMenus('left')} aria-label="Anterior">‹</button>
            <div className="menus-scroll" ref={menuScrollRef}>
              {MENUS.map((m, i) => (
                <article key={i} className={`mc mc--${m.accent}`}>
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
                  <div className="mc__foot">🥂 {m.drinks}</div>
                </article>
              ))}
            </div>
            <button className="menus-arr menus-arr--r" onClick={() => scrollMenus('right')} aria-label="Siguiente">›</button>
          </div>
          <p className="menus-hint">← Desliza para ver más →</p>
        </Reveal>
      </section>

      {/* ━━━━━━━━━━━━━━━━━ EVENTOS ━━━━━━━━━━━━━━━━━ */}
      <section id="eventos" className="sec sec--img">
        <Image src="/terraza2.jpg" alt="Eventos Canal Olímpico" fill className="sec--img__bg" sizes="100vw" />
        <div className="sec--img__ov" />
        <div className="container sec--img__z">
          <Reveal>
            <span className="sec__label sec__label--lt">CELEBRACIONES</span>
            <h2 className="sec__heading sec__heading--lt">Eventos &amp; Grupos</h2>
            <div className="sec__line sec__line--lt" />
          </Reveal>
          <Reveal>
            <div className="ev-grid">
              {EVENT_TYPES.map((ev, i) => (
                <div key={i} className="ev">
                  <span className="ev__icon">{ev.icon}</span>
                  <h3>{ev.title}</h3>
                  <p>{ev.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <div className="cond">
              <h3 className="cond__title">Condiciones de Reserva</h3>
              <div className="cond__grid">
                {CONDITIONS.map((c, i) => (
                  <div key={i} className="cond__item">
                    <span>{c.icon}</span><p>{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal>
            <div className="cta">
              <p className="cta__text">¿Quieres reservar para tu grupo o evento?</p>
              <div className="cta__btns">
                <a href="tel:629358562" className="btn btn--gold">Llamar: 629 35 85 62</a>
                <a href="https://wa.me/34629358562" target="_blank" rel="noopener noreferrer" className="btn btn--outline-lt">WhatsApp</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━ */}
      <footer id="contacto" className="foot">
        <div className="container">
          <div className="foot__grid">
            <div className="foot__col">
              <h4 className="foot__brand">CANAL OLÍMPICO</h4>
              <p className="foot__tagline">Restaurante · Terraza · Eventos</p>
              <p>Av. del Canal Olímpic, 2<br />08860 Castelldefels, Barcelona</p>
            </div>
            <div className="foot__col">
              <h4>Horario</h4>
              <p>Lunes a Viernes: 8:00 – 18:00</p>
              <p>Sábados y Domingos: 9:00 – 18:00</p>
            </div>
            <div className="foot__col">
              <h4>Contacto</h4>
              <p><a href="tel:938587088">938 58 70 88</a></p>
              <p><a href="tel:629358562">629 35 85 62</a> — Reservas</p>
              <p><a href="https://wa.me/34629358562" target="_blank" rel="noopener noreferrer">WhatsApp Reservas</a></p>
            </div>
          </div>
          <div className="foot__line" />
          <div className="foot__bottom">
            <p>© {new Date().getFullYear()} Canal Olímpico — Todos los derechos reservados</p>
            <Link href="/login" className="foot__admin">Acceso Panel</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

