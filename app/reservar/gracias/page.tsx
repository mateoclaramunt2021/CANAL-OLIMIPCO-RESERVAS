import Link from 'next/link'

export const dynamic = 'force-dynamic'

/* ═══════════════════════════════════════════════════════════════════════════
   CANAL OLÍMPICO — Confirmación pública de reserva
   Página post-reserva para clientes (sin dashboard)
   ═══════════════════════════════════════════════════════════════════════════ */

export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ nombre?: string; ref?: string; total?: string; deposit?: string; error?: string }> }) {
  const params = await searchParams

  const nombre = params.nombre || 'cliente'
  const ref = params.ref || ''
  const total = params.total || ''
  const deposit = params.deposit || ''
  const error = params.error

  if (error) {
    return (
      <div className="landing" style={{ minHeight: '100vh' }}>
        <nav style={{ background: 'rgba(255,250,244,.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(26,15,5,.04)', padding: '0 32px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, letterSpacing: '.25em', color: 'var(--ink)', textDecoration: 'none' }}>CANAL OLÍMPICO</Link>
            <a href="tel:+34930347246" style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--gold)', textDecoration: 'none' }}>📞 930 347 246</a>
          </div>
        </nav>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem' }}>❌</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--ink)', margin: '0 0 12px' }}>Error al crear la reserva</h1>
          <p style={{ fontSize: '.92rem', color: 'var(--text)', marginBottom: 24 }}>{error}</p>
          <Link href="/reservar" className="btn btn--primary">Intentar de nuevo</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="landing" style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(255,250,244,.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(26,15,5,.04)', padding: '0 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, letterSpacing: '.25em', color: 'var(--ink)', textDecoration: 'none' }}>CANAL OLÍMPICO</Link>
          <a href="tel:+34930347246" style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--gold)', textDecoration: 'none' }}>📞 930 347 246</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'var(--ink)', padding: '40px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(39,174,96,.1) 0%, transparent 50%, rgba(39,174,96,.06) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'block', fontSize: '.65rem', fontWeight: 500, letterSpacing: '.4em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 10 }}>RESERVA RECIBIDA</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 300, color: '#fff', margin: 0 }}>¡Gracias, {nombre}!</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Success card */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--sand)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(39,174,96,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 400, color: 'var(--ink)', margin: '0 0 8px' }}>Reserva registrada correctamente</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Recibirás un SMS con todos los detalles y los datos de pago.
            </p>
          </div>

          {(ref || total || deposit) && (
            <div style={{ borderTop: '1px solid var(--sand)', padding: '20px 28px', background: 'var(--warm-50)' }}>
              {ref && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Código de reserva</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{ref}</span>
                </div>
              )}
              {total && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '.88rem', borderTop: '1px solid var(--sand)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total del evento</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{total}€</span>
                </div>
              )}
              {deposit && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '.92rem', borderTop: '2px solid var(--gold)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Señal a pagar (40%)</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--gold)' }}>{deposit}€</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bank transfer info */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--sand)', padding: '24px 28px', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            🏦 Datos para transferencia
          </h3>
          <div style={{ background: 'var(--warm-50)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '1px solid var(--sand)' }}>
            <p style={{ fontSize: '.85rem', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.7 }}>
              <strong>Titular:</strong> OCI CANAL OLIMPIC SL
            </p>
            <p style={{ fontSize: '.85rem', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.7 }}>
              <strong>IBAN:</strong> ES38 0049 4860 1129 1600 7894
            </p>
            <p style={{ fontSize: '.85rem', color: 'var(--text)', margin: 0, lineHeight: 1.7 }}>
              <strong>Concepto:</strong> {ref ? `Reserva ${ref}` : 'Tu nombre + fecha del evento'}
            </p>
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
            Tienes 4 días para completar la transferencia. Una vez recibida, confirmaremos tu reserva por SMS.
          </p>
        </div>

        {/* Next steps */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--sand)', padding: '24px 28px', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 14px' }}>
            📋 Próximos pasos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { num: '1', text: 'Recibirás un SMS con el resumen de tu reserva' },
              { num: '2', text: 'Realiza la transferencia de la señal en los próximos 4 días' },
              { num: '3', text: 'Te confirmaremos la reserva cuando recibamos el pago' },
              { num: '4', text: 'Si tienes alergias, avísanos mínimo 72h antes del evento' },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: '.72rem', fontWeight: 700, flexShrink: 0 }}>{s.num}</span>
                <p style={{ fontSize: '.85rem', color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact / CTA */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            ¿Dudas? Llámanos y te ayudamos
          </p>
          <a href="tel:+34930347246" className="btn btn--outline btn--sm" style={{ textDecoration: 'none' }}>
            📞 930 347 246
          </a>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '.88rem', color: 'var(--text-muted)', letterSpacing: '.15em', marginBottom: 6 }}>CANAL OLÍMPICO</p>
          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: 0 }}>Castelldefels, Barcelona</p>
        </div>
      </div>
    </div>
  )
}
