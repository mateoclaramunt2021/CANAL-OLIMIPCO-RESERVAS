import type { Metadata } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import CookieBanner from '../components/CookieBanner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

/* ═══════════════════════════════════════════════════════════════════════════
   SEO — Metadata global optimizada para posicionamiento local
   ═══════════════════════════════════════════════════════════════════════════ */
const SITE_URL = 'https://canalolimpicorestaurante.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Restaurante Canal Olímpico Castelldefels — Terraza, Eventos y Grupos | Comer en Castelldefels',
    template: '%s | Restaurante Canal Olímpico Castelldefels',
  },
  description:
    'Restaurante Canal Olímpico en Castelldefels, Barcelona. Terraza mediterránea, eventos, ' +
    'cumpleaños infantiles, grupos, menús desde 14,50 €. Reserva online tu mesa junto al Canal Olímpic. ' +
    'El mejor restaurante de Castelldefels para comer, cenar y celebrar.',
  keywords: [
    'restaurante castelldefels',
    'restaurantes en castelldefels',
    'comer en castelldefels',
    'terraza castelldefels',
    'restaurante canal olimpic',
    'restaurante canal olímpico',
    'restaurante terraza castelldefels',
    'eventos castelldefels',
    'cumpleaños infantil castelldefels',
    'restaurante grupo castelldefels',
    'menú grupo castelldefels',
    'restaurante terraza cerca de barcelona',
    'restaurante mediterráneo castelldefels',
    'reservar restaurante castelldefels',
    'restaurante para eventos barcelona',
    'comer canal olimpic',
    'mejor restaurante castelldefels',
    'restaurante con parking castelldefels',
    'restaurante familiar castelldefels',
    'restaurante baix llobregat',
  ],

  // Open Graph
  openGraph: {
    title: 'Restaurante Canal Olímpico — Terraza, Eventos y Grupos en Castelldefels',
    description:
      'Reserva tu mesa o evento en el mejor restaurante con terraza de Castelldefels. ' +
      'Cocina mediterránea, menús de grupo, cumpleaños infantiles y eventos nocturnos junto al Canal Olímpic.',
    siteName: 'Restaurante Canal Olímpico',
    locale: 'es_ES',
    type: 'website',
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/hero.jpg`,
        width: 1200,
        height: 630,
        alt: 'Restaurante Canal Olímpico — Terraza en Castelldefels con vistas al Canal Olímpic',
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: 'Restaurante Canal Olímpico — Castelldefels',
    description: 'Terraza mediterránea, eventos, grupos y cumpleaños junto al Canal Olímpic. Reserva online.',
    images: [`${SITE_URL}/hero.jpg`],
  },

  // Alternates / Canonical
  alternates: {
    canonical: SITE_URL,
    languages: {
      'es-ES': SITE_URL,
    },
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification
  verification: {
    google: 'google2821968787186af3',
  },

  // App links
  manifest: '/manifest.json',

  // Category
  category: 'restaurant',

  // Other
  other: {
    'geo.region': 'ES-CT',
    'geo.placename': 'Castelldefels',
    'geo.position': '41.2755;2.0636',
    'ICBM': '41.2755, 2.0636',
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   JSON-LD — Schema.org para Google Rich Results
   ═══════════════════════════════════════════════════════════════════════════ */
const jsonLdRestaurant = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  '@id': `${SITE_URL}/#restaurant`,
  name: 'Restaurante Canal Olímpico',
  alternateName: 'Canal Olímpic Restaurant',
  description:
    'Restaurante con terraza mediterránea en Castelldefels junto al Canal Olímpic de Catalunya. ' +
    'Cocina mediterránea, eventos, grupos, cumpleaños infantiles y reservas online.',
  url: SITE_URL,
  telephone: '+34930347246',
  email: 'canalolimpic@daliagrup.com',
  image: `${SITE_URL}/hero.jpg`,
  logo: `${SITE_URL}/hero.jpg`,
  priceRange: '€€',
  servesCuisine: ['Mediterránea', 'Española', 'Catalana'],
  acceptsReservations: true,
  menu: `${SITE_URL}/#menus`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. del Canal Olímpic, 2',
    addressLocality: 'Castelldefels',
    addressRegion: 'Barcelona',
    postalCode: '08860',
    addressCountry: 'ES',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 41.2755,
    longitude: 2.0636,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: '09:00',
      closes: '18:00',
    },
  ],
  hasMenu: [
    {
      '@type': 'Menu',
      name: 'Menú Grupo Premium',
      description: 'Menú servido a mesa para grupos desde 7 personas a 34€/persona',
    },
    {
      '@type': 'Menu',
      name: 'Menú Grupo',
      description: 'Menú servido a mesa para grupos desde 7 personas a 29€/persona',
    },
    {
      '@type': 'Menu',
      name: 'Pica-Pica Premium',
      description: 'Formato cocktail con selección de platos para compartir a 34€/persona',
    },
    {
      '@type': 'Menu',
      name: 'Menú Infantil',
      description: 'Menú para niños a 14,50€/niño ideal para cumpleaños',
    },
  ],
  areaServed: [
    { '@type': 'City', name: 'Castelldefels' },
    { '@type': 'City', name: 'Gavà' },
    { '@type': 'City', name: 'Viladecans' },
    { '@type': 'City', name: 'Barcelona' },
    { '@type': 'AdministrativeArea', name: 'Baix Llobregat' },
  ],
  amenityFeature: [
    { '@type': 'LocationFeatureSpecification', name: 'Terraza', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Parking gratuito', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Zona infantil', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Eventos privados', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Wi-Fi', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Acceso silla de ruedas', value: true },
  ],
  paymentAccepted: 'Efectivo, Tarjeta de crédito, Tarjeta de débito',
  currenciesAccepted: 'EUR',
  sameAs: [
    'https://www.instagram.com/canalolimpicrestaurant/',
  ],
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cuál es el horario del restaurante Canal Olímpico en Castelldefels?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'De lunes a viernes de 8:00 a 18:00h. Sábados y domingos de 9:00 a 18:00h. Para eventos nocturnos privados, consultar disponibilidad.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Hay parking disponible en el restaurante Canal Olímpico?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, disponemos de un amplio aparcamiento gratuito junto al restaurante, ideal para grupos grandes.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo reservar para más de 6 personas en Canal Olímpico Castelldefels?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Por supuesto. Para grupos de 7 o más personas selecciona la opción "Grupo / Evento" en el formulario de reserva. Tenemos menús cerrados desde 29€/persona con todo incluido.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo funciona la señal para grupos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Al reservar un evento o grupo se requiere una señal del 40% del total, que puedes pagar online de forma segura. Tienes 4 días para completar el pago desde la confirmación.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo cancelar o modificar mi reserva en el restaurante?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Puedes modificar tu reserva hasta 72 horas antes del evento. Si cancelas fuera de plazo, la señal no se devuelve. Para mesas individuales, puedes cancelar con 24h de antelación.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Tienen opciones para alérgenos o intolerancias alimentarias?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Solo necesitas indicarlo con un mínimo de 72 horas de antelación para que nuestro equipo de cocina prepare las adaptaciones necesarias.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Pueden venir niños al restaurante Canal Olímpico?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, tenemos menú infantil (14,50€) con opciones adaptadas. También organizamos cumpleaños y fiestas infantiles con zona reservada.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Se admiten mascotas en la terraza del restaurante?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, las mascotas son bienvenidas en la terraza exterior. Solo pedimos que estén atadas y no molesten al resto de clientes.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Hay mínimo de personas para reservar en el restaurante Canal Olímpico?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Para mesas individuales puedes reservar desde 1 persona. Para grupos y eventos, el mínimo es de 7 personas.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Se puede personalizar el menú de grupo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Los menús de grupo son cerrados para garantizar la calidad del servicio. Si necesitas adaptaciones por alergias o intolerancias, no dudes en contactarnos con antelación.',
      },
    },
  ],
}

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: SITE_URL,
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable}`}>
      <head>
        {/* JSON-LD Structured Data for Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdRestaurant) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
        />
        {/* Geo meta tags for local SEO */}
        <meta name="geo.region" content="ES-CT" />
        <meta name="geo.placename" content="Castelldefels" />
        <meta name="geo.position" content="41.2755;2.0636" />
        <meta name="ICBM" content="41.2755, 2.0636" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}