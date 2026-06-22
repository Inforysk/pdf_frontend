import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import {
  Users, UserCheck, UserX, Search, RefreshCw, Loader2,
  Check, X, Clock, Mail, Phone, Briefcase, Calendar, Code, ToggleLeft, ToggleRight,
  CreditCard, Edit2, Save, FileText, Zap, History, Package, BarChart3, Code2, ShoppingCart, Copy,
  ChevronDown, ChevronUp
} from 'lucide-react'

const REPORT_TYPES = {
  completo: { label: 'Completo', icon: Zap, color: 'indigo', gradient: 'from-indigo-500 to-purple-600' },
  reducido: { label: 'Reducido', icon: FileText, color: 'blue', gradient: 'from-blue-500 to-cyan-600' },
  historico: { label: 'Histórico', icon: History, color: 'purple', gradient: 'from-purple-500 to-pink-600' },
  actualizado: { label: 'Actualizado', icon: RefreshCw, color: 'orange', gradient: 'from-orange-500 to-amber-600' },
  api: { label: 'API', icon: Code2, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' }
}

export default function EquipoView() {
  const { user, hasPermission } = useAuth()
  const empresaAprobadora = user?.empresa_nombre || user?.empresa_razon_social || user?.empresa || 'tu empresa'
  const [activeSubTab, setActiveSubTab] = useState('aprobar') // 'aprobar', 'consumo', 'creditos' o 'invitaciones'
  const [detalleUsuarioId, setDetalleUsuarioId] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [plan, setPlan] = useState({ nombre: '', creditos_mes: 75 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [procesando, setProcesando] = useState(null)
  const [togglingApi, setTogglingApi] = useState(null)
  const [editingCredits, setEditingCredits] = useState(null) // ID del usuario editando
  const [creditLimit, setCreditLimit] = useState('')
  const [savingCredits, setSavingCredits] = useState(false)
  
  // Estados para modal de API
  const [showApiModal, setShowApiModal] = useState(false)
  const [apiModalUser, setApiModalUser] = useState(null)
  const [apiCreditsLimit, setApiCreditsLimit] = useState('50')
  const [apiAutoRenovar, setApiAutoRenovar] = useState(false)
  const [apiModalMode, setApiModalMode] = useState('enable') // 'enable' o 'edit'
  
  // Estados para Créditos Informes
  const [balanceEmpresa, setBalanceEmpresa] = useState({})
  const [usuariosCreditos, setUsuariosCreditos] = useState([])
  const [asignaciones, setAsignaciones] = useState({})
  const [packsDisponibles, setPacksDisponibles] = useState({}) // {completo: true, api: false, ...}
  const [loadingCreditos, setLoadingCreditos] = useState(false)
  const [editingInforme, setEditingInforme] = useState(null) // {userId, reportType}
  const [limiteInforme, setLimiteInforme] = useState('')
  const [savingInforme, setSavingInforme] = useState(false)

  // Estados para Invitaciones
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteExpiresHours, setInviteExpiresHours] = useState(72)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteHistoryLoading, setInviteHistoryLoading] = useState(false)
  const [inviteHistory, setInviteHistory] = useState([])
  const [inviteRecentLinks, setInviteRecentLinks] = useState([])
  const [regeneratingInviteId, setRegeneratingInviteId] = useState(null)
  
  // Estados para periodos de facturación
  const [periodoActivo, setPeriodoActivo] = useState('')
  const [historialPeriodos, setHistorialPeriodos] = useState([])
  const [showHistorialPeriodos, setShowHistorialPeriodos] = useState(false)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null)
  const [datosPeriodoHistorial, setDatosPeriodoHistorial] = useState(null)
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)

  const cargarEquipo = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/cliente-admin/equipo')
      if (res.data.success) {
        setUsuarios(res.data.usuarios || [])
        if (res.data.plan) {
          setPlan(res.data.plan)
        }
        if (res.data.periodo_activo) {
          setPeriodoActivo(res.data.periodo_activo)
        }
        if (res.data.historial_periodos) {
          setHistorialPeriodos(res.data.historial_periodos)
        }
        
        // Verificar y ejecutar auto-renovación si hay pendientes
        await verificarAutoRenovacion()
      }
    } catch (err) {
      toast.error('Error cargando equipo')
    } finally {
      setLoading(false)
    }
  }

  const verificarAutoRenovacion = async () => {
    try {
      const res = await axios.get('/api/cliente-admin/check-auto-renovacion')
      if (res.data.success && res.data.pendientes > 0) {
        // Hay usuarios pendientes de auto-renovación, ejecutarla automáticamente
        const renovarRes = await axios.post('/api/cliente-admin/renovar-api-periodo')
        if (renovarRes.data.success && renovarRes.data.renovados > 0) {
          toast.success(`Auto-renovación: ${renovarRes.data.renovados} usuario(s) con API renovada para ${renovarRes.data.periodo}`)
          // Recargar datos sin recursión
          const equipoRes = await axios.get('/api/cliente-admin/equipo')
          if (equipoRes.data.success) {
            setUsuarios(equipoRes.data.usuarios || [])
          }
        }
      }
    } catch (err) {
      // Silenciar errores de auto-renovación, no es crítico
      console.warn('Error en verificación de auto-renovación:', err)
    }
  }

  const cargarPeriodoHistorial = async (periodo) => {
    if (periodoSeleccionado === periodo) {
      setPeriodoSeleccionado(null)
      setDatosPeriodoHistorial(null)
      return
    }
    
    setLoadingPeriodo(true)
    setPeriodoSeleccionado(periodo)
    try {
      const res = await axios.get(`/api/cliente-admin/equipo/periodo/${periodo}`)
      if (res.data.success) {
        setDatosPeriodoHistorial(res.data)
      }
    } catch (err) {
      toast.error('Error cargando datos del periodo')
    } finally {
      setLoadingPeriodo(false)
    }
  }

  const formatPeriodo = (p) => {
    if (!p) return ''
    const [year, month] = p.split('-')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${meses[parseInt(month) - 1]} ${year}`
  }

  useEffect(() => {
    cargarEquipo()
  }, [])

  useEffect(() => {
    if (activeSubTab === 'creditos') {
      cargarCreditosInformes()
    }
    if (activeSubTab === 'invitaciones') {
      cargarInvitaciones()
    }
  }, [activeSubTab])

  const cargarInvitaciones = async () => {
    setInviteHistoryLoading(true)
    try {
      const res = await axios.get('/api/cliente-admin/invitaciones?limit=100')
      if (res.data.success) {
        setInviteHistory(res.data.invitaciones || [])
      } else {
        toast.error(res.data.error || 'Error al cargar invitaciones')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar invitaciones')
    } finally {
      setInviteHistoryLoading(false)
    }
  }

  const generarInvitacion = async (e) => {
    e.preventDefault()
    setInviteLoading(true)
    try {
      const payload = {
        expires_hours: Number(inviteExpiresHours) || 72,
      }
      if (inviteEmail.trim()) payload.email = inviteEmail.trim().toLowerCase()

      const res = await axios.post('/api/cliente-admin/invitaciones', payload)
      if (!res.data?.success || !res.data?.invitation) {
        toast.error(res.data?.error || 'No se pudo generar la invitación')
        return
      }

      const inv = res.data.invitation
      setInviteRecentLinks(prev => [{
        token: inv.token,
        invite_url: inv.invite_url,
        empresa_nombre: inv.empresa_nombre,
        email_invitado: inv.email_invitado,
        expires_hours: inv.expires_hours,
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 19)])

      toast.success('Invitación generada')
      setInviteEmail('')
      cargarInvitaciones()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar invitación')
    } finally {
      setInviteLoading(false)
    }
  }

  const regenerarInvitacion = async (inv) => {
    if (!inv?.email_invitado) {
      toast.error('Esta invitación no tiene email asociado')
      return
    }

    setRegeneratingInviteId(inv.id)
    try {
      const res = await axios.post('/api/cliente-admin/invitaciones', {
        email: inv.email_invitado,
        expires_hours: Number(inviteExpiresHours) || 72,
      })

      if (!res.data?.success || !res.data?.invitation) {
        toast.error(res.data?.error || 'No se pudo regenerar la invitación')
        return
      }

      const nueva = res.data.invitation
      setInviteRecentLinks(prev => [{
        token: nueva.token,
        invite_url: nueva.invite_url,
        empresa_nombre: nueva.empresa_nombre,
        email_invitado: nueva.email_invitado,
        expires_hours: nueva.expires_hours,
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 19)])

      toast.success('Invitación regenerada')
      cargarInvitaciones()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al regenerar invitación')
    } finally {
      setRegeneratingInviteId(null)
    }
  }

  const copiarLinkInvitacion = async (link) => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copiado')
    } catch {
      toast.error('No se pudo copiar automáticamente')
    }
  }

  const badgeEstadoInvitacion = (estado) => {
    if (estado === 'usada') return 'bg-green-100 text-green-700'
    if (estado === 'expirada') return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
  }

  const cargarCreditosInformes = async () => {
    setLoadingCreditos(true)
    try {
      const [creditosRes, packsRes] = await Promise.all([
        axios.get('/api/cliente-admin/creditos-informes'),
        axios.get('/api/portal/reports/packages')
      ])
      
      if (creditosRes.data.success) {
        setBalanceEmpresa(creditosRes.data.balance_empresa || {})
        setUsuariosCreditos(creditosRes.data.usuarios || [])
        setAsignaciones(creditosRes.data.asignaciones || {})
      }
      
      // Determinar qué tipos tienen packs disponibles
      if (packsRes.data.success && packsRes.data.by_type) {
        const disponibles = {}
        Object.entries(packsRes.data.by_type).forEach(([tipo, packs]) => {
          disponibles[tipo] = packs && packs.length > 0
        })
        setPacksDisponibles(disponibles)
      }
    } catch (err) {
      toast.error('Error cargando créditos de informes')
    } finally {
      setLoadingCreditos(false)
    }
  }

  const startEditInforme = (userId, reportType, currentLimit) => {
    setEditingInforme({ userId, reportType })
    setLimiteInforme(currentLimit?.toString() || '0')
  }

  const cancelEditInforme = () => {
    setEditingInforme(null)
    setLimiteInforme('')
  }

  const saveInformeLimit = async () => {
    if (!editingInforme) return
    setSavingInforme(true)
    try {
      const res = await axios.post('/api/cliente-admin/asignar-creditos-informe', {
        usuario_id: editingInforme.userId,
        report_type: editingInforme.reportType,
        limite: parseInt(limiteInforme, 10) || 0
      })
      if (res.data.success) {
        toast.success(res.data.message)
        cargarCreditosInformes()
        cancelEditInforme()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al asignar créditos')
    } finally {
      setSavingInforme(false)
    }
  }

  const aprobarUsuario = async (usuarioId) => {
    setProcesando(usuarioId)
    try {
      const res = await axios.post('/api/cliente-admin/aprobar-usuario', { usuario_id: usuarioId })
      if (res.data.success) {
        toast.success(res.data.message || 'Usuario aprobado')
        cargarEquipo()
      } else {
        toast.error(res.data.error || 'Error al aprobar')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aprobar')
    } finally {
      setProcesando(null)
    }
  }

  const rechazarUsuario = async (usuarioId, motivo = '') => {
    setProcesando(usuarioId)
    try {
      const res = await axios.post('/api/cliente-admin/rechazar-usuario', { usuario_id: usuarioId, motivo })
      if (res.data.success) {
        toast.success('Usuario rechazado')
        cargarEquipo()
      } else {
        toast.error(res.data.error || 'Error al rechazar')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al rechazar')
    } finally {
      setProcesando(null)
    }
  }

  const toggleApiAccess = async (usuarioId, currentValue) => {
    // Si se va a habilitar, abrir modal para pedir límite de créditos
    if (!currentValue) {
      const usuario = usuarios.find(u => u.id === usuarioId)
      setApiModalUser(usuario)
      setApiCreditsLimit(usuario?.api_creditos_limite?.toString() || '50')
      setApiAutoRenovar(usuario?.api_auto_renovar || false)
      setApiModalMode('enable')
      setShowApiModal(true)
      return
    }
    
    // Si se va a deshabilitar, hacerlo directamente
    setTogglingApi(usuarioId)
    try {
      const res = await axios.post('/api/cliente-admin/toggle-api', { 
        usuario_id: usuarioId, 
        habilitado: false 
      })
      if (res.data.success) {
        toast.success(res.data.message)
        cargarEquipo()
      } else {
        toast.error(res.data.error || 'Error al cambiar acceso API')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar acceso API')
    } finally {
      setTogglingApi(null)
    }
  }

  const editApiCredits = (usuario) => {
    setApiModalUser(usuario)
    setApiCreditsLimit(usuario?.api_creditos_limite?.toString() || '50')
    setApiAutoRenovar(usuario?.api_auto_renovar || false)
    setApiModalMode('edit')
    setShowApiModal(true)
  }
  
  const confirmEnableApi = async () => {
    if (!apiModalUser) return
    
    setTogglingApi(apiModalUser.id)
    try {
      const res = await axios.post('/api/cliente-admin/toggle-api', { 
        usuario_id: apiModalUser.id, 
        habilitado: true,
        creditos_limite: parseInt(apiCreditsLimit, 10) || 50,
        auto_renovar: apiAutoRenovar
      })
      if (res.data.success) {
        toast.success(res.data.message)
        setShowApiModal(false)
        setApiModalUser(null)
        cargarEquipo()
      } else {
        toast.error(res.data.error || 'Error al habilitar API')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al habilitar API')
    } finally {
      setTogglingApi(null)
    }
  }

  const startEditCredits = (usuario) => {
    setEditingCredits(usuario.id)
    setCreditLimit(usuario.creditos_limite?.toString() || '')
  }

  const cancelEditCredits = () => {
    setEditingCredits(null)
    setCreditLimit('')
  }

  const saveCreditsLimit = async (usuarioId) => {
    setSavingCredits(true)
    try {
      const limite = creditLimit === '' ? null : parseInt(creditLimit, 10)
      const res = await axios.post('/api/cliente-admin/creditos-limite', { 
        usuario_id: usuarioId, 
        limite 
      })
      if (res.data.success) {
        toast.success(res.data.message)
        setEditingCredits(null)
        setCreditLimit('')
        cargarEquipo()
      } else {
        toast.error(res.data.error || 'Error al actualizar límite')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar límite')
    } finally {
      setSavingCredits(false)
    }
  }

  // Contar pendientes para badge
  const pendientesCount = usuarios.filter(u => u.estado_aprobacion === 'pendiente_empresa').length
  
  // Filtrar usuarios según pestaña activa
  const usuariosPendientes = usuarios.filter(u => 
    u.estado_aprobacion === 'pendiente_empresa' &&
    (search === '' || 
      u.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))
  )
  
  const usuariosActivos = usuarios.filter(u => 
    u.activo && u.estado_aprobacion === 'aprobado' &&
    (search === '' || 
      u.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))
  )

  const getEstadoBadge = (usuario) => {
    if (usuario.estado_aprobacion === 'pendiente_empresa') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pendiente
      </span>
    }
    if (!usuario.activo) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Inactivo
      </span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
      <Check className="h-3 w-3" /> Activo
    </span>
  }

  const formatFechaHora = (fecha) => {
    if (!fecha) return '-'
    const d = new Date(fecha)
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRiesgoFlagLabel = (flag) => {
    const labels = {
      email_personal: 'Email personal',
      sin_telefono: 'Sin telefono',
      alta_masiva: 'Alta masiva',
      registro_sin_invitacion: 'Registro sin invitacion'
    }
    return labels[flag] || flag
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Mi Equipo
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los usuarios de tu empresa · Plan <span className="font-medium text-blue-600">{plan.nombre}</span> ({plan.creditos_mes} créditos/mes compartidos)
          </p>
        </div>
        <button
          onClick={activeSubTab === 'creditos' ? cargarCreditosInformes : cargarEquipo}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('aprobar')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap relative ${
            activeSubTab === 'aprobar'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Aprobar Usuarios
            {pendientesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {pendientesCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('consumo')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'consumo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Créditos Consumo
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('creditos')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'creditos'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Créditos Informes
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('invitaciones')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'invitaciones'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitaciones
          </span>
        </button>
      </div>

      {/* Tab: Aprobar Usuarios */}
      {activeSubTab === 'aprobar' && (
        <>
          {/* Búsqueda */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Leyenda de reglas de riesgo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-blue-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  Reglas de riesgo para aprobación
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Transparencia del proceso: si el score es menor a 50, la aprobación es final por {empresaAprobadora}. Si el score es 50 o más, el usuario se escala a revisión de Inforysk.
                </p>
                <div className="mt-3 grid gap-1.5 text-xs text-blue-900">
                  <p>1. Email personal (gmail, hotmail, outlook, yahoo, etc.): +40</p>
                  <p>2. Usuario sin teléfono: +20</p>
                  <p>3. Alta masiva (5 o más registros pendientes en 15 minutos): +40</p>
                  <p>4. Registro sin invitación: +20</p>
                  <p className="font-semibold mt-1">Umbral de escalamiento: score mayor o igual a 50.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de pendientes */}
          {usuariosPendientes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <UserCheck className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No hay usuarios pendientes de aprobación</p>
              <p className="text-gray-400 text-sm mt-1">Todos los usuarios de tu empresa han sido procesados</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {usuariosPendientes.map((usuario) => (
                <div 
                  key={usuario.id} 
                  className="bg-amber-50/50 rounded-xl border border-amber-200 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Info usuario */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100">
                        <span className="text-lg font-bold text-amber-600">
                          {(usuario.nombre_completo || usuario.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {usuario.nombre_completo || 'Sin nombre'}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pendiente
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {usuario.email}
                          </span>
                          {usuario.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {usuario.telefono}
                            </span>
                          )}
                          {usuario.cargo && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {usuario.cargo}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Registrado: {formatFechaHora(usuario.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 sm:flex-shrink-0">
                      {usuario.riesgo_estimado_score !== null && usuario.riesgo_estimado_score !== undefined && (
                        <div className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center ${
                          usuario.riesgo_estimado_requires_admin
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {usuario.riesgo_estimado_requires_admin ? 'Se escalará a admin' : 'Riesgo bajo'} · Score {usuario.riesgo_estimado_score}
                        </div>
                      )}
                      <button
                        onClick={() => setDetalleUsuarioId(detalleUsuarioId === usuario.id ? null : usuario.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        {detalleUsuarioId === usuario.id ? (
                          <>
                            Ocultar detalle
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Ver detalle
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => aprobarUsuario(usuario.id)}
                        disabled={procesando === usuario.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {procesando === usuario.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        Aprobar
                      </button>
                      <button
                        onClick={() => {
                          const motivo = prompt('Motivo del rechazo (opcional):')
                          if (motivo !== null) {
                            rechazarUsuario(usuario.id, motivo)
                          }
                        }}
                        disabled={procesando === usuario.id}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                      >
                        <UserX className="h-4 w-4" />
                        Rechazar
                      </button>
                    </div>
                  </div>

                  {detalleUsuarioId === usuario.id && (
                    <div className="mt-3 pt-3 border-t border-amber-200 grid gap-2 text-sm">
                      <div className="text-gray-700">
                        <span className="font-medium">Resultado estimado:</span>{' '}
                        {usuario.riesgo_estimado_requires_admin ? 'Se escalará a revisión de Inforysk' : `Aprobación final por ${empresaAprobadora}`}
                      </div>
                      <div className="text-gray-700">
                        <span className="font-medium">Score estimado:</span>{' '}
                        {usuario.riesgo_estimado_score ?? 0}
                      </div>
                      <div className="text-gray-700">
                        <span className="font-medium">Señales detectadas:</span>{' '}
                        {usuario.riesgo_estimado_flags?.length
                          ? usuario.riesgo_estimado_flags.map(getRiesgoFlagLabel).join(', ')
                          : 'Sin señales de riesgo relevantes'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Créditos Consumo */}
      {activeSubTab === 'consumo' && (
        <>
          {/* Banner de Periodo Actual */}
          {periodoActivo && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-emerald-800">
                      Periodo actual: {formatPeriodo(periodoActivo)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5">
                      Los créditos usados corresponden al ciclo de facturación actual
                    </p>
                  </div>
                </div>
                {historialPeriodos && historialPeriodos.length > 1 && (
                  <button 
                    onClick={() => setShowHistorialPeriodos(!showHistorialPeriodos)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
                  >
                    {showHistorialPeriodos ? 'Ocultar historial' : 'Ver historial'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Historial de Periodos - Expandible */}
          {showHistorialPeriodos && historialPeriodos && historialPeriodos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Historial de Periodos</h3>
                <p className="text-xs text-gray-500 mt-0.5">Click en un periodo pasado para ver el consumo del equipo</p>
              </div>
              <div className="divide-y divide-gray-100">
                {historialPeriodos.map((p, i) => (
                  <div 
                    key={p.factura_id || i} 
                    onClick={() => i > 0 && cargarPeriodoHistorial(p.periodo)}
                    className={`p-4 transition-colors ${
                      i === 0 ? 'bg-blue-50' : 
                      periodoSeleccionado === p.periodo ? 'bg-amber-50 border-l-4 border-amber-400' :
                      'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{formatPeriodo(p.periodo)}</span>
                        {i === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Actual</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          p.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                          p.estado === 'vencida' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.estado === 'pagada' ? 'Pagada' : p.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <span>{parseFloat(p.creditos_usados || 0).toFixed(1)} / {p.creditos_incluidos || 0} créditos</span>
                      </div>
                    </div>
                    
                    {/* Detalles del periodo seleccionado */}
                    {periodoSeleccionado === p.periodo && datosPeriodoHistorial && (
                      <div className="mt-4 pt-4 border-t border-amber-200">
                        {loadingPeriodo ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Usuarios del periodo con API info */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 mb-2">Consumo por usuario</h4>
                              <div className="grid gap-2">
                                {datosPeriodoHistorial.usuarios?.map((u) => (
                                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white rounded p-3 border border-gray-100 gap-2">
                                    <div className="flex-1">
                                      <span className="text-gray-900 font-medium">{u.nombre_completo || u.email}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {/* Créditos generales */}
                                      <div className="text-center">
                                        <p className="text-[10px] text-gray-400">Créditos</p>
                                        <p className="font-semibold text-gray-900">
                                          {parseFloat(u.creditos_usados || 0).toFixed(1)}
                                          {u.creditos_limite_usuario > 0 && (
                                            <span className="text-gray-400 font-normal">/{u.creditos_limite_usuario}</span>
                                          )}
                                        </p>
                                        <p className="text-[10px] text-gray-400">{u.operaciones} ops</p>
                                      </div>
                                      {/* API info */}
                                      <div className="text-center border-l border-gray-200 pl-4">
                                        <p className="text-[10px] text-gray-400">API</p>
                                        {u.api_habilitada ? (
                                          <>
                                            <p className="font-semibold text-blue-600">{parseFloat(u.api_consumo || 0).toFixed(1)}/{u.api_creditos_limite || 0}</p>
                                            <p className="text-[10px] text-gray-400">{u.api_requests || 0} req</p>
                                          </>
                                        ) : (
                                          <p className="text-gray-400">No activa</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Productos del periodo */}
                            {datosPeriodoHistorial.productos?.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Por tipo de producto</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {datosPeriodoHistorial.productos.map((pr) => (
                                    <div key={pr.tipo_producto} className="bg-white rounded p-2 border border-gray-100 text-center">
                                      <p className="text-[10px] text-gray-500 truncate">{pr.tipo_producto}</p>
                                      <p className="text-xs font-semibold text-gray-900">{parseFloat(pr.creditos_total || 0).toFixed(2)} cr.</p>
                                      <p className="text-[10px] text-gray-400">{pr.cantidad} ops</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Búsqueda */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lista de usuarios activos */}
          {usuariosActivos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No hay usuarios activos</p>
              <p className="text-gray-400 text-sm mt-1">Aprueba usuarios pendientes para que aparezcan aquí</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {usuariosActivos.map((usuario) => (
                <div 
                  key={usuario.id} 
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Info usuario */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                        <span className="text-lg font-bold text-blue-600">
                          {(usuario.nombre_completo || usuario.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {usuario.nombre_completo || 'Sin nombre'}
                          </h3>
                          {getEstadoBadge(usuario)}
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                            {usuario.rol}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {usuario.email}
                          </span>
                          {usuario.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {usuario.telefono}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Registrado: {new Date(usuario.created_at).toLocaleDateString('es-AR')}
                          {usuario.last_login && (
                            <span className="ml-3">
                              Último acceso: {new Date(usuario.last_login).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Control de API */}
                    <div className="flex items-center gap-6 sm:flex-shrink-0 ml-auto">
                      {/* Consumo API + Toggle */}
                      <div className="flex items-center gap-2">
                        <Code className={`h-4 w-4 ${usuario.api_habilitada ? 'text-blue-600' : 'text-gray-400'}`} />
                        {usuario.api_habilitada && (
                          <>
                            <span className="text-sm text-blue-600 font-medium">
                              {usuario.api_consumo_periodo || 0}/{usuario.api_creditos_limite || 0}
                            </span>
                            <button
                              onClick={() => editApiCredits(usuario)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar límite de créditos API"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {!usuario.api_habilitada && (
                          <span className="text-xs text-gray-400">&lt;&gt; API</span>
                        )}
                        {usuario.api_auto_renovar && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium" title="Se renueva automáticamente cada periodo">
                            Auto
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleApiAccess(usuario.id, usuario.api_habilitada)}
                        disabled={togglingApi === usuario.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          usuario.api_habilitada ? 'bg-blue-600' : 'bg-gray-200'
                        } ${togglingApi === usuario.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={usuario.api_habilitada 
                          ? `Deshabilitar API (${usuario.api_requests_periodo || 0} requests este periodo)` 
                          : 'Habilitar API para este periodo'
                        }
                        role="switch"
                        aria-checked={usuario.api_habilitada}
                      >
                        <span 
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                            usuario.api_habilitada ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                        {togglingApi === usuario.id && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Invitaciones */}
      {activeSubTab === 'invitaciones' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Generar invitación</h3>
            <p className="text-sm text-gray-500 mb-4">Crea enlaces para registrar usuarios en tu empresa.</p>

            <form onSubmit={generarInvitacion} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Email invitado (opcional)</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expira en horas</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={inviteExpiresHours}
                  onChange={(e) => setInviteExpiresHours(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Generar link
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h4 className="font-semibold text-gray-900">Historial de invitaciones</h4>
              <button
                onClick={cargarInvitaciones}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                disabled={inviteHistoryLoading}
              >
                {inviteHistoryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Actualizar
              </button>
            </div>

            {inviteHistoryLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : inviteHistory.length === 0 ? (
              <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">No hay invitaciones registradas aún.</div>
            ) : (
              <div className="space-y-3">
                {inviteHistory.map((inv) => (
                  <div key={inv.id} className="border rounded-lg p-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">Invitación #{inv.id}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badgeEstadoInvitacion(inv.estado_efectivo)}`}>
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
                          disabled={regeneratingInviteId === inv.id}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {regeneratingInviteId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Regenerar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Links recién generados</h4>
              <span className="text-xs text-gray-500">{inviteRecentLinks.length} links</span>
            </div>

            {inviteRecentLinks.length === 0 ? (
              <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">Genera una invitación para copiar su link aquí.</div>
            ) : (
              <div className="space-y-3">
                {inviteRecentLinks.map((inv, idx) => (
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
                        onClick={() => copiarLinkInvitacion(inv.invite_url)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-blue-700 break-all bg-blue-50 border border-blue-100 rounded p-2">{inv.invite_url}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Créditos Informes */}
      {activeSubTab === 'creditos' && (
        <div className="space-y-6">
          {loadingCreditos ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Balance de la empresa */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 sm:p-5 text-white">
                <div className="mb-4">
                  <p className="text-indigo-200 text-sm font-medium">Créditos disponibles de tu empresa</p>
                  <p className="text-3xl sm:text-4xl font-bold">
                    {Object.values(balanceEmpresa).reduce((sum, b) => sum + (b || 0), 0)}
                  </p>
                </div>
                
                {/* Balance por tipo - responsive grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  {Object.entries(REPORT_TYPES).map(([type, config]) => {
                    const Icon = config.icon
                    const bal = balanceEmpresa[type] || 0
                    const asig = asignaciones[type] || { asignado: 0, usado: 0 }
                    const sinAsignar = bal - asig.asignado
                    const sinCreditos = bal === 0
                    const hayPack = packsDisponibles[type] || false
                    const puedeComprar = sinCreditos && hayPack
                    const sinPack = sinCreditos && !hayPack
                    
                    const handleClick = () => {
                      if (puedeComprar) {
                        // Navegar a tienda de packs con el tipo específico
                        window.location.hash = `informes?tienda=1&tipo=${type}`
                        window.dispatchEvent(new HashChangeEvent('hashchange'))
                      }
                    }
                    
                    return (
                      <div 
                        key={type} 
                        className={`rounded-xl p-3 transition-all ${
                          sinCreditos 
                            ? puedeComprar 
                              ? 'bg-white/5 border border-white/20 cursor-pointer hover:bg-white/10' 
                              : 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                            : 'bg-white/10'
                        }`}
                        onClick={handleClick}
                        title={puedeComprar ? 'Click para comprar pack' : sinPack ? 'No hay packs disponibles' : ''}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-white/80" />
                          <span className="text-xs text-white/80 font-medium">{config.label}</span>
                        </div>
                        {sinCreditos ? (
                          <>
                            <p className="text-sm font-medium text-white/60">Sin créditos</p>
                            <div className="flex items-center gap-1 mt-1">
                              {puedeComprar ? (
                                <>
                                  <ShoppingCart className="h-3 w-3 text-white/50" />
                                  <span className="text-xs text-white/50">Comprar pack</span>
                                </>
                              ) : (
                                <span className="text-xs text-white/40">Sin packs</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xl sm:text-2xl font-bold">{bal}</p>
                            <p className="text-xs text-white/60">
                              Asig: {asig.asignado} · Libre: {sinAsignar}
                            </p>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Asignación a usuarios */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Asignar créditos a usuarios
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Distribuye los créditos de cada tipo de informe entre los miembros de tu equipo
                  </p>
                </div>

                {usuariosCreditos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay usuarios activos en tu equipo</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {usuariosCreditos.map((usuario, idx) => {
                      const limites = typeof usuario.limites_informes === 'string' 
                        ? JSON.parse(usuario.limites_informes || '{}') 
                        : usuario.limites_informes || {}
                      // Determinar si es admin por su email (el usuario logueado que es cliente_admin)
                      const isAdmin = usuario.email === user?.email
                      
                      return (
                        <div key={usuario.id} className={`p-3 sm:p-4 ${isAdmin ? 'bg-indigo-50/50' : ''}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isAdmin ? 'bg-indigo-100' : 'bg-blue-100'
                            }`}>
                              <span className={`text-sm sm:text-base font-semibold ${isAdmin ? 'text-indigo-600' : 'text-blue-600'}`}>
                                {(usuario.nombre_completo || usuario.email || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                  {usuario.nombre_completo || 'Sin nombre'}
                                </p>
                                {isAdmin && (
                                  <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
                            </div>
                          </div>
                          
                          {/* Créditos por tipo - responsive grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {Object.entries(REPORT_TYPES).map(([type, config]) => {
                              const Icon = config.icon
                              const empresaBalance = balanceEmpresa[type] || 0
                              const totalAsignado = asignaciones[type]?.asignado || 0
                              const creditosLibres = empresaBalance - totalAsignado
                              
                              // Para admin: tiene acceso a los créditos libres (no asignados)
                              // Para usuario normal: tiene acceso a su límite asignado
                              const userLimit = isAdmin 
                                ? creditosLibres 
                                : (limites[type]?.limite ?? 0)
                              const userUsado = isAdmin ? 0 : (limites[type]?.usado ?? 0)
                              
                              const isEditing = editingInforme?.userId === usuario.id && editingInforme?.reportType === type
                              const sinCreditos = empresaBalance === 0
                              const puedeEditar = !sinCreditos
                              
                              return (
                                <div key={type} className={`p-2 sm:p-3 rounded-lg border transition-all ${
                                  sinCreditos 
                                    ? 'bg-gray-100 border-gray-200 opacity-60' 
                                    : userLimit > 0 
                                      ? 'bg-green-50 border-green-200' 
                                      : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                      <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                                        sinCreditos ? 'text-gray-400' : userLimit > 0 ? 'text-green-600' : 'text-gray-400'
                                      }`} />
                                      <span className="text-xs font-medium text-gray-700 truncate">{config.label}</span>
                                    </div>
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max={creditosLibres + (limites[type]?.limite || 0)}
                                        value={limiteInforme}
                                        onChange={(e) => setLimiteInforme(e.target.value)}
                                        className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                      />
                                      <button
                                        onClick={saveInformeLimit}
                                        disabled={savingInforme}
                                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                                      >
                                        {savingInforme ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Save className="h-3 w-3 sm:h-4 sm:w-4" />}
                                      </button>
                                      <button
                                        onClick={cancelEditInforme}
                                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                      >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      {sinCreditos ? (
                                        <span className="text-xs text-gray-400">Sin pack</span>
                                      ) : (
                                        <span className={`text-sm sm:text-lg font-bold ${userLimit > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                          {userUsado}/{userLimit}
                                        </span>
                                      )}
                                      {puedeEditar && !isAdmin && (
                                        <button
                                          onClick={() => startEditInforme(usuario.id, type, limites[type]?.limite || 0)}
                                          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                          title="Editar asignación"
                                        >
                                          <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        </button>
                                      )}
                                      {isAdmin && !sinCreditos && (
                                        <span className="text-xs text-indigo-500">Auto</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {usuariosCreditos.length > 5 && (
                  <div className="p-3 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-500">
                      Mostrando {usuariosCreditos.length} usuarios · Scroll para ver más
                    </p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Los créditos se compran desde la <strong>Tienda de Packs</strong></li>
                  <li>El administrador (tú) tiene acceso automático a todos los créditos disponibles</li>
                  <li>Puedes asignar límites específicos a cada usuario de tu equipo</li>
                  <li>Los tipos sin créditos aparecen bloqueados - compra packs para habilitarlos</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Modal para habilitar/editar API */}
      {showApiModal && apiModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${apiModalMode === 'edit' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                <Code className={`h-6 w-6 ${apiModalMode === 'edit' ? 'text-amber-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {apiModalMode === 'edit' ? 'Configurar API' : 'Habilitar API'}
                </h3>
                <p className="text-sm text-gray-500">Periodo: {formatPeriodo(periodoActivo)}</p>
              </div>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Usuario:</strong> {apiModalUser.nombre_completo || apiModalUser.email}
              </p>
              {apiModalMode === 'edit' && (
                <p className="text-xs text-gray-500 mt-1">
                  Consumo actual: {apiModalUser.api_consumo_periodo || 0} créditos usados
                </p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Límite de créditos API para este periodo
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={apiCreditsLimit}
                onChange={(e) => setApiCreditsLimit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 50"
              />
              <p className="mt-1 text-xs text-gray-500">
                El usuario podrá usar hasta este número de créditos en consultas API durante {formatPeriodo(periodoActivo)}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={apiAutoRenovar}
                  onChange={(e) => setApiAutoRenovar(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Renovar automáticamente</span>
                  <p className="text-xs text-gray-600">
                    La API se habilitará automáticamente con el mismo límite al inicio de cada nuevo periodo
                  </p>
                </div>
              </label>
            </div>
            
            {!apiAutoRenovar && apiModalMode !== 'edit' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-700">
                  <strong>Nota:</strong> Al iniciar un nuevo periodo de facturación, deberás habilitar la API nuevamente para este usuario y asignar el límite de créditos correspondiente.
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApiModal(false)
                  setApiModalUser(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
              
              {apiModalMode === 'edit' && (
                <button
                  onClick={() => {
                    setShowApiModal(false)
                    toggleApiAccess(apiModalUser.id, true) // Deshabilitar
                  }}
                  disabled={togglingApi === apiModalUser.id}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Quitar
                </button>
              )}
              
              <button
                onClick={confirmEnableApi}
                disabled={togglingApi === apiModalUser.id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
              >
                {togglingApi === apiModalUser.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {apiModalMode === 'edit' ? 'Guardar' : 'Habilitar API'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
