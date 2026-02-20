import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/employees — list all employees
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[API employees GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/employees — create employee
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, role, phone, email, pin } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        name: name.trim(),
        role: (role || 'camarero').trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        pin: pin?.trim() || null,
        active: true,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[API employees POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/employees — update employee
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obligatorio' }, { status: 400 })
    }

    // Clean up string fields
    if (updates.name) updates.name = updates.name.trim()
    if (updates.role) updates.role = updates.role.trim()
    if (updates.phone !== undefined) updates.phone = updates.phone?.trim() || null
    if (updates.email !== undefined) updates.email = updates.email?.trim() || null
    if (updates.pin !== undefined) updates.pin = updates.pin?.trim() || null

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API employees PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/employees — delete employee
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID obligatorio' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API employees DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
