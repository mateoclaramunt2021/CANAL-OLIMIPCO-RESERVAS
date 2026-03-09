import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const methodLabels: Record<string, string> = {
  stripe: '💳 Stripe',
  manual: '💵 Manual',
  cash: '💵 Efectivo',
  transfer: '🏦 Transferencia',
}

const statusLabels: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  refunded: 'Reembolsado',
  failed: 'Fallido',
}

const statusInline: Record<string, { bg: string; color: string; border: string }> = {
  paid: { bg: '#d1fae5', color: '#047857', border: '#6ee7b7' },
  pending: { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  refunded: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  failed: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const params = await searchParams
  const filter = params.filter || 'all'

  const { data } = await supabaseAdmin
    .from('payments')
    .select('*, reservations(customer_name, customer_phone, fecha, event_type, personas)')
    .order('created_at', { ascending: false })
    .limit(200)

  const payments = Array.isArray(data) ? data : []
  const filtered = filter === 'all' ? payments : payments.filter((p: any) => p.status === filter)
  const totalPaid = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount || 0), 0)
  const totalPending = payments.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + (p.amount || 0), 0)

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>💳 Pagos</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Control de pagos y señales</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: 0 }}>Total Pagos</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>{payments.length}</p>
          </div>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: 0 }}>Cobrado</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>{totalPaid.toFixed(2)}€</p>
          </div>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: 0 }}>Pendiente</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#d97706', margin: '4px 0 0' }}>{totalPending.toFixed(2)}€</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { value: 'all', label: 'Todos' },
            { value: 'paid', label: 'Pagados' },
            { value: 'pending', label: 'Pendientes' },
          ].map(f => (
            <a
              key={f.value}
              href={`/payments?filter=${f.value}`}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                ...(filter === f.value
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }),
              }}
            >
              {f.label}
            </a>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <span style={{ fontSize: '32px' }}>💳</span>
              <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>No hay pagos registrados</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>Reserva</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>Método</th>
                  <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>Importe</th>
                  <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const d = new Date(p.created_at)
                  const sc = statusInline[p.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: '14px', color: '#0f172a', margin: 0 }}>{d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>{d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <a href={`/reservations/${p.reservation_id}`} style={{ fontSize: '14px', color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
                          {p.reservations?.customer_name || (p.reservation_id?.substring(0, 8) + '…')}
                        </a>
                        {p.reservations && (
                          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>{p.reservations.fecha} · {p.reservations.personas} pers.</p>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '14px', color: '#334155' }}>{methodLabels[p.method] || p.method}</span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{(p.amount || 0).toFixed(2)}€</span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {statusLabels[p.status] || p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/payments" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>🔄 Actualizar</a>
        </div>
      </div>
    </DashboardLayout>
  )
}
