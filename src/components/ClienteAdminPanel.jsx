import { useState, useEffect } from 'react'
import { 
  Users, Loader2, CheckCircle, XCircle, RefreshCw, Clock, Check,
  Building2, UserCheck, Mail, Phone, Briefcase, CreditCard,
  FileText, Zap, History, Package, TrendingUp, BarChart3
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const REPORT_TYPES = {
  completo: { label: 'Informe Completo', icon: Zap, color: 'indigo', gradient: 'from-indigo-500 to-purple-600' },
  reducido: { label: 'Informe Reducido', icon: FileText, color: 'blue', gradient: 'from-blue-500 to-cyan-600' },
  historico: { label: 'Informe Histórico', icon: History, color: 'purple', gradient: 'from-purple-500 to-pink-600' },
  actualizado: { label: 'Informe Actualizado', icon: RefreshCw, color: 'orange', gradient: 'from-orange-500 to-amber-600' }
}

/**
 * Panel para cliente_admin
 * - Ver usuarios pendientes de SU empresa
 * - Aprobar/Rechazar usuarios (pasan a pendiente_admin)
 * - Ver consumo de su equipo
 */
function ClienteAdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('equipo')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Panel de Administrador de Empresa</h2>
            <p className="text-sm text-gray-500">Gestiona los usuarios de tu organización</p>
          </div>
          <button onClick={onBack} className="btn-secondary text-sm">← Volver</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('equipo')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'equipo'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Mi Equipo</span>
          </button>
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'pendientes'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Aprobaciones</span>
          </button>
          <button
            onClick={() => setActiveTab('invitaciones')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'invitaciones'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Invitaciones</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'equipo' && <EquipoTab />}
      {activeTab === 'pendientes' && <PendientesTab />}
      {activeTab === 'invitaciones' && <InvitacionesTab />}
    </div>
  )
}

// ============================================
// TAB: INVITACIONES
// ============================================
function InvitacionesTab() {
  const [email, setEmail] = useState('')
  const [expiresHours, setExpiresHours] = useState(72)
  const [loading, setLoading] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [invitaciones, setInvitaciones] = useState([])
  const [recentLinks, setRecentLinks] = useState([])

  useEffect(() => {
    loadHistorial()
  }, [])

  const loadHistorial = async () => {
    setLoadingHistorial(true)
    try {
      const res = await axios.get('/api/cliente-admin/invitaciones?limit=100')
      if (res.data?.success) {
        setInvitaciones(res.data.invitaciones || [])
      } else {
        toast.error(res.data?.error || 'No se pudo cargar el historial')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar historial de invitaciones')
    } finally {
      setLoadingHistorial(false)
    }
  }

  const getEstadoBadgeClass = (estado) => {
    if (estado === 'usada') return 'bg-green-100 text-green-700'
    if (estado === 'expirada') return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
  }

  const generarInvitacion = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        expires_hours: Number(expiresHours) || 72,
      }
      if (email.trim()) payload.email = email.trim().toLowerCase()

      const res = await axios.post('/api/cliente-admin/invitaciones', payload)

      if (!res.data?.success || !res.data?.invitation) {
        toast.error(res.data?.error || 'No se pudo generar la invitación')
        return
      }

      const inv = res.data.invitation
      setRecentLinks(prev => [{
        token: inv.token,
        invite_url: inv.invite_url,
        empresa_nombre: inv.empresa_nombre,
        email_invitado: inv.email_invitado,
        expires_hours: inv.expires_hours,
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 19)])

      toast.success('Invitación generada')
      setEmail('')
      loadHistorial()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar invitación')
    } finally {
      setLoading(false)
    }
  }

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Link copiado')
    } catch {
      toast.error('No se pudo copiar automáticamente')
    }
  }

  const regenerarInvitacion = async (inv) => {
    if (!inv?.email_invitado) {
      toast.error('Esta invitación no tiene email asociado para regenerar')
      return
    }

    setRegeneratingId(inv.id)
    try {
      const res = await axios.post('/api/cliente-admin/invitaciones', {
        email: inv.email_invitado,
        expires_hours: Number(expiresHours) || 72,
      })

      if (!res.data?.success || !res.data?.invitation) {
        toast.error(res.data?.error || 'No se pudo regenerar la invitación')
        return
      }

      const nueva = res.data.invitation
      setRecentLinks(prev => [{
        token: nueva.token,
        invite_url: nueva.invite_url,
        empresa_nombre: nueva.empresa_nombre,
        email_invitado: nueva.email_invitado,
        expires_hours: nueva.expires_hours,
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 19)])

      toast.success('Invitación regenerada')
      loadHistorial()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al regenerar invitación')
    } finally {
      setRegeneratingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Generar invitación</h3>
        <p className="text-sm text-gray-500 mb-4">
          Crea enlaces para que usuarios de tu empresa se registren como cliente_usuario.
        </p>

        <form onSubmit={generarInvitacion} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Email invitado (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Expira en horas</label>
            <input
              type="number"
              min={1}
              max={168}
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Generar link
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h4 className="font-semibold text-gray-900">Historial de invitaciones</h4>
          <button onClick={loadHistorial} className="btn-secondary text-xs flex items-center gap-1" disabled={loadingHistorial}>
            {loadingHistorial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </button>
        </div>

        {loadingHistorial ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : invitaciones.length === 0 ? (
          <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">
            No hay invitaciones registradas para tu empresa.
          </div>
        ) : (
          <div className="space-y-3">
            {invitaciones.map((inv, idx) => (
              <div key={`${inv.id || idx}`} className="border rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">Invitación #{inv.id}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getEstadoBadgeClass(inv.estado_efectivo)}`}>
                        {inv.estado_efectivo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {inv.email_invitado ? `Email: ${inv.email_invitado}` : 'Sin email fijo'}
                    </p>
                    {inv.created_at && <p className="text-xs text-gray-400 mt-1">Creada: {new Date(inv.created_at).toLocaleString('es-AR')}</p>}
                    {inv.expires_at && <p className="text-xs text-gray-400">Expira: {new Date(inv.expires_at).toLocaleString('es-AR')}</p>}
                    {inv.used_at && <p className="text-xs text-gray-400">Usada: {new Date(inv.used_at).toLocaleString('es-AR')}</p>}
                  </div>
                  {(inv.estado_efectivo === 'usada' || inv.estado_efectivo === 'expirada') && (
                    <button
                      type="button"
                      onClick={() => regenerarInvitacion(inv)}
                      disabled={regeneratingId === inv.id}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      {regeneratingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Regenerar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Links recién generados (sesión actual)</h4>
          <span className="text-xs text-gray-500">{recentLinks.length} links</span>
        </div>

        {recentLinks.length === 0 ? (
          <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">
            Genera una invitación para copiar su link aquí.
          </div>
        ) : (
          <div className="space-y-3">
            {recentLinks.map((inv, idx) => (
              <div key={`${inv.token}-${idx}`} className="border rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.empresa_nombre || 'Tu empresa'}</p>
                    <p className="text-xs text-gray-500">
                      {inv.email_invitado ? `Email: ${inv.email_invitado}` : 'Sin email fijo'} | Expira en {inv.expires_hours}h
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copiar(inv.invite_url)}
                    className="btn-secondary text-xs"
                  >
                    Copiar link
                  </button>
                </div>
                <p className="mt-2 text-xs text-blue-700 break-all bg-blue-50 border border-blue-100 rounded p-2">
                  {inv.invite_url}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// TAB: USUARIOS PENDIENTES
// ============================================
function PendientesTab() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { loadPendientes() }, [])

  const loadPendientes = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/cliente-admin/usuarios-pendientes')
      if (res.data.success) setUsuarios(res.data.usuarios)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = async (userId) => {
    setProcessing(userId)
    try {
      const res = await axios.post('/api/cliente-admin/aprobar-usuario', { usuario_id: userId })
      if (res.data.success) {
        toast.success(res.data.message)
        loadPendientes()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally {
      setProcessing(null)
    }
  }

  const handleRechazar = async (userId) => {
    const motivo = prompt('Motivo del rechazo:')
    if (!motivo) return
    
    setProcessing(userId)
    try {
      const res = await axios.post('/api/cliente-admin/rechazar-usuario', { usuario_id: userId, motivo })
      if (res.data.success) {
        toast.success('Usuario rechazado')
        loadPendientes()
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-500">{usuarios.length} solicitudes pendientes</span>
          <p className="text-xs text-gray-400">Usuarios que desean unirse a tu empresa</p>
        </div>
        <button onClick={loadPendientes} className="btn-secondary text-sm flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-medium">No hay solicitudes pendientes</p>
          <p className="text-green-600 text-sm mt-1">Todos los usuarios han sido procesados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map(u => (
            <div key={u.id} className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">{u.nombre_completo?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{u.nombre_completo}</h4>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" /> {u.email}
                    </p>
                    {u.telefono && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" /> {u.codigo_pais || ''} {u.telefono}
                      </p>
                    )}
                    {u.cargo && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="h-4 w-4 text-gray-400" /> {u.cargo}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Solicitó acceso: {new Date(u.fecha_registro).toLocaleString('es-AR')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAprobar(u.id)}
                    disabled={processing === u.id}
                    className="btn-primary text-sm flex items-center gap-1"
                  >
                    {processing === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRechazar(u.id)}
                    disabled={processing === u.id}
                    className="btn-secondary text-sm flex items-center gap-1 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-800">
          <strong>Flujo de aprobación:</strong> Al aprobar un usuario, su solicitud pasará a revisión final por Inforysk antes de ser activado.
        </p>
      </div>
    </div>
  )
}

// ============================================
// TAB: MI EQUIPO (con sub-tabs)
// ============================================
function EquipoTab() {
  const [subTab, setSubTab] = useState('consumo')

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSubTab('consumo')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            subTab === 'consumo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Consumo
          </span>
        </button>
        <button
          onClick={() => setSubTab('creditos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            subTab === 'creditos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Créditos Informes
          </span>
        </button>
      </div>

      {/* Sub-tab content */}
      {subTab === 'consumo' && <ConsumoSubTab />}
      {subTab === 'creditos' && <CreditosSubTab />}
    </div>
  )
}

// Sub-tab: Consumo (lista de usuarios del equipo)
function ConsumoSubTab() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadEquipo() }, [])

  const loadEquipo = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/cliente-admin/equipo')
      if (res.data.success) setUsuarios(res.data.usuarios)
    } catch (err) {
      console.log('Endpoint equipo no disponible aún')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{usuarios.length} miembros del equipo</span>
        <button onClick={loadEquipo} className="btn-secondary text-sm flex items-center gap-1">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="bg-gray-50 border rounded-lg p-6 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No hay miembros en tu equipo aún</p>
          <p className="text-gray-400 text-sm mt-1">Los usuarios aprobados aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <div key={u.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-600 font-semibold">{u.nombre_completo?.[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.nombre_completo}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Sub-tab: Créditos Informes (balance y estadísticas)
function CreditosSubTab() {
  const [balance, setBalance] = useState({})
  const [stats, setStats] = useState(null)
  const [consumoPorUsuario, setConsumoPorUsuario] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCreditos() }, [])

  const loadCreditos = async () => {
    setLoading(true)
    try {
      const [balRes, statsRes, consumoRes] = await Promise.allSettled([
        axios.get('/api/portal/reports/balance'),
        axios.get('/api/portal/reports/stats'),
        axios.get('/api/cliente-admin/consumo-equipo')
      ])

      if (balRes.status === 'fulfilled' && balRes.value.data.success) {
        setBalance(balRes.value.data.balance)
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setStats(statsRes.value.data.stats)
      }
      if (consumoRes.status === 'fulfilled' && consumoRes.value.data.success) {
        setConsumoPorUsuario(consumoRes.value.data.consumo || [])
      }
    } catch (err) {
      console.error('Error loading creditos:', err)
    }
    setLoading(false)
  }

  const totalDisponibles = Object.values(balance).reduce((sum, b) => sum + (b?.balance || 0), 0)

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-6">
      {/* Balance Total */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Créditos disponibles de tu empresa</p>
            <p className="text-4xl font-bold">{totalDisponibles}</p>
          </div>
          <button onClick={loadCreditos} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        
        {/* Balance por tipo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(REPORT_TYPES).map(([type, config]) => {
            const Icon = config.icon
            const bal = balance[type]?.balance || 0
            return (
              <div key={type} className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-white/80" />
                  <span className="text-xs text-white/80 font-medium">{config.label.replace('Informe ', '')}</span>
                </div>
                <p className="text-2xl font-bold">{bal}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.consumos_mes_actual || 0}</p>
            <p className="text-xs text-gray-500">Usados este mes</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_consumos || 0}</p>
            <p className="text-xs text-gray-500">Total consumidos</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_compras || 0}</p>
            <p className="text-xs text-gray-500">Packs comprados</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${stats.total_invertido?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Total invertido</p>
          </div>
        </div>
      )}

      {/* Consumo por Usuario */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            Consumo por miembro del equipo
          </h3>
          <p className="text-xs text-gray-500 mt-1">Informes solicitados por cada usuario este mes</p>
        </div>
        
        {consumoPorUsuario.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No hay consumos registrados este mes</p>
          </div>
        ) : (
          <div className="divide-y">
            {consumoPorUsuario.map((u, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-600 font-semibold">{u.nombre?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.nombre}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{u.consumos || 0}</p>
                  <p className="text-xs text-gray-500">informes</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info de cómo comprar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">¿Cómo obtener más créditos?</h4>
        <p className="text-sm text-blue-700">
          Dirígete a la <strong>Tienda de Packs</strong> en el menú lateral para comprar más créditos de informes para tu equipo.
        </p>
      </div>
    </div>
  )
}

export default ClienteAdminPanel
