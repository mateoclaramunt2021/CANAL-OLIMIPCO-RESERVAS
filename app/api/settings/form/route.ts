import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildUrl } from '@/lib/url'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const phoneNumberId = (form.get('WHATSAPP_PHONE_NUMBER_ID') as string)?.trim() || ''
    const token = (form.get('WHATSAPP_TOKEN') as string)?.trim() || ''
    const verifyToken = (form.get('WHATSAPP_VERIFY_TOKEN') as string)?.trim() || ''

    const rows = [
      { key: 'WHATSAPP_PHONE_NUMBER_ID', value: phoneNumberId, updated_at: new Date().toISOString() },
      { key: 'WHATSAPP_TOKEN', value: token, updated_at: new Date().toISOString() },
      { key: 'WHATSAPP_VERIFY_TOKEN', value: verifyToken, updated_at: new Date().toISOString() },
    ]

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.redirect(buildUrl('/settings/whatsapp?ok=guardado', req))
  } catch (err: any) {
    console.error('[API settings form]', err)
    return NextResponse.redirect(buildUrl(`/settings/whatsapp?error=${encodeURIComponent(err.message)}`, req))
  }
}
