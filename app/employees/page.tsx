import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const roleOptions = ['camarero', 'cocinero', 'barra', 'encargado', 'limpieza', 'dj', 'seguridad', 'otro']

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ action?: string; id?: string; ok?: string; error?: string; confirm_delete?: string }> }) {
  const params = await searchParams

  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('*')
    .order('name', { ascending: true })

  const list = employees || []
  const activeCount = list.filter((e: any) => e.active).length

  const showForm = params.action === 'new' || params.action === 'edit'
  const editingEmp = params.action === 'edit' && params.id
    ? list.find((e: any) => e.id === params.id)
    : null
  const confirmDelete = params.confirm_delete

  return (
    <DashboardLayout>
      <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: '#1a1a1a', margin: 0 }}>
              Empleados
            </h1>
            <p style={{ color: '#8a8578', fontSize: '13px', marginTop: '4px' }}>
              {list.length} empleados · {activeCount} activos
            </p>
          </div>
          <a
            href="/employees?action=new"
            style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#fff', borderRadius: '8px', background: 'linear-gradient(135deg, #B08D57, #96784a)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            + Nuevo Empleado
          </a>
        </div>

        {params.ok && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #c0e0d0', background: 'rgba(39,174,96,0.05)', color: '#27ae60', fontSize: '14px' }}>
            ✅ Empleado {params.ok}
          </div>
        )}
        {params.error && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #e8c9c9', background: '#fef2f2', color: '#c0392b', fontSize: '14px' }}>
            ⚠️ {params.error}
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (() => {
          const emp = list.find((e: any) => e.id === confirmDelete)
          return emp ? (
            <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', border: '2px solid #e8c9c9', background: '#fef2f2' }}>
              <p style={{ color: '#c0392b', fontWeight: 600, marginBottom: '8px' }}>
                ¿Eliminar a {emp.name}?
              </p>
              <p style={{ color: '#5c5549', fontSize: '13px', marginBottom: '12px' }}>
                Se borrarán sus turnos y fichajes. Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <form method="POST" action="/api/employees/action">
                  <input type="hidden" name="_action" value="delete" />
                  <input type="hidden" name="id" value={confirmDelete} />
                  <button type="submit" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#c0392b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Sí, eliminar
                  </button>
                </form>
                <a href="/employees" style={{ padding: '8px 16px', fontSize: '13px', color: '#5c5549', border: '1px solid #d4c9b0', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
                  Cancelar
                </a>
              </div>
            </div>
          ) : null
        })()}

        {/* ── Inline Form ── */}
        {showForm && (
          <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', background: '#faf9f6', border: '1px solid #e8e2d6' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: '#1a1a1a', marginBottom: '20px' }}>
              {editingEmp ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h2>
            <form method="POST" action="/api/employees/action">
              <input type="hidden" name="_action" value={editingEmp ? 'edit' : 'create'} />
              {editingEmp && <input type="hidden" name="id" value={editingEmp.id} />}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                <input name="name" type="text" required defaultValue={editingEmp?.name || ''} placeholder="Nombre completo"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Rol</label>
                <select name="role" defaultValue={editingEmp?.role || 'camarero'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }}>
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Teléfono</label>
                  <input name="phone" type="tel" defaultValue={editingEmp?.phone || ''} placeholder="600123456"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8578', display: 'block', marginBottom: '4px' }}>PIN (4 dígitos)</label>
                  <input name="pin" type="text" maxLength={4} defaultValue={editingEmp?.pin || ''} placeholder="····"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.3em', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8578', display: 'block', marginBottom: '4px' }}>Email</label>
                <input name="email" type="email" defaultValue={editingEmp?.email || ''} placeholder="email@ejemplo.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d4c9b0', fontSize: '14px', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <a href="/employees" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px', border: '1px solid #d4c9b0', color: '#5c5549', textDecoration: 'none', display: 'inline-block' }}>
                  Cancelar
                </a>
                <button type="submit" style={{ padding: '8px 20px', fontSize: '14px', fontWeight: 500, color: '#fff', borderRadius: '8px', background: 'linear-gradient(135deg, #B08D57, #96784a)', border: 'none', cursor: 'pointer' }}>
                  {editingEmp ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Employee List ── */}
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 16px', borderRadius: '16px', border: '1px solid #e8e2d6', background: '#faf9f6' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>👥</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 300, color: '#5c5549' }}>
              Sin empleados registrados
            </p>
            <p style={{ color: '#8a8578', fontSize: '14px', marginTop: '4px' }}>
              Añade tu primer empleado con el botón de arriba
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {list.map((emp: any) => (
              <div
                key={emp.id}
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', background: '#faf9f6', border: '1px solid #e8e2d6', opacity: emp.active ? 1 : 0.5 }}
              >
                {/* Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500, fontSize: '14px', flexShrink: 0, background: emp.active ? 'linear-gradient(135deg, #B08D57, #96784a)' : '#b0a898' }}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 500, padding: '2px 8px', borderRadius: '12px', background: 'rgba(176,141,87,0.1)', color: '#96784a' }}>
                        {emp.role}
                      </span>
                      {emp.phone && <span style={{ fontSize: '12px', color: '#8a8578' }}>📞 {emp.phone}</span>}
                      {emp.pin && <span style={{ fontSize: '12px', color: '#8a8578' }}>🔑 PIN</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <form method="POST" action="/api/employees/action" style={{ display: 'inline' }}>
                    <input type="hidden" name="_action" value="toggle" />
                    <input type="hidden" name="id" value={emp.id} />
                    <input type="hidden" name="active" value={String(emp.active)} />
                    <button type="submit" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '8px', border: `1px solid ${emp.active ? '#c0e0d0' : '#d4c9b0'}`, color: emp.active ? '#27ae60' : '#8a8578', background: emp.active ? 'rgba(39,174,96,0.05)' : 'transparent', cursor: 'pointer' }}>
                      {emp.active ? '✓ Activo' : '○ Inactivo'}
                    </button>
                  </form>
                  <a href={`/employees?action=edit&id=${emp.id}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid #d4c9b0', color: '#5c5549', textDecoration: 'none' }}>
                    Editar
                  </a>
                  <a href={`/employees?confirm_delete=${emp.id}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid #e8c9c9', color: '#c0392b', textDecoration: 'none' }}>
                    ✕
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/employees" style={{ color: '#B08D57', fontSize: '13px', textDecoration: 'none' }}>🔄 Actualizar</a>
        </div>
      </div>
    </DashboardLayout>
  )
}
