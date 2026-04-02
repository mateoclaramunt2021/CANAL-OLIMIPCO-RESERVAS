// ─── Script de prueba para enviar un SMS de test ─────────────────────────────
//
// USO:
//   1. Primero configura las variables en tu .env.local (ver abajo)
//   2. Ejecuta: npx tsx scripts/test-sms.ts
//
// Esto enviará un SMS de prueba al número +34640791041

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || ''

const TEST_PHONE = '+34640791041'

async function main() {
  console.log('─── Test SMS Canal Olímpico ───')
  console.log()

  // Verificar credenciales
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID) {
    console.error('❌ Faltan credenciales de Twilio.')
    console.error()
    console.error('Necesitas en .env.local:')
    console.error('  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    console.error('  TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    console.error('  TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    process.exit(1)
  }

  console.log(`✅ TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID.substring(0, 8)}...`)
  console.log(`✅ TWILIO_AUTH_TOKEN: ***configurado***`)
  console.log(`✅ MESSAGING_SERVICE: ${TWILIO_MESSAGING_SERVICE_SID}`)
  console.log(`📱 Enviando SMS a: ${TEST_PHONE}`)
  console.log(`📝 Remitente: CanalOlimp (Alpha Sender)`)
  console.log()

  try {
    // Usar la API REST de Twilio directamente (sin SDK, para test rápido)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const body = new URLSearchParams({
      To: TEST_PHONE,
      MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      Body: [
        'Canal Olimpico - SMS de Prueba',
        '',
        'Hola! Este es un SMS de prueba del sistema de reservas.',
        '',
        'Si recibes este mensaje, el sistema de SMS funciona correctamente.',
        '',
        'Fecha: ' + new Date().toLocaleDateString('es-ES'),
        'Hora: ' + new Date().toLocaleTimeString('es-ES'),
      ].join('\n'),
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ ¡SMS enviado correctamente!')
      console.log(`   SID: ${data.sid}`)
      console.log(`   Status: ${data.status}`)
      console.log(`   To: ${data.to}`)
      console.log(`   From: ${data.from}`)
      console.log()
      console.log('📱 Revisa tu móvil, debería llegar en unos segundos.')
    } else {
      console.error('❌ Error de Twilio:')
      console.error(`   Code: ${data.code}`)
      console.error(`   Message: ${data.message}`)
      console.error(`   Status: ${data.status}`)

      if (data.code === 21608) {
        console.error()
        console.error('💡 El número de origen no está verificado para enviar SMS a este destino.')
        console.error('   Ve a Twilio → Messaging → Senders → Verify tu número.')
      }
      if (data.code === 21211) {
        console.error()
        console.error(`💡 El número ${TEST_PHONE} no es válido. Cámbialo en el script.`)
      }
    }
  } catch (err: any) {
    console.error('❌ Error de conexión:', err.message)
  }
}

main()
