import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ─── GET: List conversations (grouped by phone) ────────────────────────────
// Returns unique phone numbers with their last message and counts
export async function GET(req: NextRequest) {
  try {
    // Get all messages ordered by created_at desc
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, reservation_id, direction, body, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get reservation info to map reservation_id → phone
    const reservationIds = [...new Set((messages || []).map(m => m.reservation_id).filter(Boolean))]

    let phoneMap: Record<string, { phone: string; name: string }> = {}
    if (reservationIds.length > 0) {
      const { data: reservations } = await supabaseAdmin
        .from('reservations')
        .select('id, customer_phone, customer_name')
        .in('id', reservationIds)

      for (const r of reservations || []) {
        phoneMap[r.id] = { phone: r.customer_phone, name: r.customer_name }
      }
    }

    // Also get conversation states (active chatbot sessions)
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('phone, step, updated_at')

    const activeSteps: Record<string, string> = {}
    for (const c of conversations || []) {
      activeSteps[c.phone] = c.step
    }

    // Group messages by phone
    interface ConversationSummary {
      phone: string
      name: string
      lastMessage: string
      lastDirection: 'inbound' | 'outbound'
      lastAt: string
      totalMessages: number
      unread: number
      activeStep: string | null
    }

    const grouped: Record<string, ConversationSummary> = {}

    for (const msg of messages || []) {
      const info = phoneMap[msg.reservation_id]
      if (!info) continue
      const phone = info.phone

      if (!grouped[phone]) {
        grouped[phone] = {
          phone,
          name: info.name || phone,
          lastMessage: msg.body,
          lastDirection: msg.direction,
          lastAt: msg.created_at,
          totalMessages: 0,
          unread: 0,
          activeStep: activeSteps[phone] || null,
        }
      }

      grouped[phone].totalMessages++
      if (msg.direction === 'inbound' && !grouped[phone].lastAt) {
        grouped[phone].unread++
      }
    }

    // Sort by last message date
    const result = Object.values(grouped).sort((a, b) =>
      new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    )

    return NextResponse.json({ ok: true, conversations: result })
  } catch (err) {
    console.error('[conversations API] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
