import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Cookies — Canal Olímpico',
  description: 'Política de cookies del sitio web del Restaurante Canal Olímpico.',
}

export default function CookiesPage() {
  return (
    <main className="legal">
      <nav className="legal__nav">
        <div className="legal__nav-inner">
          <Link href="/" className="legal__nav-logo">CANAL OLÍMPICO</Link>
          <Link href="/" className="legal__nav-back">← Volver</Link>
        </div>
      </nav>

      <article className="legal__content">
        <header className="legal__header">
          <span className="legal__label">LEGAL</span>
          <h1 className="legal__title">Política de Cookies</h1>
          <div className="legal__line" />
          <p className="legal__updated">Última actualización: 19 de febrero de 2026</p>
        </header>

        <section className="legal__section">
          <h2>1. ¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo
            (ordenador, móvil, tablet) cuando los visitas. Sirven para que el sitio web recuerde información
            sobre tu visita, como tus preferencias, y hacen que la siguiente visita sea más fácil y útil.
          </p>
        </section>

        <section className="legal__section">
          <h2>2. ¿Qué cookies utilizamos?</h2>

          <h3>2.1 Cookies Técnicas (Necesarias)</h3>
          <p>Son imprescindibles para el funcionamiento básico del sitio web. No requieren consentimiento.</p>
          <div className="legal__table-wrap">
            <table className="legal__table">
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Finalidad</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>cookie_consent</code></td>
                  <td>Almacena tu preferencia sobre cookies</td>
                  <td>365 días</td>
                </tr>
                <tr>
                  <td><code>sb-*</code> (Supabase)</td>
                  <td>Sesión de autenticación para el panel de administración</td>
                  <td>Sesión / 7 días</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.2 Cookies de Terceros (Funcionales)</h3>
          <p>Utilizadas por servicios externos necesarios para el procesamiento de pagos.</p>
          <div className="legal__table-wrap">
            <table className="legal__table">
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Proveedor</th>
                  <th>Finalidad</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>__stripe_mid</code></td>
                  <td>Stripe</td>
                  <td>Prevención de fraude en pagos</td>
                  <td>1 año</td>
                </tr>
                <tr>
                  <td><code>__stripe_sid</code></td>
                  <td>Stripe</td>
                  <td>Sesión de pago segura</td>
                  <td>30 minutos</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.3 Cookies Analíticas</h3>
          <p>
            Este sitio web <strong>no utiliza cookies de analítica</strong> (Google Analytics, Meta Pixel, etc.).
            Las estadísticas básicas de tráfico las gestiona Netlify de forma agregada y anonimizada,
            sin instalar cookies en tu dispositivo.
          </p>
        </section>

        <section className="legal__section">
          <h2>3. ¿Cómo gestionar las cookies?</h2>
          <p>
            Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que deshabilitar
            las cookies técnicas puede afectar al funcionamiento del sitio web y del proceso de pago.
          </p>
          <ul>
            <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios</li>
            <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del sitio</li>
            <li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web</li>
            <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>4. Base Legal</h2>
          <p>
            El uso de cookies en este sitio web se realiza conforme a lo dispuesto en:
          </p>
          <ul>
            <li>Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE).</li>
            <li>Reglamento (UE) 2016/679 General de Protección de Datos (RGPD).</li>
            <li>Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y Garantía de los Derechos Digitales (LOPDGDD).</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>5. Contacto</h2>
          <p>
            Si tienes dudas sobre nuestra política de cookies, puedes contactarnos en:
          </p>
          <ul>
            <li>Teléfono: <a href="tel:930347246">930 34 72 46</a></li>
            <li>Dirección: Av. del Canal Olímpic, 2, 08860 Castelldefels, Barcelona</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>6. Actualizaciones</h2>
          <p>
            Esta política de cookies puede ser actualizada periódicamente. La fecha de la última
            actualización aparece al inicio de este documento. Te recomendamos revisarla regularmente.
          </p>
        </section>

        <div className="legal__footer-links">
          <Link href="/condiciones">Condiciones de Reserva</Link>
          <span>·</span>
          <Link href="/">Volver al inicio</Link>
        </div>
      </article>
    </main>
  )
}
