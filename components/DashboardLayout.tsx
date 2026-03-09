'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD LAYOUT — 100% inline styles for tablet TPV compatibility
   ═══════════════════════════════════════════════════════════════════════════ */

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
      { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: '💬' },
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
  const [authChecked, setAuthChecked] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // ── Detect desktop vs tablet/mobile ──
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Auth guard: check cookie (no JS-dependency on Supabase client) ──
  useEffect(() => {
    // Check if the sb-logged-in cookie exists
    const hasAuthCookie = document.cookie.split(';').some(c => c.trim().startsWith('sb-logged-in='))
    if (!hasAuthCookie) {
      // No cookie = not logged in, redirect to login
      window.location.href = '/login'
    } else {
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f5f3ee', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #B08D57', borderTopColor: 'transparent',
            borderRadius: '50%', margin: '0 auto 12px',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: '#8a8578' }}>Verificando sesión...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    // Server-side logout (clears cookies, works without JS)
    window.location.href = '/api/auth/logout'
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/')

  const showSidebar = isDesktop || sidebarOpen

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: isDesktop ? 'row' : 'column',
      background: '#f5f3ee',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && !isDesktop && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 30 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: '256px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)', zIndex: 40,
        background: 'linear-gradient(180deg, #1a1814 0%, #2c2820 50%, #1a1814 100%)',
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(176,141,87,0.2)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #B08D57, #96784a)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: 'Georgia, serif' }}>CO</span>
            </div>
            <div>
              <div style={{ fontSize: '16px', color: '#e8e2d6', fontWeight: 400, fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
                Canal Olímpico
              </div>
              <div style={{ fontSize: '10px', color: '#B08D57', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Gestión de Reservas
              </div>
            </div>
          </Link>
          {!isDesktop && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#8a8578' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {navSections.map(section => (
            <div key={section.label} style={{ marginBottom: '20px' }}>
              <p style={{ padding: '4px 16px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#8a8578', letterSpacing: '0.12em' }}>
                {section.label}
              </p>
              <div style={{ marginTop: '4px' }}>
                {section.items.map(item => {
                  const active = isActive(item.href) && !(item.href === '/reservations' && pathname === '/reservations/new')
                  const isNew = item.href === '/reservations/new' && pathname === '/reservations/new'
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                        borderRadius: '8px', fontSize: '14px', textDecoration: 'none', marginBottom: '2px',
                        background: active ? 'rgba(176,141,87,0.12)' : isNew ? 'rgba(107,144,128,0.12)' : 'transparent',
                        color: active ? '#B08D57' : isNew ? '#6b9080' : '#b0a898',
                        borderLeft: active ? '2px solid #B08D57' : isNew ? '2px solid #6b9080' : '2px solid transparent',
                        fontWeight: active || isNew ? 500 : 400,
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(176,141,87,0.15)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '8px', fontSize: '14px',
              color: '#8a8578', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(192,57,43,0.1)'; e.currentTarget.style.color = '#c0392b' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8578' }}
          >
            <span style={{ fontSize: '18px' }}>🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      {!isDesktop && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: '#faf9f6', borderBottom: '1px solid #e8e2d6',
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d4c9b0', background: 'none', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#5c5549" strokeWidth="2">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <span style={{ fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
            Canal Olímpico
          </span>
          <div style={{ width: '36px' }} />
        </div>
      )}

      {/* ── Desktop sidebar spacer ── */}
      {isDesktop && <div style={{ width: '256px', flexShrink: 0 }} />}

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, minHeight: '100vh', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
