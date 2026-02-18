'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Datos de menús ─────────────────────────────────────────────────────── */
const MENUS = [
  {
    name: 'Menú Grupo Premium',
    price: '34€',
    priceSub: 'por persona',
    items: [
      'Embutidos ibéricos, pan coca tomate, bravas',
      'Solomillo pimienta / Bacalao setas / Parrillada verduras',
      'Tarta o Helado',
    ],
    drinks: '1 bebida + agua + café/infusión',
    accent: 'terracota',
  },
  {
    name: 'Menú Grupo',
    price: '29€',
    priceSub: 'por persona',
    items: [
      'Rigatoni crema tomate / Ensalada cabra frutos rojos',
      'Solomillo pimienta verde / Lubina horno / Parrillada verduras',
      'Sorbete limón cava / Macedonia frutas',
    ],
    drinks: '1 bebida + agua',
    accent: 'gold',
  },
  {
    name: 'Pica-Pica Premium',
    price: '34€',
    priceSub: 'por persona',
    items: [
      'Embutidos ibéricos, pan coca, bravas',
      'Brocheta sepia y gambas, alcachofas jamón pato',
      'Ensaladitas cabra, saquitos carrillera',
      'Croquetas, minihamburguesas brioxe',
    ],
    drinks: '2 bebidas',
    accent: 'terracota',
  },
  {
    name: 'Pica-Pica',
    price: '30€',
    priceSub: 'por persona',
    items: [
      'Tortilla patatas, croquetas',
      'Minihamburguesas brioxe, calamarcitos andaluza',
      'Fingers pollo, nachos guacamole',
    ],
    drinks: '2 bebidas',
    accent: 'gold',
  },
  {
    name: 'Menú Infantil',
    price: '14,50€',
    priceSub: 'por niño',
    items: [
      'Macarrones tomate / Hamburguesa patatas',
      'Fingers pollo / Canelones',
      'Tarta / Helado / Yogur',
    ],
    drinks: '1 refresco/zumo/agua',
    accent: 'terracota',
  },
  {
    name: 'Menú Padres / Adultos',
    price: '38€',
    priceSub: 'por persona',
    items: [
      'Menú completo para adultos acompañantes',
      'en eventos infantiles',
    ],
    drinks: '1 bebida + agua + café',
    accent: 'gold',
  },
]

const EVENT_TYPES = [
  {
    icon: '🍽️',
    title: 'Grupo Sentado',
    desc: 'Comidas y cenas de grupo con menú servido a mesa.',
  },
  {
    icon: '🥘',
    title: 'Pica-Pica',
    desc: 'Formato cocktail con variedad de platos para compartir.',
  },
  {
    icon: '🎂',
    title: 'Infantil / Cumpleaños',
    desc: 'Celebraciones para los más pequeños con menú adaptado.',
  },
  {
    icon: '🌙',
    title: 'Nocturna Exclusiva',
    desc: 'Eventos nocturnos con terraza privada y extensión horaria.',
  },
]

const CONDITIONS = [
  { icon: '💳', text: 'Señal del 40% para confirmar reserva' },
  { icon: '📅', text: 'Mínimo 5 días de antelación' },
  { icon: '⏳', text: '4 días para realizar el pago' },
  { icon: '🔄', text: 'Cancelación/modificación hasta 72h antes' },
  { icon: '⚠️', text: 'Alergias: avisar con 72h de antelación' },
  { icon: '📋', text: 'IVA incluido en todos los precios' },
]

/* ─── Componente principal ───────────────────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const menuScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollMenus = (dir: 'left' | 'right') => {
    if (!menuScrollRef.current) return
    const amount = menuScrollRef.current.offsetWidth * 0.8
    menuScrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  const scrollTo = (id: string) => {
    setMobileMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="landing">
      {/* ───── NAVBAR ───── */}
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner">
          <button className="navbar__logo" onClick={() => scrollTo('hero')}>
            CANAL OLÍMPICO
          </button>

          {/* Desktop links */}
          <div className="navbar__links">
            <button onClick={() => scrollTo('about')}>Sobre Nosotros</button>
            <button onClick={() => scrollTo('carta')}>Carta</button>
            <button onClick={() => scrollTo('eventos')}>Eventos</button>
            <button onClick={() => scrollTo('contacto')}>Contacto</button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Menú"
          >
            <span className={`hamburger-line ${mobileMenu ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileMenu ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileMenu ? 'open' : ''}`} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenu && (
          <div className="navbar__mobile">
            <button onClick={() => scrollTo('about')}>Sobre Nosotros</button>
            <button onClick={() => scrollTo('carta')}>Carta</button>
            <button onClick={() => scrollTo('eventos')}>Eventos</button>
            <button onClick={() => scrollTo('contacto')}>Contacto</button>
          </div>
        )}
      </nav>

      {/* ───── HERO ───── */}
      <section id="hero" className="hero">
        <div className="hero__content">
          <p className="hero__tagline">Restaurante · Terraza · Eventos</p>
          <h1 className="hero__title">CANAL<br />OLÍMPICO</h1>
          <p className="hero__location">
            Av. del Canal Olímpic, 2 — Castelldefels, Barcelona
          </p>
          <button className="btn-primary" onClick={() => scrollTo('carta')}>
            Descubre Nuestra Carta
          </button>
        </div>
        <div className="hero__fade" />
      </section>

      {/* ───── SOBRE NOSOTROS ───── */}
      <section id="about" className="section section--sand">
        <div className="container">
          <h2 className="section__title">Bienvenidos</h2>
          <p className="section__subtitle">
            Un espacio único junto al Canal Olímpico de Castelldefels donde
            disfrutar de buena gastronomía, terraza al aire libre y eventos
            inolvidables.
          </p>

          <div className="info-grid">
            <div className="info-card">
              <span className="info-card__icon">📍</span>
              <h3>Ubicación</h3>
              <p>Av. del Canal Olímpic, 2<br />08860 Castelldefels, Barcelona</p>
            </div>
            <div className="info-card">
              <span className="info-card__icon">🕐</span>
              <h3>Horarios</h3>
              <p>Lunes a Viernes: 8:00 – 18:00<br />Sábados y Domingos: 9:00 – 18:00</p>
            </div>
            <div className="info-card">
              <span className="info-card__icon">📞</span>
              <h3>Contacto</h3>
              <p>
                <a href="tel:938587088">938 58 70 88</a><br />
                <a href="tel:629358562">629 35 85 62</a> (Reservas)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── CARTA / MENÚS ───── */}
      <section id="carta" className="section section--cream">
        <div className="container">
          <h2 className="section__title">Nuestra Carta de Menús</h2>
          <p className="section__subtitle">
            Descubre nuestras opciones para grupos y eventos. Todos los precios incluyen IVA.
          </p>
        </div>

        <div className="menus-wrapper">
          <button
            className="menus-arrow menus-arrow--left"
            onClick={() => scrollMenus('left')}
            aria-label="Anterior"
          >
            ‹
          </button>

          <div className="menus-scroll" ref={menuScrollRef}>
            {MENUS.map((menu, i) => (
              <article
                key={i}
                className={`menu-card menu-card--${menu.accent}`}
              >
                <div className="menu-card__header">
                  <h3>{menu.name}</h3>
                  <div className="menu-card__price">
                    <span className="price-value">{menu.price}</span>
                    <span className="price-sub">{menu.priceSub}</span>
                  </div>
                </div>
                <ul className="menu-card__items">
                  {menu.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
                <div className="menu-card__drinks">
                  🥂 {menu.drinks}
                </div>
              </article>
            ))}
          </div>

          <button
            className="menus-arrow menus-arrow--right"
            onClick={() => scrollMenus('right')}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>

        <p className="menus-hint">← Desliza para ver más menús →</p>
      </section>

      {/* ───── EVENTOS ───── */}
      <section id="eventos" className="section section--sand">
        <div className="container">
          <h2 className="section__title">Eventos y Reservas de Grupo</h2>
          <p className="section__subtitle">
            Organizamos tu evento a medida. Elige el formato que mejor se adapte
            a tu celebración.
          </p>

          <div className="events-grid">
            {EVENT_TYPES.map((ev, i) => (
              <div key={i} className="event-card">
                <span className="event-card__icon">{ev.icon}</span>
                <h3>{ev.title}</h3>
                <p>{ev.desc}</p>
              </div>
            ))}
          </div>

          <div className="conditions">
            <h3 className="conditions__title">Condiciones de Reserva</h3>
            <div className="conditions-grid">
              {CONDITIONS.map((c, i) => (
                <div key={i} className="condition-item">
                  <span>{c.icon}</span>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="cta-block">
            <p>¿Quieres reservar para tu grupo o evento?</p>
            <div className="cta-buttons">
              <a href="tel:629358562" className="btn-primary">
                📞 Llamar: 629 35 85 62
              </a>
              <a
                href="https://wa.me/34629358562"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer id="contacto" className="footer">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__col">
              <h4>CANAL OLÍMPICO</h4>
              <p>Restaurante · Terraza · Eventos</p>
              <p className="footer__address">
                Av. del Canal Olímpic, 2<br />
                08860 Castelldefels, Barcelona
              </p>
            </div>
            <div className="footer__col">
              <h4>Horario</h4>
              <p>Lunes a Viernes: 8:00 – 18:00</p>
              <p>Sábados y Domingos: 9:00 – 18:00</p>
            </div>
            <div className="footer__col">
              <h4>Contacto</h4>
              <p><a href="tel:938587088">938 58 70 88</a></p>
              <p><a href="tel:629358562">629 35 85 62</a> (Reservas)</p>
              <p>
                <a
                  href="https://wa.me/34629358562"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Reservas
                </a>
              </p>
            </div>
          </div>

          <div className="footer__bottom">
            <p>© {new Date().getFullYear()} Canal Olímpico — Todos los derechos reservados</p>
            <Link href="/login" className="footer__admin-link">
              Acceso Panel de Reservas
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}