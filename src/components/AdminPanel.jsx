import { useState, useEffect } from 'react'
import { 
  Users, Shield, ScrollText, Plus, Edit2, Trash2, Lock, Unlock, 
  Loader2, AlertCircle, CheckCircle, X, Eye, EyeOff, RefreshCw,
  ChevronDown, ChevronUp, Key, UserPlus, Copy, KeyRound, Webhook,
  Building2, UserCheck, Clock, XCircle, Check, Package
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import AdminReportPacksView from './admin/AdminReportPacksView'
import AdminClientesBalanceView from './admin/AdminClientesBalanceView'

// ============================================
// TABS DEL PANEL
// ============================================
const TABS = [
  { key: 'usuarios', label: 'Usuarios', icon: Users },
  { key: 'aprobaciones', label: 'Aprobaciones', icon: UserCheck },
  { key: 'informes', label: 'Packs', icon: Package },
  { key: 'clientes-prepago', label: 'Clientes Prepago', icon: Building2 },
  { key: 'roles', label: 'Roles', icon: Shield },
  { key: 'logs', label: 'Auditoría', icon: ScrollText },
  { key: 'apikeys', label: 'API Keys', icon: KeyRound },
  { key: 'webhooks', label: 'Webhooks', icon: Webhook },
]

function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('usuarios')
  const [aprobacionesPendientes, setAprobacionesPendientes] = useState(0)

  // Cargar contador de aprobaciones pendientes
  useEffect(() => {
    const fetchPendientes = async () => {
      try {
        const res = await axios.get('/api/admin/aprobaciones-count')
        if (res.data.success) {
          setAprobacionesPendientes(res.data.count || 0)
          // Si hay pendientes, mostrar tab de aprobaciones automáticamente
          if (res.data.count > 0) {
            setActiveTab('aprobaciones')
          }
        }
      } catch (err) {
        console.error('Error cargando pendientes:', err)
      }
    }
    fetchPendientes()
  }, [])

  // Refrescar cuando se cambia de tab a aprobaciones
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
  }

  // Callback para actualizar contador cuando se aprueba/rechaza
  const onAprobacionChange = () => {
    axios.get('/api/admin/aprobaciones-count')
      .then(res => { if (res.data.success) setAprobacionesPendientes(res.data.count || 0) })
      .catch(() => {})
  }

  return (
    <div className="w-full px-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Panel de Administración</h2>
            <p className="text-sm text-gray-500">Gestión de usuarios, roles y auditoría</p>
          </div>
          <button onClick={onBack} className="btn-secondary text-sm">← Volver</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isAprobaciones = tab.key === 'aprobaciones'
            const showBadge = isAprobaciones && aprobacionesPendientes > 0
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all relative ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : showBadge 
                      ? 'text-red-600 hover:text-red-700 bg-red-50'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${showBadge && activeTab !== tab.key ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 sm:ml-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {aprobacionesPendientes > 9 ? '9+' : aprobacionesPendientes}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Alerta de pendientes */}
        {aprobacionesPendientes > 0 && activeTab !== 'aprobaciones' && (
          <div 
            onClick={() => handleTabChange('aprobaciones')}
            className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                {aprobacionesPendientes} usuario{aprobacionesPendientes > 1 ? 's' : ''} pendiente{aprobacionesPendientes > 1 ? 's' : ''} de aprobación
              </p>
              <p className="text-sm text-amber-600">Haz clic aquí para revisar las solicitudes</p>
            </div>
            <ChevronDown className="h-5 w-5 text-amber-500" />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'usuarios' && <UsersTab />}
      {activeTab === 'aprobaciones' && <AprobacionesTab onAprobacionChange={onAprobacionChange} />}
      {activeTab === 'informes' && <AdminReportPacksView />}
      {activeTab === 'clientes-prepago' && <AdminClientesBalanceView />}
      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'logs' && <LogsTab />}
      {activeTab === 'apikeys' && <ApiKeysTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
    </div>
  )
}

// ============================================
// TAB: USUARIOS
// ============================================
function UsersTab() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/api/admin/usuarios'),
        axios.get('/api/admin/roles'),
      ])
      if (usersRes.data.success) setUsers(usersRes.data.usuarios)
      if (rolesRes.data.success) setRoles(rolesRes.data.roles)
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await axios.put(`/api/admin/usuarios/${user.id}`, { activo: !user.activo })
      toast.success(user.activo ? 'Usuario desactivado' : 'Usuario activado')
      loadData()
    } catch { toast.error('Error') }
  }

  const handleUnlock = async (user) => {
    try {
      await axios.post(`/api/admin/usuarios/${user.id}/unlock`)
      toast.success('Usuario desbloqueado')
      loadData()
    } catch { toast.error('Error') }
  }

  const handleDelete = async (user) => {
    if (!confirm(`¿Desactivar al usuario "${user.username}"?`)) return
    try {
      await axios.delete(`/api/admin/usuarios/${user.id}`)
      toast.success('Usuario desactivado')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{users.length} usuarios</span>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => { setEditingUser(null); setShowForm(true) }} className="btn-primary text-sm flex items-center gap-1">
            <UserPlus className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className={`bg-white rounded-lg border p-4 ${!user.activo ? 'opacity-60' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  user.rol === 'admin' ? 'bg-red-500' : user.rol === 'analista' ? 'bg-blue-500' : 'bg-gray-500'
                }`}>
                  {user.username[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{user.nombre_completo || user.username}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.rol === 'admin' ? 'bg-red-100 text-red-700' :
                      user.rol === 'analista' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{user.rol}</span>
                    {user.bloqueado && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">BLOQUEADO</span>}
                    {!user.activo && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">INACTIVO</span>}
                    {user.must_change_password && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">Debe cambiar pwd</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">@{user.username} · {user.email || 'Sin email'}</p>
                  <p className="text-xs text-gray-400">
                    Último login: {user.last_login ? new Date(user.last_login).toLocaleString('es-AR') : 'Nunca'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {user.bloqueado && (
                  <button onClick={() => handleUnlock(user)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Desbloquear">
                    <Unlock className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setResetPasswordUser(user)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Reset contraseña">
                  <Key className="h-4 w-4" />
                </button>
                <button onClick={() => { setEditingUser(user); setShowForm(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(user)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Desactivar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de crear/editar usuario */}
      {showForm && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          onClose={() => { setShowForm(false); setEditingUser(null) }}
          onSave={() => { setShowForm(false); setEditingUser(null); loadData() }}
        />
      )}

      {/* Modal de reset password */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => { setResetPasswordUser(null); loadData() }}
        />
      )}
    </div>
  )
}

// ── Validación de identificador fiscal ──
function validateTaxId(taxId, tipo) {
  if (!taxId) return { valid: false, error: 'Requerido' }
  const clean = taxId.replace(/[-.\\s/]/g, '')
  if (!clean) return { valid: false, error: 'Requerido' }

  if (tipo === 'CUIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 11) return { valid: false, error: 'Debe tener 11 dígitos' }
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const suma = mult.reduce((s, m, i) => s + parseInt(clean[i]) * m, 0)
    const resto = 11 - (suma % 11)
    const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto
    if (parseInt(clean[10]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RUT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 12) return { valid: false, error: 'Debe tener 12 dígitos' }
    const rest = clean.slice(0, 11)
    let total = 0, factor = 2
    for (let i = 10; i >= 0; i--) {
      total += factor * parseInt(rest[i])
      factor = factor === 9 ? 2 : factor + 1
    }
    let dv = 11 - (total % 11)
    if (dv === 11) dv = 0
    else if (dv === 10) dv = 1
    if (parseInt(clean[11]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RNC') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 7 || clean.length > 16) return { valid: false, error: '7-16 dígitos' }
    return { valid: true }
  }
  if (tipo === 'NIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (tipo === 'RUC') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 20) return { valid: false, error: '5-20 dígitos' }
    return { valid: true }
  }
  if (tipo === 'RTN') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 9 || clean.length > 20) return { valid: false, error: '9-20 dígitos' }
    return { valid: true }
  }
  if (tipo === 'CEDULA JURIDICA') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (tipo === 'EIN') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 9) return { valid: false, error: 'Debe tener 9 dígitos' }
    return { valid: true }
  }
  if (tipo === 'CNPJ') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 14) return { valid: false, error: 'Debe tener 14 dígitos' }
    return { valid: true }
  }
  if (tipo === 'HRB' || tipo === 'RFC' || tipo === 'NUMERO FISCAL') {
    if (clean.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' }
    return { valid: true }
  }
  // Fallback para otros tipos
  if (clean.length < 5) return { valid: false, error: 'Mínimo 5 caracteres' }
  return { valid: true }
}

// ============================================
// MODAL: CREAR/EDITAR USUARIO
// ============================================
function UserFormModal({ user, roles, onClose, onSave }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    nombre_completo: user?.nombre_completo || '',
    rol: user?.rol || 'analista',
    password: '',
    confirmPassword: '',
    activo: user?.activo ?? true,
    pais: user?.pais_cliente || 'AR',
    cuit_cliente: user?.cuit_cliente || '',
    razon_social_manual: user?.razon_social_cliente || '',
    telefono: user?.telefono || '',
    codigo_telefono: user?.codigo_telefono || '+54',
    codigoTelManual: false,
    telefono2: user?.telefono2 || '',
    codigo_telefono2: user?.codigo_telefono2 || '',
    pais_telefono2: user?.pais_telefono2 || '',
    codigoTel2Manual: false,
  })
  const [mostrarTelefono2, setMostrarTelefono2] = useState(!!(user?.telefono2))
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [paises, setPaises] = useState([])
  const [loadingPaises, setLoadingPaises] = useState(false)
  const [searchingEmpresa, setSearchingEmpresa] = useState(false)
  const [empresaEncontrada, setEmpresaEncontrada] = useState(null)
  // Estados para modal de otros países
  const [showOtrosPaisesModal, setShowOtrosPaisesModal] = useState(false)
  const [otrosPaises, setOtrosPaises] = useState([])
  const [loadingOtros, setLoadingOtros] = useState(false)
  const [otrosSearch, setOtrosSearch] = useState('')
  const [paisSearch, setPaisSearch] = useState('')
  const [showPaisDropdown, setShowPaisDropdown] = useState(false)
  
  // Estados para validar cliente_admin (para cliente_usuario)
  const [validandoAdmin, setValidandoAdmin] = useState(false)
  const [adminExiste, setAdminExiste] = useState(null)
  const [adminInfo, setAdminInfo] = useState(null)
  
  // Validación de formato del identificador fiscal
  const [taxIdValidation, setTaxIdValidation] = useState({ valid: false, error: null })
  
  // Modo edición de empresa (solo admin puede modificar si ya tiene CUIT)
  const [editandoEmpresa, setEditandoEmpresa] = useState(false)
  const empresaYaAsignada = isEdit && user?.cuit_cliente

  // Cargar países
  useEffect(() => {
    setLoadingPaises(true)
    axios.get('/api/paises')
      .then(res => {
        if (res.data.success) setPaises(res.data.paises || [])
      })
      .catch(() => {})
      .finally(() => setLoadingPaises(false))
  }, [])

  const rolRequiereEmpresa = ['cliente_admin', 'cliente_usuario'].includes(form.rol)
  const paisSeleccionado = paises.find(p => p.codigo === form.pais)
  const tipoIdentificador = paisSeleccionado?.tipo_identificacion || 'ID'
  const empresaNoEncontrada = form.cuit_cliente && form.cuit_cliente.length >= 5 && !searchingEmpresa && !empresaEncontrada

  // Abrir modal de otros países
  const openOtrosPaisesModal = async () => {
    setShowPaisDropdown(false)
    setShowOtrosPaisesModal(true)
    setOtrosSearch('')
    setLoadingOtros(true)
    try {
      const res = await axios.get('/api/countries/available')
      setOtrosPaises(res.data.paises || [])
    } catch (err) {
      setOtrosPaises([])
    } finally {
      setLoadingOtros(false)
    }
  }

  // Seleccionar un país de "otros"
  const handleSelectOtroPais = (pais) => {
    const codigoTel = pais.codigo_telefono || '+54'
    setForm({...form, pais: pais.codigo, cuit_cliente: '', razon_social_manual: '', codigo_telefono: codigoTel})
    // Agregar el país a la lista local si no está
    if (!paises.find(p => p.codigo === pais.codigo)) {
      setPaises([...paises, {
        codigo: pais.codigo,
        nombre: pais.nombre,
        bandera: pais.bandera,
        tipo_identificacion: pais.tipo_identificacion || 'ID',
        formato: pais.formato || 'Sin definir',
        codigo_telefono: pais.codigo_telefono
      }])
    }
    setShowOtrosPaisesModal(false)
  }

  // Validar formato del identificador fiscal en tiempo real
  useEffect(() => {
    if (!form.cuit_cliente || !rolRequiereEmpresa) {
      setTaxIdValidation({ valid: false, error: null })
      return
    }
    const tipoId = paisSeleccionado?.tipo_identificacion || 'CUIT'
    const result = validateTaxId(form.cuit_cliente, tipoId)
    setTaxIdValidation(result)
  }, [form.cuit_cliente, form.pais, rolRequiereEmpresa, paisSeleccionado])

  // Buscar empresa por CUIT (debounced)
  useEffect(() => {
    if (!rolRequiereEmpresa || !form.cuit_cliente || form.cuit_cliente.length < 5) {
      setEmpresaEncontrada(null)
      return
    }
    
    const timer = setTimeout(async () => {
      setSearchingEmpresa(true)
      try {
        const tipoId = paisSeleccionado?.tipo_identificacion || 'CUIT'
        const res = await axios.get(`/api/buscar-empresa?cuit=${encodeURIComponent(form.cuit_cliente)}&tipo=${tipoId}`)
        if (res.data.success && res.data.empresa) {
          setEmpresaEncontrada(res.data.empresa)
        } else {
          setEmpresaEncontrada(null)
        }
      } catch {
        setEmpresaEncontrada(null)
      } finally {
        setSearchingEmpresa(false)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [form.cuit_cliente, form.pais, rolRequiereEmpresa])

  // Validar si existe cliente_admin cuando el rol es cliente_usuario
  useEffect(() => {
    if (form.rol !== 'cliente_usuario' || !form.cuit_cliente || form.cuit_cliente.length < 5) {
      setAdminExiste(null)
      setAdminInfo(null)
      return
    }

    const timer = setTimeout(async () => {
      setValidandoAdmin(true)
      try {
        const res = await axios.get(`/api/validar-cliente-admin?cuit=${encodeURIComponent(form.cuit_cliente)}&pais=${form.pais}`)
        setAdminExiste(res.data.existe)
        setAdminInfo(res.data.admin || null)
      } catch {
        setAdminExiste(false)
        setAdminInfo(null)
      } finally {
        setValidandoAdmin(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.rol, form.cuit_cliente, form.pais])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    // Validar campos obligatorios
    if (!form.nombre_completo) {
      setErrors(['El nombre completo es obligatorio'])
      setLoading(false)
      return
    }
    if (!form.email) {
      setErrors(['El email es obligatorio'])
      setLoading(false)
      return
    }

    // Validar contraseña al crear
    if (!isEdit) {
      if (!form.password) {
        setErrors(['La contraseña es obligatoria'])
        setLoading(false)
        return
      }
      if (form.password !== form.confirmPassword) {
        setErrors(['Las contraseñas no coinciden'])
        setLoading(false)
        return
      }
      // Validar requisitos de contraseña
      const passErrors = []
      if (form.password.length < 8) passErrors.push('mínimo 8 caracteres')
      if (!/[A-Z]/.test(form.password)) passErrors.push('una mayúscula')
      if (!/[0-9]/.test(form.password)) passErrors.push('un número')
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) passErrors.push('un carácter especial')
      if (passErrors.length > 0) {
        setErrors([`La contraseña debe tener: ${passErrors.join(', ')}`])
        setLoading(false)
        return
      }
    }

    // Validar campos para roles cliente
    if (rolRequiereEmpresa) {
      if (!form.cuit_cliente) {
        setErrors([`Debe ingresar el ${tipoIdentificador} del cliente`])
        setLoading(false)
        return
      }
      // Teléfono es obligatorio para clientes
      if (!form.telefono || form.telefono.trim() === '') {
        setErrors(['El teléfono de contacto es obligatorio'])
        setLoading(false)
        return
      }
      // Validar código telefónico si es manual
      if (form.codigoTelManual && (!form.codigo_telefono || !form.codigo_telefono.startsWith('+'))) {
        setErrors(['Ingrese un código telefónico válido (ej: +52)'])
        setLoading(false)
        return
      }
      // Para cliente_admin: si no se encontró empresa, el nombre es obligatorio
      if (form.rol === 'cliente_admin' && !empresaEncontrada && !form.razon_social_manual) {
        setErrors(['Debe ingresar el nombre de la empresa'])
        setLoading(false)
        return
      }
      // Para cliente_usuario: debe existir un cliente_admin
      if (form.rol === 'cliente_usuario' && !adminExiste) {
        setErrors(['No existe un administrador registrado para esta empresa. El administrador debe registrarse primero.'])
        setLoading(false)
        return
      }
    }

    try {
      // Determinar razón social: encontrada, manual, o del admin (para cliente_usuario)
      const razonSocialFinal = empresaEncontrada?.razon_social || form.razon_social_manual || adminInfo?.razon_social || null
      // Código telefónico: manual o del país seleccionado
      const codigoTelFinal = form.codigoTelManual ? form.codigo_telefono : (paisSeleccionado?.codigo_telefono || form.codigo_telefono || null)

      if (isEdit) {
        const updateData = {
          nombre_completo: form.nombre_completo,
          email: form.email,
          rol: form.rol,
          activo: form.activo,
          cuit_cliente: rolRequiereEmpresa ? form.cuit_cliente : null,
          pais_cliente: rolRequiereEmpresa ? form.pais : null,
          razon_social_cliente: rolRequiereEmpresa ? razonSocialFinal : null,
          telefono: rolRequiereEmpresa ? (form.telefono || null) : null,
          codigo_telefono: rolRequiereEmpresa ? codigoTelFinal : null,
          telefono2: rolRequiereEmpresa && mostrarTelefono2 ? (form.telefono2 || null) : null,
          codigo_telefono2: rolRequiereEmpresa && mostrarTelefono2 ? (form.codigo_telefono2 || null) : null,
        }
        const res = await axios.put(`/api/admin/usuarios/${user.id}`, updateData)
        if (res.data.success) {
          toast.success('Usuario actualizado')
          onSave()
        } else {
          setErrors([res.data.error])
        }
      } else {
        const createData = {
          ...form,
          cuit_cliente: rolRequiereEmpresa ? form.cuit_cliente : null,
          pais_cliente: rolRequiereEmpresa ? form.pais : null,
          razon_social_cliente: rolRequiereEmpresa ? razonSocialFinal : null,
          telefono: rolRequiereEmpresa ? (form.telefono || null) : null,
          codigo_telefono: rolRequiereEmpresa ? codigoTelFinal : null,
          telefono2: rolRequiereEmpresa && mostrarTelefono2 ? (form.telefono2 || null) : null,
          codigo_telefono2: rolRequiereEmpresa && mostrarTelefono2 ? (form.codigo_telefono2 || null) : null,
        }
        const res = await axios.post('/api/admin/usuarios', createData)
        if (res.data.success) {
          toast.success('Usuario creado')
          onSave()
        } else {
          setErrors(res.data.password_errors || [res.data.error])
        }
      }
    } catch (err) {
      setErrors([err.response?.data?.error || 'Error'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
              {errors.map((err, i) => <p key={i} className="text-sm text-red-600">{err}</p>)}
            </div>
          )}

          {/* Fila 1: Usuario y Nombre completo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                disabled={isEdit}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input
                type="text"
                value={form.nombre_completo}
                onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Fila 2: Email y Rol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({...form, rol: e.target.value, cuit_cliente: ''})}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre} - {r.descripcion}</option>)}
              </select>
            </div>
          </div>

          {/* Selector de empresa para roles cliente - por País + ID */}
          {rolRequiereEmpresa && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800">
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">Empresa cliente</span>
                </div>
                {/* Botón para editar empresa (solo al editar usuario con empresa ya asignada) */}
                {empresaYaAsignada && !editandoEmpresa && (
                  <button
                    type="button"
                    onClick={() => setEditandoEmpresa(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Modificar empresa
                  </button>
                )}
                {empresaYaAsignada && editandoEmpresa && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoEmpresa(false)
                      setForm({...form, pais: user.pais_cliente, cuit_cliente: user.cuit_cliente, razon_social_manual: user.razon_social_cliente})
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Cancelar
                  </button>
                )}
              </div>
              
              {/* Modo solo lectura: Mostrar datos de empresa sin editar */}
              {empresaYaAsignada && !editandoEmpresa ? (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <img 
                      src={`https://flagcdn.com/24x18/${(form.pais || 'ar').toLowerCase()}.png`} 
                      alt="" 
                      className="w-6 h-4 object-cover rounded-sm shadow-sm"
                    />
                    <span className="font-medium text-gray-900">{paisSeleccionado?.nombre || form.pais}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">{tipoIdentificador}:</span>
                      <p className="font-medium text-gray-800">{form.cuit_cliente}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Empresa:</span>
                      <p className="font-medium text-gray-800">{form.razon_social_manual || 'Sin nombre'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {/* Fila: País e Identificador */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector de país con dropdown personalizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">País *</label>
                  <div className="relative">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPaisDropdown(!showPaisDropdown)}
                        className="flex-1 px-3 py-2.5 border border-blue-300 rounded-lg text-sm bg-white flex items-center justify-between hover:border-blue-400 transition-colors"
                        disabled={loadingPaises}
                      >
                        {loadingPaises ? (
                          <span className="text-gray-400">Cargando...</span>
                        ) : paisSeleccionado ? (
                          <span className="flex items-center gap-2">
                            <img 
                              src={`https://flagcdn.com/24x18/${paisSeleccionado.codigo.toLowerCase()}.png`} 
                              alt="" 
                              className="w-6 h-4 object-cover rounded-sm"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                            <span>{paisSeleccionado.nombre}</span>
                            <span className="text-blue-600 text-xs">({paisSeleccionado.tipo_identificacion || 'ID'})</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Seleccionar país...</span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showPaisDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {/* Botón limpiar país */}
                      {paisSeleccionado && (
                        <button
                          type="button"
                          onClick={() => setForm({...form, pais: '', cuit_cliente: '', razon_social_manual: ''})}
                          className="px-2 py-2 border border-gray-300 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 bg-white transition-colors"
                          title="Limpiar país"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {showPaisDropdown && (
                      <div className="absolute z-[100] bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden" style={{maxHeight: '320px'}}>
                        {/* Lista de países (arriba) */}
                        <div className="overflow-y-auto" style={{maxHeight: '260px'}}>
                          {paises
                            .filter(p => !paisSearch || p.nombre.toLowerCase().includes(paisSearch.toLowerCase()) || p.codigo.toLowerCase().includes(paisSearch.toLowerCase()))
                            .map(p => (
                            <button
                              key={p.codigo}
                              type="button"
                              onClick={() => { 
                                const codigoTel = p.codigo_telefono || '+54'
                                setForm({...form, pais: p.codigo, cuit_cliente: '', razon_social_manual: '', codigo_telefono: codigoTel})
                                setShowPaisDropdown(false)
                                setPaisSearch('') 
                              }}
                              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${form.pais === p.codigo ? 'bg-blue-100 font-semibold' : ''}`}
                            >
                              <img 
                                src={`https://flagcdn.com/24x18/${p.codigo.toLowerCase()}.png`} 
                                alt="" 
                                className="w-6 h-4 object-cover rounded-sm shadow-sm"
                                onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" fill="%23ccc"><rect width="24" height="18" rx="2"/></svg>' }}
                              />
                              <span className="text-sm flex-1">
                                <span className="text-gray-400 font-mono text-xs mr-1">{p.codigo}</span>
                                {p.nombre}
                              </span>
                              <span className="text-blue-600 text-xs font-medium">{p.tipo_identificacion || 'ID'}</span>
                            </button>
                          ))}
                          {/* Separador y opción "Otros" */}
                          {!paisSearch && (
                            <>
                              <div className="border-t my-1" />
                              <button
                                type="button"
                                onClick={openOtrosPaisesModal}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left text-purple-700"
                              >
                                <span className="text-lg">🌍</span>
                                <span className="text-sm font-medium">Otros países...</span>
                              </button>
                            </>
                          )}
                        </div>
                        {/* Buscador (abajo porque el dropdown abre hacia arriba) */}
                        <div className="p-2 border-t bg-white">
                          <input
                            type="text"
                            placeholder="Buscar país..."
                            value={paisSearch}
                            onChange={(e) => setPaisSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campo Identificador (CUIT/RUC/RUT/ID) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {tipoIdentificador} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.cuit_cliente}
                      onChange={(e) => setForm({...form, cuit_cliente: e.target.value, razon_social_manual: ''})}
                      placeholder={paisSeleccionado?.formato || 'Ingrese identificador'}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:outline-none bg-white ${
                        form.cuit_cliente 
                          ? taxIdValidation.valid 
                            ? 'border-green-400 focus:ring-green-500' 
                            : 'border-red-400 focus:ring-red-500'
                          : 'border-blue-300 focus:ring-blue-500'
                      }`}
                      required
                    />
                    {searchingEmpresa && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
                    )}
                  </div>
                  {/* Feedback de validación de formato */}
                  {form.cuit_cliente && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${taxIdValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                      {taxIdValidation.valid ? (
                        <><CheckCircle className="h-3 w-3" /> Formato válido</>
                      ) : (
                        <><AlertCircle className="h-3 w-3" /> {taxIdValidation.error}</>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Resultado de búsqueda - diferente según rol */}
              {form.rol === 'cliente_admin' ? (
                // Para cliente_admin: mostrar empresa encontrada o permitir ingreso manual
                <>
                  {empresaEncontrada ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Empresa encontrada</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{empresaEncontrada.razon_social}</p>
                      <p className="text-xs text-gray-600">{tipoIdentificador}: {form.cuit_cliente}</p>
                    </div>
                  ) : empresaNoEncontrada ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Empresa no encontrada. Ingrese los datos manualmente:</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la empresa *</label>
                        <input
                          type="text"
                          value={form.razon_social_manual}
                          onChange={(e) => setForm({...form, razon_social_manual: e.target.value})}
                          placeholder="Razón social o nombre comercial"
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                          required
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : form.rol === 'cliente_usuario' ? (
                // Para cliente_usuario: SOLO validar si existe admin
                <>
                  {form.cuit_cliente && form.cuit_cliente.length >= 5 && (
                    <div className={`border rounded-lg p-3 ${
                      validandoAdmin 
                        ? 'bg-blue-50 border-blue-200'
                        : adminExiste
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                    }`}>
                      {validandoAdmin ? (
                        <div className="flex items-center gap-2 text-blue-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Verificando administrador...</span>
                        </div>
                      ) : adminExiste ? (
                        <div>
                          <div className="flex items-center gap-2 text-green-700 mb-1">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Empresa registrada</span>
                          </div>
                          {adminInfo && (
                            <>
                              <p className="text-sm font-medium text-gray-900">{adminInfo.razon_social || 'Empresa'}</p>
                              <p className="text-xs text-gray-600">Admin: {adminInfo.nombre_completo} ({adminInfo.email})</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="h-4 w-4" />
                          <div>
                            <p className="text-xs font-medium">No hay administrador registrado</p>
                            <p className="text-xs">El administrador de la empresa debe registrarse primero</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
              
              {/* Campo de teléfono - dentro de empresa cliente */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Teléfono de contacto <span className="text-gray-800">*</span>
                </label>
                <div className="flex gap-2">
                  {form.codigoTelManual ? (
                    <input
                      type="text"
                      value={form.codigo_telefono}
                      onChange={(e) => setForm({...form, codigo_telefono: e.target.value.replace(/[^+\d]/g, '')})}
                      placeholder="+XX"
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm min-w-[80px]">
                      {paisSeleccionado && (
                        <img 
                          src={`https://flagcdn.com/24x18/${paisSeleccionado.codigo.toLowerCase()}.png`} 
                          alt="" 
                          className="w-5 h-4 object-cover rounded-sm"
                        />
                      )}
                      <span className="text-gray-700 font-medium">{paisSeleccionado?.codigo_telefono || '+54'}</span>
                    </div>
                  )}
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({...form, telefono: e.target.value.replace(/[^\d\s-]/g, '')})}
                    placeholder={paisSeleccionado?.formato_telefono || 'Número de teléfono'}
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (form.codigoTelManual) {
                      setForm({...form, codigoTelManual: false, codigo_telefono: paisSeleccionado?.codigo_telefono || '+54'})
                    } else {
                      setForm({...form, codigoTelManual: true, codigo_telefono: ''})
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  {form.codigoTelManual ? '← Usar código del país' : '¿Otro código? Ingresar manualmente'}
                </button>
              </div>

              {/* Botón para agregar segundo teléfono */}
              {!mostrarTelefono2 && (
                <button
                  type="button"
                  onClick={() => setMostrarTelefono2(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Agregar otro teléfono
                </button>
              )}

              {/* Segundo teléfono (opcional) */}
              {mostrarTelefono2 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Teléfono alternativo
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarTelefono2(false)
                        setForm({...form, telefono2: '', codigo_telefono2: '', pais_telefono2: '', codigoTel2Manual: false})
                      }}
                      className="ml-2 text-red-500 hover:text-red-700 text-xs"
                    >
                      (quitar)
                    </button>
                  </label>
                  <div className="flex gap-2">
                    {form.codigoTel2Manual ? (
                      <input
                        type="text"
                        value={form.codigo_telefono2}
                        onChange={(e) => setForm({...form, codigo_telefono2: e.target.value.replace(/[^+\d]/g, '')})}
                        placeholder="+XX"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      />
                    ) : (
                      <select
                        value={form.pais_telefono2}
                        onChange={(e) => {
                          if (e.target.value === '_manual') {
                            setForm({...form, codigoTel2Manual: true, pais_telefono2: '', codigo_telefono2: ''})
                          } else {
                            const paisSel = paises.find(p => p.codigo === e.target.value)
                            setForm({
                              ...form, 
                              pais_telefono2: e.target.value,
                              codigo_telefono2: paisSel?.codigo_telefono || ''
                            })
                          }
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[140px]"
                      >
                        <option value="">Seleccionar país</option>
                        {paises.map(p => (
                          <option key={p.codigo} value={p.codigo}>
                            {p.codigo_telefono} {p.nombre}
                          </option>
                        ))}
                        <option value="_manual">✏️ Otro código...</option>
                      </select>
                    )}
                    <input
                      type="tel"
                      value={form.telefono2}
                      onChange={(e) => setForm({...form, telefono2: e.target.value.replace(/[^\d\s-]/g, '')})}
                      placeholder="Número de teléfono"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      disabled={!form.pais_telefono2 && !form.codigoTel2Manual}
                    />
                  </div>
                  {form.codigoTel2Manual && (
                    <button
                      type="button"
                      onClick={() => setForm({...form, codigoTel2Manual: false, codigo_telefono2: '', pais_telefono2: ''})}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      ← Seleccionar de la lista
                    </button>
                  )}
                  {form.pais_telefono2 && !form.codigoTel2Manual && (
                    <p className="text-xs text-gray-500 mt-1">
                      Código: {form.codigo_telefono2}
                    </p>
                  )}
                </div>
              )}
              </>
              )}
            </div>
          )}

          {/* Contraseña (solo al crear) */}
          {!isEdit && (
            <div className="space-y-3">
              {/* Validación visual de contraseña */}
              {form.password && (
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Requisitos de contraseña:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className={`flex items-center gap-1 ${form.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                      {form.password.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      Mínimo 8 caracteres
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[A-Z]/.test(form.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      Una mayúscula
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[0-9]/.test(form.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      Un número
                    </span>
                    <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      Carácter especial
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ingrese contraseña"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder="Confirme contraseña"
                    />
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>
              </div>
              
              {/* Botón generar/limpiar contraseña */}
              <button
                type="button"
                onClick={() => {
                  if (form.password) {
                    // Limpiar contraseña
                    setForm({...form, password: '', confirmPassword: ''})
                    setShowPassword(false)
                  } else {
                    // Generar contraseña
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*'
                    let pass = ''
                    pass += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
                    pass += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
                    pass += '0123456789'[Math.floor(Math.random() * 10)]
                    pass += '!@#$%&*'[Math.floor(Math.random() * 7)]
                    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)]
                    pass = pass.split('').sort(() => Math.random() - 0.5).join('')
                    setForm({...form, password: pass, confirmPassword: pass})
                    setShowPassword(true)
                  }
                }}
                className={`text-sm flex items-center gap-1 ${form.password ? 'text-amber-600 hover:text-amber-800' : 'text-blue-600 hover:text-blue-800'}`}
              >
                {form.password ? (
                  <><X className="h-3.5 w-3.5" /> Limpiar contraseña</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> Generar contraseña segura</>
                )}
              </button>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({...form, activo: e.target.checked})}
                className="rounded"
              />
              <label className="text-sm text-gray-700">Cuenta activa</label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary text-sm">Cancelar</button>
            <button 
              type="submit" 
              disabled={
                loading ||
                !form.email?.trim() ||
                !form.nombre_completo?.trim() ||
                // Validación de contraseña solo al crear
                (!isEdit && (
                  !form.username?.trim() ||
                  !form.password ||
                  form.password !== form.confirmPassword ||
                  form.password.length < 8 ||
                  !/[A-Z]/.test(form.password) ||
                  !/[0-9]/.test(form.password) ||
                  !/[!@#$%^&*(),.?":{}|<>]/.test(form.password)
                )) ||
                // Validación para roles cliente
                (rolRequiereEmpresa && (
                  !form.cuit_cliente?.trim() ||
                  !taxIdValidation.valid ||
                  !form.telefono?.trim() ||
                  (form.codigoTelManual && (!form.codigo_telefono || !form.codigo_telefono.startsWith('+'))) ||
                  (form.rol === 'cliente_admin' && !empresaEncontrada && !form.razon_social_manual?.trim()) ||
                  (form.rol === 'cliente_usuario' && !adminExiste)
                ))
              } 
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Otros Países */}
      {showOtrosPaisesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOtrosPaisesModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-xl">🌍</span> Seleccionar otro país
              </h3>
              <button
                onClick={() => setShowOtrosPaisesModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 border-b">
              <input
                type="text"
                placeholder="Buscar país por nombre..."
                value={otrosSearch}
                onChange={(e) => setOtrosSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingOtros ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando países...
                </div>
              ) : otrosPaises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay más países disponibles
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {otrosPaises
                    .filter(p => !otrosSearch || p.nombre.toLowerCase().includes(otrosSearch.toLowerCase()))
                    .map(p => (
                    <button
                      key={p.codigo}
                      type="button"
                      onClick={() => handleSelectOtroPais(p)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left rounded-xl"
                    >
                      <img 
                        src={`https://flagcdn.com/24x18/${p.codigo.toLowerCase()}.png`} 
                        alt="" 
                        className="w-6 h-4 object-cover rounded-sm shadow-sm"
                        onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" fill="%23ccc"><rect width="24" height="18" rx="2"/></svg>' }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 truncate block">{p.nombre}</span>
                        <span className="text-gray-400 text-xs">{p.codigo}</span>
                      </span>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded whitespace-nowrap">
                        {p.tipo_identificacion || 'ID'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500 text-center">
                Seleccione un país de la lista
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MODAL: RESET PASSWORD (ADMIN)
// ============================================
function ResetPasswordModal({ user, onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`/api/admin/usuarios/${user.id}/reset-password`, { new_password: password })
      if (res.data.success) {
        toast.success(`Contraseña de "${user.username}" reseteada`)
        onSuccess()
      } else {
        toast.error(res.data.password_errors?.join(', ') || res.data.error)
      }
    } catch (err) {
      toast.error('Error al resetear contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl p-5">
        <h3 className="text-lg font-bold mb-1">Reset Contraseña</h3>
        <p className="text-sm text-gray-500 mb-4">Usuario: <strong>{user.username}</strong></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Nueva contraseña (8+ chars, mayúsc, núm, símbolo)"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={loading || !password} className="flex-1 btn-primary text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// TAB: ROLES
// ============================================
function RolesTab() {
  const [roles, setRoles] = useState([])
  const [permisos, setPermisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  useEffect(() => { loadRoles() }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/roles')
      if (res.data.success) {
        setRoles(res.data.roles)
        setPermisos(res.data.permisos_disponibles)
      }
    } catch { toast.error('Error') }
    finally { setLoading(false) }
  }

  const handleDelete = async (role) => {
    if (!confirm(`¿Eliminar el rol "${role.nombre}"?`)) return
    try {
      const res = await axios.delete(`/api/admin/roles/${role.id}`)
      if (res.data.success) { toast.success('Rol eliminado'); loadRoles() }
      else toast.error(res.data.error)
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{roles.length} roles</span>
        <button onClick={() => { setEditingRole(null); setShowForm(true) }} className="btn-primary text-sm flex items-center gap-1">
          <Plus className="h-4 w-4" /> Nuevo Rol
        </button>
      </div>

      <div className="space-y-2">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-lg border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  <span className="font-semibold">{role.nombre}</span>
                  {role.es_sistema && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">Sistema</span>}
                  <span className="text-xs text-gray-400">{role.total_usuarios} usuario(s)</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{role.descripcion}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(role.permisos || []).map(p => (
                    <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">{p}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingRole(role); setShowForm(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 className="h-4 w-4" />
                </button>
                {!role.es_sistema && (
                  <button onClick={() => handleDelete(role)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <RoleFormModal
          role={editingRole}
          permisos={permisos}
          onClose={() => { setShowForm(false); setEditingRole(null) }}
          onSave={() => { setShowForm(false); setEditingRole(null); loadRoles() }}
        />
      )}
    </div>
  )
}

// ============================================
// MODAL: CREAR/EDITAR ROL
// ============================================
function RoleFormModal({ role, permisos, onClose, onSave }) {
  const isEdit = !!role
  const [form, setForm] = useState({
    nombre: role?.nombre || '',
    descripcion: role?.descripcion || '',
    permisos: role?.permisos || [],
  })
  const [loading, setLoading] = useState(false)

  const togglePermiso = (key) => {
    setForm(prev => ({
      ...prev,
      permisos: prev.permisos.includes(key)
        ? prev.permisos.filter(p => p !== key)
        : [...prev.permisos, key]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = isEdit
        ? await axios.put(`/api/admin/roles/${role.id}`, form)
        : await axios.post('/api/admin/roles', form)
      
      if (res.data.success) {
        toast.success(isEdit ? 'Rol actualizado' : 'Rol creado')
        onSave()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  // Agrupar permisos
  const groups = {}
  permisos.forEach(p => {
    if (!groups[p.group]) groups[p.group] = []
    groups[p.group].push(p)
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-bold">{isEdit ? 'Editar Rol' : 'Nuevo Rol'}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({...form, nombre: e.target.value})}
              disabled={isEdit && role?.es_sistema}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              placeholder="ej: supervisor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm({...form, descripcion: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="ej: Supervisor de documentos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Permisos</label>
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-3">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">{group}</p>
                <div className="space-y-1">
                  {items.map(p => (
                    <label key={p.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permisos.includes(p.key)}
                        onChange={() => togglePermiso(p.key)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={loading || !form.nombre} className="flex-1 btn-primary text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? 'Guardar' : 'Crear Rol')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// TAB: LOGS DE AUDITORÍA
// ============================================
function LogsTab() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const LIMIT = 50

  useEffect(() => { loadLogs() }, [page])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/admin/logs?limit=${LIMIT}&offset=${page * LIMIT}`)
      if (res.data.success) {
        setLogs(res.data.logs)
        setTotal(res.data.total)
      }
    } catch { toast.error('Error al cargar logs') }
    finally { setLoading(false) }
  }

  const getActionColor = (accion) => {
    if (accion === 'login') return 'bg-green-100 text-green-700'
    if (accion === 'logout') return 'bg-gray-100 text-gray-700'
    if (accion.includes('fallido')) return 'bg-red-100 text-red-700'
    if (accion.includes('crear') || accion.includes('reset')) return 'bg-blue-100 text-blue-700'
    if (accion.includes('editar') || accion.includes('cambio')) return 'bg-amber-100 text-amber-700'
    if (accion.includes('desactivar') || accion.includes('eliminar')) return 'bg-red-100 text-red-700'
    if (accion.includes('desbloquear')) return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-700'
  }

  if (loading && logs.length === 0) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{total} registros totales</span>
        <button onClick={loadLogs} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Usuario</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Acción</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 hidden sm:table-cell">IP</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 hidden md:table-cell">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString('es-AR') : '-'}
                  </td>
                  <td className="px-4 py-2 font-medium">{log.username || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.accion)}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 hidden sm:table-cell">{log.ip_address || '-'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 hidden md:table-cell max-w-md truncate" title={log.detalles || '-'}>{log.detalles || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {total > LIMIT && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Página {page + 1} de {Math.ceil(total / LIMIT)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * LIMIT >= total}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// TAB: API KEYS
// ============================================
const ALL_PERMISOS = [
  { key: 'companies', label: 'Empresas' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'consumption', label: 'Consumo' },
  { key: 'invoices', label: 'Facturas' },
]

function ApiKeysTab() {
  const [keys, setKeys] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState(null) // key recién creada (texto plano)
  const [form, setForm] = useState({ usuario_id: '', nombre: '', rate_limit: 100, permisos: ALL_PERMISOS.map(p => p.key) })
  const [creating, setCreating] = useState(false)

  const loadKeys = async () => {
    setLoading(true)
    try {
      const [keysRes, usersRes] = await Promise.allSettled([
        axios.get('/api/admin/api-keys'),
        axios.get('/api/admin/usuarios'),
      ])
      if (keysRes.status === 'fulfilled' && keysRes.value.data.success) setKeys(keysRes.value.data.keys || [])
      if (usersRes.status === 'fulfilled' && usersRes.value.data.success) setUsers(usersRes.value.data.users || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadKeys() }, [])

  const handleCreate = async () => {
    if (!form.usuario_id || !form.nombre.trim()) return toast.error('Usuario y nombre son requeridos')
    setCreating(true)
    try {
      const res = await axios.post('/api/admin/api-keys', {
        usuario_id: Number(form.usuario_id),
        nombre: form.nombre.trim(),
        rate_limit: Number(form.rate_limit) || 100,
        permisos: form.permisos,
      })
      if (res.data.success) {
        setNewKey(res.data.api_key)
        toast.success('API Key creada exitosamente')
        setShowCreate(false)
        setForm({ usuario_id: '', nombre: '', rate_limit: 100, permisos: ALL_PERMISOS.map(p => p.key) })
        loadKeys()
      } else {
        toast.error(res.data.error || 'Error creando key')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creando key')
    } finally { setCreating(false) }
  }

  const handleRevoke = async (id, prefix) => {
    if (!confirm(`¿Revocar la key ${prefix}...?`)) return
    try {
      await axios.put(`/api/admin/api-keys/${id}/revoke`)
      toast.success('Key revocada')
      loadKeys()
    } catch { toast.error('Error revocando key') }
  }

  const handleDelete = async (id, prefix) => {
    if (!confirm(`¿Eliminar PERMANENTEMENTE la key ${prefix}...? Esta acción no se puede deshacer.`)) return
    try {
      await axios.delete(`/api/admin/api-keys/${id}`)
      toast.success('Key eliminada')
      loadKeys()
    } catch { toast.error('Error eliminando key') }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  const togglePermiso = (p) => {
    setForm(prev => ({
      ...prev,
      permisos: prev.permisos.includes(p)
        ? prev.permisos.filter(x => x !== p)
        : [...prev.permisos, p]
    }))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      {/* Key recién creada - mostrar solo una vez */}
      {newKey && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-green-800">API Key creada exitosamente</h4>
              <p className="text-sm text-green-700 mt-1">
                <strong>Copia esta key ahora.</strong> No podrás volver a verla.
              </p>
              <div className="mt-2 flex items-center gap-2 bg-white rounded-md border p-2">
                <code className="text-sm font-mono text-gray-800 flex-1 break-all">{newKey}</code>
                <button onClick={() => copyToClipboard(newKey)} className="p-1.5 hover:bg-gray-100 rounded">
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <button onClick={() => setNewKey(null)} className="mt-2 text-sm text-green-700 hover:text-green-900 underline">
                Entendido, cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + Botón crear */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">API Keys</h3>
            <p className="text-sm text-gray-500">Gestiona las keys de acceso a la API pública</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nueva Key
          </button>
        </div>

        {/* Formulario crear */}
        {showCreate && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Crear nueva API Key</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Usuario</label>
                <select value={form.usuario_id} onChange={e => setForm(p => ({ ...p, usuario_id: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.username}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="ej: ERP Producción" className="w-full border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate Limit (req/min)</label>
                <input type="number" value={form.rate_limit} onChange={e => setForm(p => ({ ...p, rate_limit: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Permisos</label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISOS.map(p => (
                  <button key={p.key} onClick={() => togglePermiso(p.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      form.permisos.includes(p.key) ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm flex items-center gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Generar Key
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Tabla de keys */}
        {keys.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <KeyRound className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay API keys creadas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Key</th>
                  <th className="pb-2 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Usuario</th>
                  <th className="pb-2 font-medium">Permisos</th>
                  <th className="pb-2 font-medium">Usos</th>
                  <th className="pb-2 font-medium">Último uso</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keys.map(k => (
                  <tr key={k.id} className={!k.activo ? 'opacity-50' : ''}>
                    <td className="py-2 font-mono text-xs text-gray-600">{k.key_prefix}...</td>
                    <td className="py-2 font-medium">{k.nombre}</td>
                    <td className="py-2 text-gray-600">{k.usuario}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {(k.permisos || []).map(p => (
                          <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-gray-600">{k.usos_totales?.toLocaleString() || 0}</td>
                    <td className="py-2 text-gray-500 text-xs">
                      {k.ultimo_uso ? new Date(k.ultimo_uso).toLocaleDateString('es-AR') : 'Nunca'}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        k.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {k.activo ? 'Activa' : 'Revocada'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {k.activo && (
                          <button onClick={() => handleRevoke(k.id, k.key_prefix)}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Revocar">
                            <Lock className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(k.id, k.key_prefix)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// TAB: WEBHOOKS
// ============================================
const EVENTOS_WEBHOOK = [
  { key: 'score_changed', label: 'Score Cambiado', desc: 'Cuando se calcula un nuevo scoring' },
  { key: 'alerta_nueva', label: 'Nueva Alerta', desc: 'Cuando se crea una suscripción de monitoreo' },
  { key: 'empresa_updated', label: 'Empresa Actualizada', desc: 'Cuando cambian datos de una empresa' },
]

function WebhooksTab() {
  const [hooks, setHooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newSecret, setNewSecret] = useState(null)
  const [form, setForm] = useState({ url: '', descripcion: '', eventos: ['score_changed', 'alerta_nueva'] })
  const [creating, setCreating] = useState(false)
  const [deliveries, setDeliveries] = useState(null)
  const [deliveriesId, setDeliveriesId] = useState(null)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)

  const loadHooks = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/webhooks')
      if (res.data.success) setHooks(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadHooks() }, [])

  const handleCreate = async () => {
    if (!form.url.trim()) return toast.error('URL requerida')
    if (!form.url.startsWith('https://')) return toast.error('URL debe usar HTTPS')
    if (form.eventos.length === 0) return toast.error('Selecciona al menos un evento')
    setCreating(true)
    try {
      const res = await axios.post('/api/admin/webhooks', {
        url: form.url.trim(),
        descripcion: form.descripcion.trim(),
        eventos: form.eventos,
      })
      if (res.data.success) {
        setNewSecret(res.data.data.secret)
        toast.success('Webhook creado')
        setShowCreate(false)
        setForm({ url: '', descripcion: '', eventos: ['score_changed', 'alerta_nueva'] })
        loadHooks()
      } else {
        toast.error(res.data.error || 'Error')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creando webhook')
    } finally { setCreating(false) }
  }

  const handleToggle = async (id, activo) => {
    try {
      await axios.put(`/api/admin/webhooks/${id}/toggle`, { activo: !activo })
      toast.success(activo ? 'Webhook desactivado' : 'Webhook activado')
      loadHooks()
    } catch { toast.error('Error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar webhook y su historial de envíos?')) return
    try {
      await axios.delete(`/api/admin/webhooks/${id}`)
      toast.success('Webhook eliminado')
      loadHooks()
      if (deliveriesId === id) { setDeliveries(null); setDeliveriesId(null) }
    } catch { toast.error('Error') }
  }

  const showDeliveries = async (id) => {
    if (deliveriesId === id) { setDeliveries(null); setDeliveriesId(null); return }
    setLoadingDeliveries(true)
    setDeliveriesId(id)
    try {
      const res = await axios.get(`/api/admin/webhooks/${id}/deliveries?limit=20`)
      setDeliveries(res.data.data || [])
    } catch { toast.error('Error cargando envíos') }
    finally { setLoadingDeliveries(false) }
  }

  const toggleEvento = (key) => {
    setForm(f => ({
      ...f,
      eventos: f.eventos.includes(key) ? f.eventos.filter(e => e !== key) : [...f.eventos, key]
    }))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      {/* Secret banner */}
      {newSecret && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">Signing Secret (se muestra una sola vez):</p>
              <code className="text-xs bg-green-100 px-2 py-1 rounded mt-1 block break-all">{newSecret}</code>
              <p className="text-xs text-green-600 mt-1">Usá este secret para verificar la firma HMAC-SHA256 del header <code>X-Inforysk-Signature</code></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(newSecret); toast.success('Copiado') }}
                className="p-1 hover:bg-green-200 rounded"><Copy className="h-4 w-4 text-green-700" /></button>
              <button onClick={() => setNewSecret(null)} className="p-1 hover:bg-green-200 rounded">
                <X className="h-4 w-4 text-green-700" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Webhooks ({hooks.length})</h3>
          <button onClick={() => setShowCreate(!showCreate)}
            className="btn-primary text-sm flex items-center gap-1">
            <Plus className="h-4 w-4" /> Nuevo Webhook
          </button>
        </div>

        {showCreate && (
          <div className="border rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL (HTTPS)</label>
              <input type="url" value={form.url}
                onChange={e => setForm({...form, url: e.target.value})}
                placeholder="https://api.miempresa.com/webhooks/inforysk"
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input type="text" value={form.descripcion}
                onChange={e => setForm({...form, descripcion: e.target.value})}
                placeholder="Notificaciones de scoring"
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eventos</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {EVENTOS_WEBHOOK.map(ev => (
                  <label key={ev.key} className="flex items-start gap-2 bg-white border rounded p-2 cursor-pointer hover:bg-blue-50">
                    <input type="checkbox" checked={form.eventos.includes(ev.key)}
                      onChange={() => toggleEvento(ev.key)} className="mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{ev.label}</span>
                      <p className="text-xs text-gray-500">{ev.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Webhook'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Table */}
        {hooks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No hay webhooks configurados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">URL</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Eventos</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Fallos</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hooks.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 truncate max-w-xs" title={h.url}>{h.url}</div>
                      {h.descripcion && <div className="text-xs text-gray-500">{h.descripcion}</div>}
                      <div className="text-xs text-gray-400">
                        {h.username} · {new Date(h.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(h.eventos || []).map(ev => (
                          <span key={ev} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{ev}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        h.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{h.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-medium ${h.fallos_consecutivos > 5 ? 'text-red-600' : h.fallos_consecutivos > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {h.fallos_consecutivos}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => showDeliveries(h.id)} title="Ver envíos"
                          className={`p-1 rounded hover:bg-gray-200 ${deliveriesId === h.id ? 'bg-blue-100' : ''}`}>
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                        <button onClick={() => handleToggle(h.id, h.activo)} title={h.activo ? 'Desactivar' : 'Activar'}
                          className="p-1 rounded hover:bg-gray-200">
                          {h.activo ? <Lock className="h-4 w-4 text-yellow-600" /> : <Unlock className="h-4 w-4 text-green-600" />}
                        </button>
                        <button onClick={() => handleDelete(h.id)} title="Eliminar"
                          className="p-1 rounded hover:bg-red-100">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deliveries panel */}
      {deliveriesId && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Últimos envíos — Webhook #{deliveriesId}</h3>
            <button onClick={() => { setDeliveries(null); setDeliveriesId(null) }}
              className="p-1 hover:bg-gray-200 rounded"><X className="h-4 w-4" /></button>
          </div>
          {loadingDeliveries ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : !deliveries || deliveries.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Sin envíos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Evento</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Duración</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Error</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveries.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{d.evento}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          d.status_code && d.status_code >= 200 && d.status_code < 300
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>{d.status_code || 'ERR'}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-500">{d.duration_ms}ms</td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-xs truncate">{d.error || '—'}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// TAB: APROBACIONES DE USUARIOS
// ============================================
function AprobacionesTab({ onAprobacionChange }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { loadPendientes() }, [])

  const loadPendientes = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/usuarios-pendientes')
      if (res.data.success) setUsuarios(res.data.usuarios)
    } catch (err) {
      toast.error('Error al cargar usuarios pendientes')
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = async (userId) => {
    setProcessing(userId)
    try {
      const res = await axios.post('/api/admin/aprobar-usuario-final', { usuario_id: userId })
      if (res.data.success) {
        toast.success(res.data.message)
        loadPendientes()
        onAprobacionChange?.() // Actualizar contador en el padre
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aprobar')
    } finally {
      setProcessing(null)
    }
  }

  const handleRechazar = async (userId) => {
    const motivo = prompt('Motivo del rechazo:')
    if (!motivo) return
    
    setProcessing(userId)
    try {
      const res = await axios.post('/api/admin/rechazar-usuario-final', { usuario_id: userId, motivo })
      if (res.data.success) {
        toast.success('Usuario rechazado')
        loadPendientes()
        onAprobacionChange?.() // Actualizar contador en el padre
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally {
      setProcessing(null)
    }
  }

  const getEstadoBadge = (estado) => {
    const styles = {
      pendiente_empresa: 'bg-yellow-100 text-yellow-800',
      pendiente_admin: 'bg-blue-100 text-blue-800',
      rechazado_empresa: 'bg-red-100 text-red-800',
      rechazado_admin: 'bg-red-100 text-red-800',
    }
    const labels = {
      pendiente_empresa: 'Pendiente Empresa',
      pendiente_admin: 'Pendiente Admin',
      rechazado_empresa: 'Rechazado Empresa',
      rechazado_admin: 'Rechazado Admin',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100'}`}>
        {labels[estado] || estado}
      </span>
    )
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-500">{usuarios.length} usuarios pendientes</span>
          <p className="text-xs text-gray-400">Usuarios que requieren aprobación final</p>
        </div>
        <button onClick={loadPendientes} className="btn-secondary text-sm flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-medium">No hay usuarios pendientes de aprobación</p>
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map(u => (
            <div key={u.id} className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{u.nombre_completo}</span>
                    {getEstadoBadge(u.estado_aprobacion)}
                  </div>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  {u.empresa_nombre && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3" /> {u.empresa_nombre}
                    </p>
                  )}
                  {u.cargo && <p className="text-xs text-gray-400">Cargo: {u.cargo}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Registrado: {new Date(u.fecha_registro).toLocaleString('es-AR')}
                  </p>
                  {u.aprobado_empresa_por_nombre && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Aprobado por empresa: {u.aprobado_empresa_por_nombre} ({new Date(u.fecha_aprobacion_empresa).toLocaleDateString()})
                    </p>
                  )}
                  {u.motivo_rechazo && (
                    <p className="text-xs text-red-600 mt-1">Motivo: {u.motivo_rechazo}</p>
                  )}
                </div>

                {u.estado_aprobacion === 'pendiente_admin' && (
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminPanel
