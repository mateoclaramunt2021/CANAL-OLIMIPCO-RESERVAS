'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN — 100% inline styles for maximum tablet/TPV browser compatibility
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validateForm = () => {
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio')
      return false
    }
    if (!password.trim()) {
      setError('La contraseña es obligatoria')
      return false
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('El correo electrónico no tiene un formato válido')
      return false
    }
    return true
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      })

      if (result.error) {
        setError(result.error.message || 'Error de autenticación')
      } else if (result.data && result.data.user) {
        window.location.href = '/dashboard'
      } else {
        setError('No se pudo iniciar sesión')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err && err.message ? err.message : 'Error inesperado. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #1e40af 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      margin: 0,
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        padding: '40px 32px',
        border: '1px solid rgba(255,255,255,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontWeight: 700,
                fontSize: '20px',
                color: '#4f46e5',
              }}>CO</span>
            </div>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#4f46e5',
            margin: '0 0 8px',
          }}>Gestión de Reservas</h1>
          <h2 style={{
            fontSize: '18px',
            color: '#334155',
            fontWeight: 600,
            margin: 0,
          }}>Canal Olímpico</h2>
          <div style={{
            marginTop: '16px',
            width: '96px',
            height: '4px',
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            borderRadius: '4px',
            margin: '16px auto 0',
          }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '8px',
            }}>
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              placeholder="usuario@canalolimpico.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '8px',
            }}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: loading ? '#93a3b8' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              opacity: loading ? 0.7 : 1,
              WebkitAppearance: 'none',
            }}
          >
            {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, margin: '0 0 4px' }}>
            Sistema de Gestión Empresarial Premium
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Versión 1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}