'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface Payment {
  id: string
  reservation_id: string
  amount: number
  method: string
  status: string
  stripe_session_id: string | null
  created_at: string
}

interface PaymentWithReservation extends Payment {
  reservations?: {
    customer_name: string
    customer_phone: string
    fecha: string
    event_type: string
    personas: number
  }
}

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

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  refunded: 'bg-blue-100 text-blue-700 border-blue-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments')
      const data = await res.json()
      setPayments(Array.isArray(data) ? data : data.payments || [])
    } catch {
      setPayments([])
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter)
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pagos</h1>
            <p className="text-slate-500 mt-1">Control de pagos y señales</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Total Pagos</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Cobrado</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalPaid.toFixed(2)}€</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Pendiente</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{totalPending.toFixed(2)}€</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all' as const, label: 'Todos' },
            { value: 'paid' as const, label: 'Pagados' },
            { value: 'pending' as const, label: 'Pendientes' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-3xl">💳</span>
              <p className="text-slate-400 mt-2 text-sm">No hay pagos registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Reserva</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Método</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Importe</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-900">{new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/reservations/${p.reservation_id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          {p.reservations?.customer_name || p.reservation_id?.substring(0, 8) + '…'}
                        </Link>
                        {p.reservations && (
                          <p className="text-xs text-slate-400">{p.reservations.fecha} · {p.reservations.personas} pers.</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700">{methodLabels[p.method] || p.method}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">{(p.amount || 0).toFixed(2)}€</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[p.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {statusLabels[p.status] || p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
