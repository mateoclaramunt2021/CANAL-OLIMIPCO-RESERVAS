import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  HOLD_BLOCKED: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  CONFIRMED: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  CANCELED: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  COMPLETED: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  NO_SHOW: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
}
const statusLabels: Record<string, string> = {
  HOLD_BLOCKED: 'Pago Pendiente', CONFIRMED: 'Confirmada', CANCELED: 'Cancelada',
  COMPLETED: 'Cerrada', NO_SHOW: 'No Show',
}
const eventLabels: Record<string, string> = {
  RESERVA_NORMAL: 'Reserva Normal', INFANTIL_CUMPLE: 'Infantil / Cumple',
  GRUPO_SENTADO: 'Grupo Sentado', GRUPO_PICA_PICA: 'Grupo Pica-Pica',
  NOCTURNA_EXCLUSIVA: 'Nocturna Exclusiva',
}
const menuLabels: Record<string, string> = {
  menu_grupo_34: 'Menú Grupo 34€', menu_grupo_29: 'Menú Grupo 29€',
  menu_infantil: 'Menú Infantil 14,50€', menu_pica_34: 'Menú Pica-Pica 34€',
  menu_pica_30: 'Menú Pica-Pica 30€', menu_padres_38: 'Menú Padres/Adultos 38€',
}

export default async function ReservationDetail({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; error?: string; edit?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const isEditing = sp.edit === 'true'

  // Fetch reservation + related data
  const { data: reservation, error: resErr } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (resErr || !reservation) {
    return (
      <DashboardLayout>
        <div style={{ padding: '32px', textAlign: 'center', paddingTop: '80px' }}>
          <span style={{ fontSize: '48px' }}>📭</span>
          <p style={{ color: '#475569', fontWeight: 500, marginTop: '12px' }}>Reserva no encontrada</p>
          <a href="/reservations" style={{ marginTop: '16px', display: 'inline-block', color: '#B08D57', fontSize: '14px', textDecoration: 'none' }}>← Volver a reservas</a>
        </div>
      </DashboardLayout>
    )
  }

  const [messagesRes, callsRes, paymentsRes, dishSummaryRes, tablesRes] = await Promise.all([
    supabaseAdmin.from('messages').select('*').eq('reservation_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('call_logs').select('*').eq('reservation_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('payments').select('*').eq('reservation_id', id).order('created_at', { ascending: true }),
    reservation.menu_code && ['menu_grupo_34', 'menu_grupo_29', 'menu_infantil'].includes(reservation.menu_code)
      ? supabaseAdmin.from('dish_selections').select('*').eq('reservation_id', id)
      : Promise.resolve({ data: null }),
    isEditing ? supabaseAdmin.from('tables').select('id, name, capacity, zone').order('name') : Promise.resolve({ data: null }),
  ])

  const messages = messagesRes.data || []
  const callLogs = callsRes.data || []
  const payments = paymentsRes.data || []
  const tables = (tablesRes as any)?.data || []

  const fechaFormatted = reservation.fecha
    ? new Date(reservation.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const horaDisplay = reservation.hora_inicio?.substring(0, 5) || '—'
  const sc = statusColors[reservation.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }

  // Card + field styles
  const card = { background: '#fff', borderRadius: '16px', border: '1px solid rgba(226,219,205,0.6)', padding: '24px', marginBottom: '24px' }
  const fieldBox = { padding: '12px', background: '#fafaf9', borderRadius: '12px' }
  const fieldLabel = { fontSize: '10px', fontWeight: 600, color: '#8a8578', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: 0 }
  const fieldValue = { fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginTop: '4px', margin: '4px 0 0' }
  const btnBase = { display: 'block', width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, textAlign: 'center' as const, border: 'none', cursor: 'pointer', textDecoration: 'none', color: '#fff', boxSizing: 'border-box' as const }

  // Input style for edit mode
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4c9b0', fontSize: '14px', fontWeight: 500 as const, color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' as const }
  const selectStyle = { ...inputStyle, appearance: 'auto' as const }

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/reservations" style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2dbd0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#5c5549', background: '#fff', fontSize: '16px' }}>←</a>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                {reservation.customer_name || 'Sin cliente'}
              </h1>
              <p style={{ fontSize: '13px', color: '#8a8578', margin: '4px 0 0' }}>
                {reservation.reservation_number && <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#B08D57' }}>{reservation.reservation_number} · </span>}
                {eventLabels[reservation.event_type] || reservation.event_type} · {fechaFormatted}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '6px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {statusLabels[reservation.status] || reservation.status}
            </span>
            {!isEditing ? (
              <a href={`/reservations/${id}?edit=true`} style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: '#B08D57', color: '#fff', textDecoration: 'none', border: 'none' }}>
                ✏️ Editar
              </a>
            ) : (
              <a href={`/reservations/${id}`} style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: '#78716c', color: '#fff', textDecoration: 'none', border: 'none' }}>
                ✕ Cancelar
              </a>
            )}
          </div>
        </div>

        {sp.ok && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(39,174,96,0.05)', border: '1px solid #c0e0d0', color: '#27ae60', fontSize: '14px' }}>
            ✅ {sp.ok}
          </div>
        )}
        {sp.error && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#c0392b', fontSize: '14px' }}>
            ⚠️ {sp.error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Fallback 2-col on wider screens via inline media query won't work without JS, so we use single column */}

          {/* ── Reservation Details / Edit Form ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
              {isEditing ? '✏️ Editar Reserva' : 'Información de la Reserva'}
            </h2>

            {isEditing ? (
              <form method="POST" action="/api/reservations/action">
                <input type="hidden" name="_action" value="edit" />
                <input type="hidden" name="id" value={id} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {/* Cliente */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Cliente</label>
                    <input name="customer_name" type="text" defaultValue={reservation.customer_name || ''} style={inputStyle} />
                  </div>
                  {/* Teléfono */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Teléfono</label>
                    <input name="customer_phone" type="tel" defaultValue={reservation.customer_phone || ''} style={inputStyle} />
                  </div>
                  {/* Email */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Email</label>
                    <input name="customer_email" type="email" defaultValue={reservation.customer_email || ''} style={inputStyle} />
                  </div>
                  {/* Tipo evento */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Tipo</label>
                    <select name="event_type" defaultValue={reservation.event_type || ''} style={selectStyle}>
                      {Object.entries(eventLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {/* Fecha */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Fecha</label>
                    <input name="fecha" type="date" defaultValue={reservation.fecha || ''} style={inputStyle} />
                  </div>
                  {/* Hora */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Hora inicio</label>
                    <input name="hora_inicio" type="time" defaultValue={reservation.hora_inicio?.substring(0, 5) || ''} style={inputStyle} />
                  </div>
                  {/* Personas */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Personas</label>
                    <input name="personas" type="number" min="1" defaultValue={reservation.personas || ''} style={inputStyle} />
                  </div>
                  {/* Mesa */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Mesa</label>
                    {tables.length > 0 ? (
                      <select name="table_id" defaultValue={reservation.table_id || ''} style={selectStyle}>
                        <option value="">Sin asignar</option>
                        {tables.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.capacity} pax) {t.zone ? `— ${t.zone}` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input name="table_id" type="text" defaultValue={reservation.table_id || ''} style={inputStyle} />
                    )}
                  </div>
                  {/* Menú */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Menú</label>
                    <select name="menu_code" defaultValue={reservation.menu_code || ''} style={selectStyle}>
                      <option value="">N/A</option>
                      {Object.entries(menuLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {/* Total */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Total (€)</label>
                    <input name="total_amount" type="number" step="0.01" min="0" defaultValue={reservation.total_amount || ''} style={inputStyle} />
                  </div>
                  {/* Señal / Depósito */}
                  <div style={fieldBox}>
                    <label style={fieldLabel}>Señal / Depósito (€)</label>
                    <input name="deposit_amount" type="number" step="0.01" min="0" defaultValue={reservation.deposit_amount || ''} style={inputStyle} />
                  </div>
                  {/* Notas */}
                  <div style={{ ...fieldBox, gridColumn: '1 / -1' }}>
                    <label style={fieldLabel}>Notas</label>
                    <input name="notas" type="text" defaultValue={reservation.notas || ''} style={inputStyle} placeholder="Notas internas sobre la reserva..." />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <button type="submit" style={{ padding: '14px 32px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #B08D57, #96784a)', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                    💾 Guardar Cambios
                  </button>
                  <a href={`/reservations/${id}`} style={{ padding: '14px 32px', borderRadius: '12px', border: '1px solid #d4c9b0', background: '#fff', color: '#5c5549', fontSize: '15px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                    Cancelar
                  </a>
                </div>
              </form>
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {reservation.reservation_number && (
                <div style={{ padding: '12px', background: '#fdf6e8', borderRadius: '12px', border: '1px solid #e8d5b2', gridColumn: '1 / -1' }}>
                  <p style={fieldLabel}>Nº Reserva</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: '#B08D57', margin: '4px 0 0' }}>{reservation.reservation_number}</p>
                </div>
              )}
              <div style={fieldBox}><p style={fieldLabel}>Cliente</p><p style={fieldValue}>{reservation.customer_name || '—'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Teléfono</p><p style={fieldValue}>{reservation.customer_phone || '—'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Email</p><p style={fieldValue}>{reservation.customer_email || '—'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Tipo</p><p style={fieldValue}>{eventLabels[reservation.event_type] || reservation.event_type}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Fecha</p><p style={fieldValue}>{fechaFormatted}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Hora</p><p style={fieldValue}>{horaDisplay} – {reservation.hora_fin?.substring(0, 5) || '—'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Personas</p><p style={fieldValue}>{reservation.personas || '—'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Mesa</p><p style={fieldValue}>{reservation.table_id || 'N/A'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Menú</p><p style={fieldValue}>{reservation.menu_code ? (menuLabels[reservation.menu_code] || reservation.menu_code) : 'N/A'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Total</p><p style={{ ...fieldValue, color: '#B08D57' }}>{reservation.total_amount ? `${reservation.total_amount.toFixed(2)}€` : '—'}</p></div>
              <div style={fieldBox}><p style={fieldLabel}>Señal (40%)</p><p style={fieldValue}>{reservation.deposit_amount ? `${reservation.deposit_amount.toFixed(2)}€` : '—'}</p></div>
              <div style={fieldBox}>
                <p style={fieldLabel}>Señal Pagada</p>
                <p style={{ ...fieldValue, color: reservation.status === 'CONFIRMED' && reservation.stripe_session_id ? '#059669' : '#8a8578' }}>
                  {reservation.status === 'CONFIRMED' && reservation.stripe_session_id ? '✅ Sí' : 'No'}
                </p>
              </div>
              <div style={fieldBox}><p style={fieldLabel}>Límite de Pago</p><p style={fieldValue}>{reservation.payment_deadline ? new Date(reservation.payment_deadline).toLocaleString('es-ES') : 'N/A'}</p></div>
              {reservation.notas && (
                <div style={{ ...fieldBox, gridColumn: '1 / -1' }}>
                  <p style={fieldLabel}>Notas</p>
                  <p style={fieldValue}>{reservation.notas}</p>
                </div>
              )}
            </div>
            )}
            {reservation.canceled_reason && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>Motivo de Cancelación</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: '4px 0 0' }}>{reservation.canceled_reason}</p>
              </div>
            )}
            <p style={{ fontSize: '11px', color: '#b0a898', marginTop: '16px' }}>
              ID: {reservation.id} · Creada: {reservation.created_at ? new Date(reservation.created_at).toLocaleString('es-ES') : '—'}
            </p>
          </div>

          {/* ── Status Actions ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>Cambiar Estado</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['HOLD_BLOCKED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'].map(s => {
                const active = reservation.status === s
                const c = statusColors[s] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
                return active ? (
                  <span key={s} style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                    {statusLabels[s] || s}
                  </span>
                ) : (
                  <form key={s} method="POST" action="/api/reservations/action" style={{ display: 'inline' }}>
                    <input type="hidden" name="_action" value="status" />
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="status" value={s} />
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#fff', color: '#8a8578', border: '1px solid #e2dbd0', cursor: 'pointer' }}>
                      {statusLabels[s] || s}
                    </button>
                  </form>
                )
              })}
            </div>
          </div>

          {/* ── Dish Selection ── */}
          {reservation.menu_code && ['menu_grupo_34', 'menu_grupo_29', 'menu_infantil'].includes(reservation.menu_code) && (
            <div style={card}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px', display: 'inline' }}>
                🍽️ Selección de Platos
              </h2>
              <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                background: reservation.dishes_status === 'completed' ? '#d1fae5' : '#fef3c7',
                color: reservation.dishes_status === 'completed' ? '#065f46' : '#92400e',
              }}>
                {reservation.dishes_status === 'completed' ? 'Completada' : 'Pendiente'}
              </span>
              {reservation.dish_selection_token && reservation.dishes_status !== 'completed' && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: '13px', color: '#1d4ed8', margin: 0 }}><strong>Enlace de selección:</strong></p>
                  <a href={`/elegir-platos/${reservation.dish_selection_token}`} style={{ fontSize: '12px', color: '#2563eb', wordBreak: 'break-all' }}>
                    /elegir-platos/{reservation.dish_selection_token}
                  </a>
                </div>
              )}
              {reservation.dishes_status === 'completed' && (
                <div style={{ marginTop: '12px' }}>
                  <a href={`/api/menu-selection/pdf?reservation_id=${reservation.id}`}
                    style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '8px', background: '#B08D57', color: '#fff', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                    📄 Descargar PDF
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── Emails ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>Emails</h2>
            <p style={{ fontSize: '12px', color: '#b0a898', margin: '0 0 16px' }}>Enviar correos al cliente</p>
            {!reservation.customer_email && (
              <p style={{ fontSize: '12px', color: '#d97706', marginBottom: '12px' }}>⚠️ Añade un email al cliente para enviar correos</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <form method="POST" action="/api/reservations/action">
                <input type="hidden" name="_action" value="email" />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="type" value="auto" />
                <button type="submit" style={{ ...btnBase, background: 'linear-gradient(135deg, #B08D57, #96784a)' }}>
                  📧 Enviar Confirmación
                </button>
              </form>
              <form method="POST" action="/api/reservations/action">
                <input type="hidden" name="_action" value="email" />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="type" value="reminder" />
                <button type="submit" style={{ ...btnBase, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  📌 Enviar Recordatorio
                </button>
              </form>
              <form method="POST" action="/api/reservations/action">
                <input type="hidden" name="_action" value="email" />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="type" value="restaurant" />
                <button type="submit" style={{ ...btnBase, background: 'linear-gradient(135deg, #78716c, #57534e)' }}>
                  📋 Notificar Restaurante
                </button>
              </form>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>Acciones</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <form method="POST" action="/api/reservations/action">
                <input type="hidden" name="_action" value="call" />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="phone" value={reservation.customer_phone || ''} />
                <button type="submit" style={{ ...btnBase, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                  📞 Iniciar Llamada VAPI
                </button>
              </form>
              <a href={`https://wa.me/${reservation.customer_phone}`} style={{ ...btnBase, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                💬 Abrir WhatsApp Web
              </a>
              {reservation.stripe_checkout_url && reservation.status !== 'CONFIRMED' && (
                <a href={reservation.stripe_checkout_url} style={{ ...btnBase, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  💳 Ver Link de Pago Stripe
                </a>
              )}
            </div>
          </div>

          {/* ── Send WhatsApp ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
              Enviar WhatsApp
              <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 400, color: '#b0a898' }}>({messages.length})</span>
            </h2>
            {messages.length > 0 && (
              <div style={{ maxHeight: '256px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg: any, idx: number) => (
                  <div key={msg.id || idx} style={{
                    padding: '12px', borderRadius: '12px', fontSize: '14px', maxWidth: '80%',
                    background: msg.direction === 'outbound' ? '#eff6ff' : '#fafaf9',
                    border: `1px solid ${msg.direction === 'outbound' ? '#bfdbfe' : '#e2dbd0'}`,
                    marginLeft: msg.direction === 'outbound' ? 'auto' : '0',
                    textAlign: msg.direction === 'outbound' ? 'right' as const : 'left' as const,
                  }}>
                    <p style={{ margin: 0, color: '#374151' }}>{msg.content || msg.body || '—'}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
                      {msg.direction === 'outbound' ? 'Enviado' : 'Recibido'} · {msg.created_at ? new Date(msg.created_at).toLocaleString('es-ES') : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <form method="POST" action="/api/reservations/action" style={{ display: 'flex', gap: '8px' }}>
              <input type="hidden" name="_action" value="whatsapp" />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="phone" value={reservation.customer_phone || ''} />
              <input name="message" type="text" placeholder="Escribe un mensaje..." required
                style={{ flex: 1, padding: '10px 16px', borderRadius: '12px', border: '1px solid #d4c9b0', fontSize: '14px', background: '#fafaf9', boxSizing: 'border-box' }} />
              <button type="submit" style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                Enviar
              </button>
            </form>
          </div>

          {/* ── Call Logs ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
              Registro de Llamadas (VAPI)
              <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 400, color: '#b0a898' }}>({callLogs.length})</span>
            </h2>
            {callLogs.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#b0a898', textAlign: 'center', padding: '16px' }}>No hay llamadas registradas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {callLogs.map((call: any, idx: number) => (
                  <div key={call.id || idx} style={{ padding: '16px', background: '#fafaf9', borderRadius: '12px', border: '1px solid #e2dbd0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                        {call.provider === 'vapi' ? '🤖 VAPI' : '📞 Llamada'} — {call.status}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{call.created_at ? new Date(call.created_at).toLocaleString('es-ES') : ''}</span>
                    </div>
                    {call.duration_seconds && <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>Duración: {call.duration_seconds}s</p>}
                    {call.summary && <p style={{ fontSize: '13px', color: '#374151', marginTop: '8px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2dbd0' }}>{call.summary}</p>}
                    {call.transcript && (
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer' }}>Ver transcripción completa</summary>
                        <p style={{ fontSize: '13px', color: '#374151', marginTop: '8px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2dbd0', whiteSpace: 'pre-wrap' }}>{call.transcript}</p>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Payments ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>Pagos</h2>
            {payments.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#b0a898', textAlign: 'center', padding: '16px' }}>No hay pagos registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map((pay: any, idx: number) => (
                  <div key={pay.id || idx} style={{ padding: '12px', background: '#fafaf9', borderRadius: '12px', border: '1px solid #e2dbd0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{pay.method || pay.type || 'stripe'}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>{pay.amount}€</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>{pay.created_at ? new Date(pay.created_at).toLocaleString('es-ES') : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Menu Payload ── */}
          {reservation.menu_payload && Object.keys(reservation.menu_payload).length > 0 && (
            <div style={card}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>Menú Seleccionado</h2>
              <pre style={{ fontSize: '12px', color: '#374151', background: '#fafaf9', padding: '12px', borderRadius: '12px', overflow: 'auto', border: '1px solid #e2dbd0', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(reservation.menu_payload, null, 2)}
              </pre>
            </div>
          )}

          {/* ── Tech Info ── */}
          <div style={card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>Info Técnica</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
              <p style={{ margin: 0 }}><strong>ID:</strong> {reservation.id}</p>
              <p style={{ margin: 0 }}><strong>Exclusiva:</strong> {reservation.is_exclusive ? 'Sí' : 'No'}</p>
              <p style={{ margin: 0 }}><strong>Creada:</strong> {reservation.created_at ? new Date(reservation.created_at).toLocaleString('es-ES') : '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}