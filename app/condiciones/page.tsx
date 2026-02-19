import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Condiciones Generales de Reserva — Canal Olímpico',
  description: 'Condiciones generales de reserva del Restaurante Canal Olímpico en Castelldefels.',
}

export default function CondicionesPage() {
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
          <h1 className="legal__title">Condiciones Generales de Reserva</h1>
          <div className="legal__line" />
          <p className="legal__updated">Última actualización: 19 de febrero de 2026</p>
        </header>

        <section className="legal__section">
          <h2>1. Identificación del Titular</h2>
          <p>
            El presente sitio web <strong>reservascanalolimpico.netlify.app</strong> es propiedad y está operado por
            el <strong>Restaurante Canal Olímpico</strong>, con domicilio en Av. del Canal Olímpic, 2,
            08860 Castelldefels, Barcelona (España).
          </p>
          <p>Teléfono de contacto: <a href="tel:938587088">938 58 70 88</a> / <a href="tel:629358562">629 35 85 62</a></p>
        </section>

        <section className="legal__section">
          <h2>2. Objeto</h2>
          <p>
            Las presentes condiciones regulan el uso del servicio de reservas online del Restaurante Canal Olímpico,
            tanto para reservas de mesa individual como para eventos y grupos, incluyendo la selección de menús,
            la gestión de pagos y la comunicación asociada.
          </p>
        </section>

        <section className="legal__section">
          <h2>3. Tipos de Reserva</h2>
          <h3>3.1 Reserva de Mesa Individual</h3>
          <ul>
            <li>De 1 a 6 comensales.</li>
            <li>Confirmación inmediata y automática.</li>
            <li>Asignación de mesa según disponibilidad y preferencia de zona (terraza o interior).</li>
            <li>Antelación mínima: 4 horas antes de la hora de reserva.</li>
          </ul>
          <h3>3.2 Reserva de Grupo / Evento</h3>
          <ul>
            <li>A partir de 7 comensales (hasta 100 personas según tipo de evento).</li>
            <li>Requiere selección de menú fijo y pago de señal.</li>
            <li>Antelación mínima: 5 días antes de la fecha del evento.</li>
            <li>Tipos de evento disponibles: Grupo Sentado, Pica-Pica, Infantil/Cumpleaños, Nocturna Exclusiva.</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>4. Señal y Pagos</h2>
          <ul>
            <li>Las reservas de grupo requieren el pago de una <strong>señal equivalente al 40% del total estimado</strong>.</li>
            <li>El pago se realiza de forma segura a través de la pasarela <strong>Stripe</strong>.</li>
            <li>Tras confirmar la reserva, el cliente recibirá un enlace de pago por WhatsApp.</li>
            <li>El plazo máximo para completar el pago es de <strong>4 días naturales</strong> desde la creación de la reserva.</li>
            <li>Si no se realiza el pago en dicho plazo, la reserva quedará automáticamente cancelada.</li>
            <li>Todos los precios incluyen IVA.</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>5. Cancelaciones y Modificaciones</h2>
          <ul>
            <li>Las cancelaciones y modificaciones deben comunicarse con un mínimo de <strong>72 horas de antelación</strong> respecto a la fecha del evento.</li>
            <li>Cancelación dentro del plazo (72h+): la señal podrá aplicarse a una nueva fecha.</li>
            <li>Cancelación fuera de plazo (menos de 72h): <strong>se perderá la señal abonada</strong>.</li>
            <li>Las modificaciones en el número de asistentes deben comunicarse con al menos 72 horas de antelación.</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>6. Alergias e Intolerancias Alimentarias</h2>
          <p>
            El cliente debe informar de cualquier alergia o intolerancia alimentaria con un mínimo de
            <strong> 72 horas de antelación</strong> a la fecha del evento. El restaurante se compromete a
            adaptar los menús en la medida de lo posible, pero no podrá garantizar la ausencia total de trazas
            de alérgenos en su cocina.
          </p>
        </section>

        <section className="legal__section">
          <h2>7. Extensiones Horarias (Eventos Nocturnos)</h2>
          <ul>
            <li>Extensión de 1:00 a 2:00 AM: 100€ (fijo).</li>
            <li>Extensión de 2:00 a 3:00 AM: 200€ (fijo).</li>
            <li>Estos importes se suman al total del evento y se incluyen en el cálculo de la señal.</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>8. Horarios del Restaurante</h2>
          <ul>
            <li>Lunes a Viernes: 8:00 – 18:00</li>
            <li>Sábados y Domingos: 9:00 – 18:00</li>
          </ul>
          <p>Los eventos privados podrán extenderse fuera de este horario según lo contratado.</p>
        </section>

        <section className="legal__section">
          <h2>9. Menores de Edad</h2>
          <p>
            Los menores de edad deberán estar siempre acompañados por un adulto responsable.
            En eventos infantiles, el organizador será responsable de la supervisión de todos los menores asistentes.
          </p>
        </section>

        <section className="legal__section">
          <h2>10. Fuerza Mayor</h2>
          <p>
            El restaurante no será responsable de la cancelación o modificación de reservas por causas de fuerza mayor,
            incluyendo pero no limitado a: condiciones meteorológicas adversas (para reservas en terraza),
            restricciones sanitarias, averías en instalaciones o cualquier otra circunstancia fuera de su control.
            En tales casos, se ofrecerá un cambio de fecha o la devolución de la señal.
          </p>
        </section>

        <section className="legal__section">
          <h2>11. Protección de Datos</h2>
          <p>
            Los datos personales recogidos a través del formulario de reserva (nombre y teléfono) se utilizarán
            exclusivamente para la gestión de la reserva y la comunicación asociada (confirmación, pagos, recordatorios).
          </p>
          <p>
            No se cederán datos a terceros salvo los necesarios para la prestación del servicio
            (Stripe para pagos, WhatsApp Business API para comunicaciones).
          </p>
          <p>
            El cliente puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad
            y oposición enviando un correo o contactando por teléfono al restaurante.
          </p>
          <p>
            Más información en nuestra <Link href="/cookies">Política de Cookies</Link>.
          </p>
        </section>

        <section className="legal__section">
          <h2>12. Legislación Aplicable</h2>
          <p>
            Las presentes condiciones se rigen por la legislación española. Para cualquier controversia
            derivada de su interpretación o aplicación, las partes se someten a los juzgados y tribunales
            de Castelldefels (Barcelona), salvo que la normativa de consumidores establezca otro fuero.
          </p>
        </section>

        <div className="legal__footer-links">
          <Link href="/cookies">Política de Cookies</Link>
          <span>·</span>
          <Link href="/">Volver al inicio</Link>
        </div>
      </article>
    </main>
  )
}
