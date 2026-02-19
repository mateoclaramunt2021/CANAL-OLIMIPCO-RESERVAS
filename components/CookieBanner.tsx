'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = (value: 'all' | 'necessary') => {
    localStorage.setItem('cookie_consent', value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookies">
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          Utilizamos cookies técnicas necesarias para el funcionamiento del sitio y cookies de terceros para
          el procesamiento seguro de pagos (Stripe).{' '}
          <Link href="/cookies">Más información</Link>
        </p>
        <div className="cookie-banner__actions">
          <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={() => accept('all')}>
            Aceptar
          </button>
          <button className="cookie-banner__btn cookie-banner__btn--necessary" onClick={() => accept('necessary')}>
            Solo necesarias
          </button>
        </div>
      </div>
    </div>
  )
}
