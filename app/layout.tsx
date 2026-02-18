import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Canal Olímpico — Restaurante · Terraza · Eventos | Castelldefels',
  description: 'Restaurante Canal Olímpico en Castelldefels. Terraza, eventos, reservas de grupo y gastronomía mediterránea junto al Canal Olímpic.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}