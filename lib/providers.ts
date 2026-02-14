export interface WhatsAppProvider {
  sendMessage(phone: string, message: string): Promise<void>
}

export class DirectWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(phone: string, message: string) {
    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    })
    if (!response.ok) throw new Error('Failed to send WhatsApp message')
  }
}

export class MakeWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(phone: string, message: string) {
    await fetch(process.env.MAKE_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_whatsapp', phone, message })
    })
  }
}

export const whatsAppProvider = process.env.MAKE_WEBHOOK_URL
  ? new MakeWhatsAppProvider()
  : new DirectWhatsAppProvider()

export interface CallProvider {
  makeCall(phone: string): Promise<void>
}

export class DirectBAPIProvider implements CallProvider {
  async makeCall(phone: string) {
    await fetch(`${process.env.BAPI_BASE_URL}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: phone, from: 'restaurant' })
    })
  }
}

export class MakeBAPIProvider implements CallProvider {
  async makeCall(phone: string) {
    await fetch(process.env.MAKE_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'make_call', phone })
    })
  }
}

export const callProvider = process.env.MAKE_WEBHOOK_URL
  ? new MakeBAPIProvider()
  : new DirectBAPIProvider()