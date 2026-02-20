'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const navSections = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/calendar', label: 'Calendario', icon: '📅' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/reservations', label: 'Reservas', icon: '📋' },
      { href: '/reservations/new', label: 'Nueva Reserva', icon: '➕' },
      { href: '/tables', label: 'Mesas', icon: '🪑' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/menus', label: 'Menús', icon: '🍽️' },
      { href: '/payments', label: 'Pagos', icon: '💳' },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { href: '/employees', label: 'Empleados', icon: '👥' },
      { href: '/schedules', label: 'Horarios', icon: '🕐' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/settings', label: 'Configuración', icon: '⚙️' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/')

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#f5f3ee' }}>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 flex flex-col shadow-xl z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'linear-gradient(180deg, #1a1814 0%, #2c2820 50%, #1a1814 100%)' }}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(176,141,87,0.2)' }}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #B08D57, #96784a)' }}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Cormorant Garamond, serif' }}>CO</span>
            </div>
            <div>
              <h1
                className="text-base leading-tight"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: '#e8e2d6', fontWeight: 400 }}
              >
                Canal Olímpico
              </h1>
              <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#B08D57' }}>
                Gestión de Reservas
              </p>
            </div>
          </Link>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md"
            style={{ color: '#8a8578' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.label}>
              <p
                className="px-4 py-1 text-[10px] font-semibold uppercase"
                style={{ color: '#8a8578', letterSpacing: '0.12em' }}
              >
                {section.label}
              </p>
              <div className="space-y-0.5 mt-1">
                {section.items.map(item => {
                  const active = isActive(item.href) && !(item.href === '/reservations' && pathname === '/reservations/new')
                  const isNew = item.href === '/reservations/new' && pathname === '/reservations/new'

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, rgba(176,141,87,0.15), rgba(176,141,87,0.08))'
                          : isNew
                            ? 'linear-gradient(135deg, rgba(107,144,128,0.15), rgba(107,144,128,0.08))'
                            : 'transparent',
                        color: active ? '#B08D57' : isNew ? '#6b9080' : '#b0a898',
                        borderLeft: active ? '2px solid #B08D57' : isNew ? '2px solid #6b9080' : '2px solid transparent',
                        fontWeight: active || isNew ? 500 : 400,
                      }}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(176,141,87,0.15)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
            style={{ color: '#8a8578' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(192,57,43,0.1)'; e.currentTarget.style.color = '#c0392b' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8578' }}
          >
            <span className="text-lg">🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: '#faf9f6', borderColor: '#e8e2d6' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg border"
          style={{ borderColor: '#d4c9b0' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#5c5549" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        <h1
          className="text-base"
          style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1a1a1a', fontWeight: 400 }}
        >
          Canal Olímpico
        </h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* ── Spacer for fixed sidebar on desktop ── */}
      <div className="hidden lg:block w-64 flex-shrink-0" aria-hidden />

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
