'use client'

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
    label: 'Sistema',
    items: [
      { href: '/settings', label: 'Configuración', icon: '⚙️' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/')

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f3ee' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col fixed h-full shadow-xl z-10"
        style={{ background: 'linear-gradient(180deg, #1a1814 0%, #2c2820 50%, #1a1814 100%)' }}
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(176,141,87,0.2)' }}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
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

      {/* Main content */}
      <main className="flex-1 ml-64" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
