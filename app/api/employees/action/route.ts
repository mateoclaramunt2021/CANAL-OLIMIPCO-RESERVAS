import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const action = form.get('_action') as string

    if (action === 'create') {
      const name = (form.get('name') as string)?.trim()
      if (!name) {
        return NextResponse.redirect(new URL('/employees?error=Nombre+obligatorio', req.url))
      }
      await supabaseAdmin.from('employees').insert({
        name,
        role: (form.get('role') as string)?.trim() || 'camarero',
        phone: (form.get('phone') as string)?.trim() || null,
        email: (form.get('email') as string)?.trim() || null,
        pin: (form.get('pin') as string)?.trim() || null,
        active: true,
      })
      return NextResponse.redirect(new URL('/employees?ok=creado', req.url))
    }

    if (action === 'edit') {
      const id = form.get('id') as string
      if (!id) return NextResponse.redirect(new URL('/employees?error=ID+obligatorio', req.url))
      const updates: Record<string, unknown> = {}
      const name = (form.get('name') as string)?.trim()
      if (name) updates.name = name
      const role = (form.get('role') as string)?.trim()
      if (role) updates.role = role
      updates.phone = (form.get('phone') as string)?.trim() || null
      updates.email = (form.get('email') as string)?.trim() || null
      updates.pin = (form.get('pin') as string)?.trim() || null

      await supabaseAdmin.from('employees').update(updates).eq('id', id)
      return NextResponse.redirect(new URL('/employees?ok=actualizado', req.url))
    }

    if (action === 'toggle') {
      const id = form.get('id') as string
      const currentActive = form.get('active') === 'true'
      await supabaseAdmin.from('employees').update({ active: !currentActive }).eq('id', id)
      return NextResponse.redirect(new URL('/employees?ok=actualizado', req.url))
    }

    if (action === 'delete') {
      const id = form.get('id') as string
      if (!id) return NextResponse.redirect(new URL('/employees?error=ID+obligatorio', req.url))
      await supabaseAdmin.from('employees').delete().eq('id', id)
      return NextResponse.redirect(new URL('/employees?ok=eliminado', req.url))
    }

    return NextResponse.redirect(new URL('/employees?error=Accion+no+valida', req.url))
  } catch (err: any) {
    console.error('[API employees action]', err)
    return NextResponse.redirect(new URL(`/employees?error=${encodeURIComponent(err.message)}`, req.url))
  }
}
