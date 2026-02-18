import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Canal Olímpico — Restaurante · Terraza · Eventos | Castelldefels',
  description: 'Restaurante Canal Olímpico en Castelldefels. Terraza, eventos, reservas de grupo y gastronomía mediterránea junto al Canal Olímpic.',
  metadataBase: new URL('https://reservascanalolimpico.netlify.app'),
  openGraph: {
    title: 'Canal Olímpico — Restaurante · Terraza · Eventos',
    description: 'Reserva tu mesa o evento en el mejor restaurante junto al Canal Olímpic de Castelldefels.',
    siteName: 'Canal Olímpico',
    locale: 'es_ES',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}