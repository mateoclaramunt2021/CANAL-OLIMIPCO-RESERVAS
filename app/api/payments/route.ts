import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*, reservations(customer_name, customer_phone, fecha, event_type, personas)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Payments list error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Payments API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
