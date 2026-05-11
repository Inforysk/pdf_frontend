import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import ConsumoView from './ConsumoView'
import PedidosView from './PedidosView'
import MonitoreoView from './MonitoreoView'
import FacturacionView from './FacturacionView'
import EquipoView from './EquipoView'
import AlertasView from './AlertasView'
import InformesView from './InformesView'
import CuponesView from './CuponesView'
import PerfilModal from './PerfilModal'
import WelcomeModal from './WelcomeModal'
import ApiDashboard from '../ApiDashboard'
import SearchView from '../SearchView'
import DataEditor from '../DataEditor'
import HistorialView from '../HistorialView'
import ClienteProductosView from '../admin/ClienteProductosView'
import LanguageSelector from '../LanguageSelector'
import logo from '../../assets/logo_symbol.png'
import {
  BarChart3, TrendingUp, ShoppingCart, FileText, Search,
  Code, LogOut, User, ChevronLeft, Menu, Bell, ArrowLeft, Star, Users, Building2,
  Settings, Lock, ChevronDown, Package, Gift, AlertTriangle
} from 'lucide-react'

// Mapeo de banderas por código de país (usando flagcdn.com para imágenes)
const getCountryFlag = (countryCode) => {
  if (!countryCode) return null
  const code = countryCode.toLowerCase()
  return `https://flagcdn.com/24x18/${code}.png`
}

// Items de sidebar para cliente_admin (usaremos claves de traducción)
const SIDEBAR_KEYS_ADMIN = [
  { id: 'consumo', labelKey: 'nav.consumption', icon: BarChart3 },
  { id: 'buscar', labelKey: 'nav.search', icon: Search },
  { id: 'pedidos', labelKey: 'nav.orders', icon: ShoppingCart },
  { id: 'informes', labelKey: 'portal.packStore', icon: Package },
  { id: 'cupones', labelKey: 'portal.myCoupons', icon: Gift },
  { id: 'productos', labelKey: 'nav.myModules', icon: Settings },
  { id: 'monitoreo', labelKey: 'nav.monitoring', icon: Star },
  { id: 'alertas', labelKey: 'nav.alerts', icon: Bell },
  { id: 'facturacion', labelKey: 'nav.billing', icon: FileText },
  { id: 'api', labelKey: 'portal.api', icon: Code },
  { id: 'equipo', labelKey: 'portal.myTeam', icon: Users },
]

// Items de sidebar para cliente_usuario (sin facturación, equipo, ni cupones)
// API se filtra dinámicamente según api_habilitada
const SIDEBAR_KEYS_USUARIO_BASE = [
  { id: 'consumo', labelKey: 'nav.consumption', icon: BarChart3 },
  { id: 'buscar', labelKey: 'nav.search', icon: Search },
  { id: 'pedidos', labelKey: 'nav.orders', icon: ShoppingCart },
  { id: 'monitoreo', labelKey: 'nav.monitoring', icon: Star },
]

// Sidebar simplificado para rol cliente_presentacion (demos)
const SIDEBAR_KEYS_PRESENTACION = [
  { id: 'buscar', labelKey: 'nav.search', icon: Search },
  { id: 'pedidos', labelKey: 'nav.orders', icon: ShoppingCart },
  { id: 'monitoreo', labelKey: 'nav.monitoring', icon: Star },
]

export default function ClientPortal() {
  const { t } = useTranslation()
  const { user, logout, refreshUser } = useAuth()
  const isClienteAdmin = user?.rol === 'cliente_admin'
  const isPresentacion = user?.rol === 'cliente_presentacion'
  
  // Para cliente_usuario, solo mostrar API si tiene api_habilitada
  const getSidebarItems = () => {
    let keys
    // Rol cliente_presentacion: sidebar simplificado para demos
    if (isPresentacion) {
      keys = SIDEBAR_KEYS_PRESENTACION
    } else if (isClienteAdmin) {
      keys = SIDEBAR_KEYS_ADMIN
    } else {
      // cliente_usuario: mostrar API solo si está habilitada
      keys = user?.api_habilitada 
        ? [...SIDEBAR_KEYS_USUARIO_BASE, { id: 'api', labelKey: 'portal.api', icon: Code }]
        : SIDEBAR_KEYS_USUARIO_BASE
    }
    // Convertir labelKey a label usando traducción
    return keys.map(item => ({ ...item, label: t(item.labelKey) }))
  }
  
  const SIDEBAR_ITEMS = getSidebarItems()
  const [activeView, setActiveView] = useState(isPresentacion ? 'buscar' : 'consumo')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [planInfo, setPlanInfo] = useState(null)
  // Estado para ver empresa
  const [viewEmpresaId, setViewEmpresaId] = useState(null)
  const [viewEmpresaCuit, setViewEmpresaCuit] = useState(null)
  const [subView, setSubView] = useState(null) // 'view-empresa', 'historial'
  const [refreshKey, setRefreshKey] = useState(0)
  const [alertasCount, setAlertasCount] = useState(0)
  const [pendientesEquipoCount, setPendientesEquipoCount] = useState(0)
  const [cuponesExpiringCount, setCuponesExpiringCount] = useState(0)
  const [monitoreoAlertasCount, setMonitoreoAlertasCount] = useState(0)  // Alertas de monitoreo no leídas
  const [monitoreoAlertasRecientes, setMonitoreoAlertasRecientes] = useState([])  // Últimas alertas para dropdown
  const [showAlertasDropdown, setShowAlertasDropdown] = useState(false)  // Dropdown de alertas
  const [paymentStatus, setPaymentStatus] = useState(null)  // Estado de pago
  const [showWelcome, setShowWelcome] = useState(false)  // Modal de bienvenida
  
  // Estados para perfil
  const [showPerfilDropdown, setShowPerfilDropdown] = useState(false)
  const [showPerfilModal, setShowPerfilModal] = useState(false)
  const [perfilInitialTab, setPerfilInitialTab] = useState('perfil')
  const perfilDropdownRef = useRef(null)
  const perfilDropdownDesktopRef = useRef(null)
  const alertasDropdownRef = useRef(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedOutsideMobile = !perfilDropdownRef.current || !perfilDropdownRef.current.contains(e.target)
      const clickedOutsideDesktop = !perfilDropdownDesktopRef.current || !perfilDropdownDesktopRef.current.contains(e.target)
      const clickedOutsideAlertas = !alertasDropdownRef.current || !alertasDropdownRef.current.contains(e.target)
      if (clickedOutsideMobile && clickedOutsideDesktop) {
        setShowPerfilDropdown(false)
      }
      if (clickedOutsideAlertas) {
        setShowAlertasDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-refresh del usuario cada 30 segundos para detectar cambios en api_habilitada
  useEffect(() => {
    if (!isClienteAdmin && user) {
      const interval = setInterval(() => {
        refreshUser()
      }, 30000) // 30 segundos
      return () => clearInterval(interval)
    }
  }, [isClienteAdmin, user, refreshUser])

  // Mostrar modal de bienvenida si es la primera vez del usuario
  useEffect(() => {
    if (user?.mostrar_bienvenida) {
      setShowWelcome(true)
    }
  }, [user?.mostrar_bienvenida])

  // Escuchar cambios de hash para navegación interna
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').split('?')[0]
      const validViews = SIDEBAR_ITEMS.map(item => item.id)
      if (hash && validViews.includes(hash)) {
        setActiveView(hash)
        setSubView(null)
        setViewEmpresaId(null)
        setViewEmpresaCuit(null)
      }
    }
    
    // Verificar hash al montar
    handleHashChange()
    
    // Escuchar cambios de hash
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [SIDEBAR_ITEMS])

  useEffect(() => {
    axios.get('/api/portal/plan')
      .then(r => { if (r.data.success) setPlanInfo(r.data.plan) })
      .catch(() => {})
    // Cargar conteo de alertas no leídas
    axios.get('/api/portal/alertas/no-leidas-count')
      .then(r => { if (r.data.success) setAlertasCount(r.data.count) })
      .catch(() => {})
    // Cargar conteo de cupones por vencer (solo cliente_admin)
    if (user?.rol === 'cliente_admin') {
      axios.get('/api/portal/coupons/expiring-count')
        .then(r => { if (r.data.success) setCuponesExpiringCount(r.data.count) })
        .catch(() => {})
    }
    // Cargar estado de pago
    axios.get('/api/portal/payment-status')
      .then(r => { if (r.data.success) setPaymentStatus(r.data.payment_status) })
      .catch(() => {})
    // Cargar conteo de alertas de monitoreo no leídas
    axios.get('/api/portal/monitoreo/alertas-count')
      .then(r => { if (r.data.success) setMonitoreoAlertasCount(r.data.count) })
      .catch(() => {})
    // Cargar alertas de monitoreo recientes para el dropdown
    axios.get('/api/portal/monitoreo/alertas-recientes')
      .then(r => { if (r.data.success) setMonitoreoAlertasRecientes(r.data.alertas || []) })
      .catch(() => {})
    // Si es cliente_admin, cargar pendientes de equipo
    if (user?.rol === 'cliente_admin') {
      axios.get('/api/cliente-admin/pendientes-count')
        .then(r => { if (r.data.success) setPendientesEquipoCount(r.data.count) })
        .catch(() => {})
    }
  }, [user])

  // Refrescar alertas y cupones cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('/api/portal/alertas/no-leidas-count')
        .then(r => { if (r.data.success) setAlertasCount(r.data.count) })
        .catch(() => {})
      axios.get('/api/portal/coupons/expiring-count')
        .then(r => { if (r.data.success) setCuponesExpiringCount(r.data.count) })
        .catch(() => {})
      // Refrescar alertas de monitoreo
      axios.get('/api/portal/monitoreo/alertas-count')
        .then(r => { if (r.data.success) setMonitoreoAlertasCount(r.data.count) })
        .catch(() => {})
      // Si es cliente_admin, refrescar pendientes
      if (user?.rol === 'cliente_admin') {
        axios.get('/api/cliente-admin/pendientes-count')
          .then(r => { if (r.data.success) setPendientesEquipoCount(r.data.count) })
          .catch(() => {})
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [user])

  // Escuchar evento cuando se marcan alertas de monitoreo como leídas
  useEffect(() => {
    const handleAlertasLeidas = () => {
      axios.get('/api/portal/monitoreo/alertas-count')
        .then(r => { if (r.data.success) setMonitoreoAlertasCount(r.data.count) })
        .catch(() => {})
      axios.get('/api/portal/monitoreo/alertas-recientes')
        .then(r => { if (r.data.success) setMonitoreoAlertasRecientes(r.data.alertas || []) })
        .catch(() => {})
    }
    window.addEventListener('monitoreo-alertas-leidas', handleAlertasLeidas)
    return () => window.removeEventListener('monitoreo-alertas-leidas', handleAlertasLeidas)
  }, [])

  const planBadge = planInfo?.plan_nombre || 'Sin plan'
  const planColor = {
    'Starter': 'bg-gray-100 text-gray-700',
    'Pro': 'bg-inforysk-navy-100 text-inforysk-navy-900',
    'Enterprise': 'bg-inforysk-red-100 text-inforysk-red-700',
  }[planBadge] || 'bg-gray-100 text-gray-500'

  const handleSelectEmpresa = (empresaId, mode, cuit = null) => {
    setViewEmpresaId(empresaId)
    setViewEmpresaCuit(cuit)
    if (mode === 'historial') {
      setSubView('historial')
    } else {
      setSubView('view-empresa')
    }
  }

  const handleBackFromView = () => {
    setViewEmpresaId(null)
    setViewEmpresaCuit(null)
    setSubView(null)
  }

  const renderView = () => {
    // Sub-vistas (ver empresa, historial)
    if (subView === 'view-empresa' && viewEmpresaId) {
      return (
        <DataEditor
          empresaId={viewEmpresaId}
          mode="view"
          onSave={handleBackFromView}
          onBack={handleBackFromView}
        />
      )
    }
    if (subView === 'historial' && (viewEmpresaId || viewEmpresaCuit)) {
      return (
        <HistorialView
          empresaId={viewEmpresaId}
          cuit={viewEmpresaCuit}
          onBack={handleBackFromView}
          onViewVersion={(versionId) => {
            setViewEmpresaId(versionId)
            setSubView('view-empresa')
          }}
        />
      )
    }

    switch (activeView) {
      case 'consumo': return <ConsumoView isAdmin={isClienteAdmin} />
      case 'buscar': return <SearchView onSelectEmpresa={handleSelectEmpresa} refreshKey={refreshKey} />
      case 'pedidos': return <PedidosView onViewEmpresa={handleSelectEmpresa} isAdmin={isClienteAdmin} />
      case 'informes': return <InformesView isAdmin={isClienteAdmin} />
      case 'cupones': return <CuponesView />
      case 'productos': return <ClienteProductosView />
      case 'monitoreo': return <MonitoreoView isAdmin={isClienteAdmin} />
      case 'alertas': return <AlertasView isAdmin={isClienteAdmin} />
      case 'facturacion': return isClienteAdmin ? <FacturacionView /> : <ConsumoView isAdmin={false} />
      case 'api': return <ApiDashboard isAdmin={isClienteAdmin} />
      case 'equipo': return isClienteAdmin ? <EquipoView /> : <ConsumoView isAdmin={false} />
      default: return <ConsumoView isAdmin={isClienteAdmin} />
    }
  }

  const currentLabel = subView === 'view-empresa' ? 'Ver empresa'
    : subView === 'historial' ? 'Historial'
    : SIDEBAR_ITEMS.find(i => i.id === activeView)?.label || 'Portal'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 fixed h-full z-30`}>
        {/* Logo */}
        <div className={`h-20 flex items-center border-b border-gray-100 ${sidebarOpen ? 'justify-between px-4' : 'flex-col justify-center py-2'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={logo} alt="Inforysk" className="h-[68px] w-auto" />
            </div>
          ) : (
            <div className="cursor-pointer hover:opacity-80 transition-opacity">
              <img src={logo} alt="Inforysk" className="h-[68px] w-[68px] object-contain" />
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 ${!sidebarOpen ? 'mt-1' : ''}`}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Plan badge */}
        {sidebarOpen && (
          <div className="px-4 py-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${planColor}`}>
              {planBadge}
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeView === item.id && !subView
            const showEquipoBadge = item.id === 'equipo' && pendientesEquipoCount > 0
            const showAlertasBadge = item.id === 'alertas' && alertasCount > 0
            const showCuponesBadge = item.id === 'cupones' && cuponesExpiringCount > 0
            const showMonitoreoBadge = item.id === 'monitoreo' && monitoreoAlertasCount > 0
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setSubView(null); setViewEmpresaId(null); setViewEmpresaCuit(null) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? 'bg-inforysk-navy-50 text-inforysk-navy-900 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-inforysk-red-600' : 'text-gray-400'}`} />
                {sidebarOpen && <span>{item.label}</span>}
                {showEquipoBadge && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendientesEquipoCount > 9 ? '9+' : pendientesEquipoCount}
                  </span>
                )}
                {showAlertasBadge && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {alertasCount > 9 ? '9+' : alertasCount}
                  </span>
                )}
                {showCuponesBadge && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center" title={`${cuponesExpiringCount} cupón(es) por vencer`}>
                    <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                  </span>
                )}
                {showMonitoreoBadge && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-inforysk-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {monitoreoAlertasCount > 9 ? '9+' : monitoreoAlertasCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <button
                onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true) }}
                className="w-8 h-8 bg-inforysk-navy-100 rounded-full flex items-center justify-center relative hover:ring-2 hover:ring-inforysk-navy-300 transition"
                title="Ver perfil"
              >
                <User className="h-4 w-4 text-inforysk-navy-900" />
                {user?.pais && (
                  <img 
                    src={getCountryFlag(user.pais)} 
                    alt={user.pais}
                    className="absolute -bottom-1 -right-1 w-4 h-3 rounded-sm shadow-sm"
                  />
                )}
              </button>
              <button
                onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true) }}
                className="flex-1 min-w-0 text-left hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre_completo || user?.username}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || user?.username}</p>
              </button>
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title={t('portal.logout')}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true) }}
                className="w-10 h-10 bg-inforysk-navy-100 rounded-full flex items-center justify-center hover:ring-2 hover:ring-inforysk-navy-300 transition"
                title={t('portal.viewProfile')}
              >
                <User className="h-5 w-5 text-inforysk-navy-900" />
              </button>
              <button onClick={logout} className="w-full flex justify-center p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title={t('portal.logout')}>
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl z-50 flex flex-col">
            <div className="h-20 flex items-center justify-between px-4 border-b">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Inforysk" className="h-[68px] w-auto" />
              </div>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-4 py-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${planColor}`}>
                {planBadge}
              </span>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-1">
              {SIDEBAR_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = activeView === item.id
                const showEquipoBadge = item.id === 'equipo' && pendientesEquipoCount > 0
                const showAlertasBadge = item.id === 'alertas' && alertasCount > 0
                const showCuponesBadge = item.id === 'cupones' && cuponesExpiringCount > 0
                const showMonitoreoBadge = item.id === 'monitoreo' && monitoreoAlertasCount > 0
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setSubView(null); setViewEmpresaId(null); setViewEmpresaCuit(null); setMobileSidebarOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                      isActive
                        ? 'bg-inforysk-navy-50 text-inforysk-navy-900'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-inforysk-red-600' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                    {showEquipoBadge && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {pendientesEquipoCount > 9 ? '9+' : pendientesEquipoCount}
                      </span>
                    )}
                    {showAlertasBadge && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {alertasCount > 9 ? '9+' : alertasCount}
                      </span>
                    )}
                    {showCuponesBadge && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center" title={`${cuponesExpiringCount} cupón(es) por vencer`}>
                        <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                      </span>
                    )}
                    {showMonitoreoBadge && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-inforysk-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {monitoreoAlertasCount > 9 ? '9+' : monitoreoAlertasCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
            {/* Info empresa en móvil */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                {user?.pais && (
                  <img 
                    src={getCountryFlag(user.pais)} 
                    alt={user.pais}
                    className="w-5 h-3.5 rounded shadow-sm"
                  />
                )}
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-800 truncate flex-1">{user?.empresa_nombre || t('portal.myCompany')}</span>
              </div>
              {user?.empresa_cuit && (
                <span className="text-xs text-gray-500 font-mono pl-7">{user.empresa_tipo_id || 'CUIT'}: {user.empresa_cuit}</span>
              )}
            </div>
            {/* Usuario y logout */}
            <div className="border-t p-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <button
                  onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true); setMobileSidebarOpen(false) }}
                  className="w-10 h-10 bg-inforysk-navy-100 rounded-full flex items-center justify-center relative hover:ring-2 hover:ring-inforysk-navy-300 transition shrink-0"
                  title="Ver perfil"
                >
                  <User className="h-5 w-5 text-inforysk-navy-900" />
                </button>
                <button
                  onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true); setMobileSidebarOpen(false) }}
                  className="flex-1 min-w-0 text-left hover:bg-gray-50 rounded-lg py-1 transition"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre_completo || user?.username}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || user?.username}</p>
                </button>
                <button 
                  onClick={() => { logout(); setMobileSidebarOpen(false) }} 
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0"
                  title={t('portal.logout')}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300`}>
        {/* Top header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            {subView && (
              <button onClick={handleBackFromView} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentLabel}
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">{user?.nombre_completo || user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector de idioma */}
            <LanguageSelector compact />
            
            {/* Campana de alertas con dropdown */}
            <div className="relative" ref={alertasDropdownRef}>
              <button 
                onClick={() => setShowAlertasDropdown(!showAlertasDropdown)} 
                className="p-2 rounded-lg hover:bg-gray-100 relative"
              >
                <Bell className="h-5 w-5 text-gray-500" />
                {(alertasCount + monitoreoAlertasCount) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {(alertasCount + monitoreoAlertasCount) > 9 ? '9+' : (alertasCount + monitoreoAlertasCount)}
                  </span>
                )}
              </button>
              
              {/* Dropdown de alertas */}
              {showAlertasDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
                  </div>
                  
                  {/* Alertas de monitoreo */}
                  {monitoreoAlertasRecientes.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {monitoreoAlertasRecientes.map(a => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setActiveView('monitoreo')
                            setSubView(null)
                            setShowAlertasDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              a.severidad === 'critical' ? 'bg-red-500' : 
                              a.severidad === 'warning' ? 'bg-amber-500' : 'bg-inforysk-navy-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{a.titulo}</p>
                              <p className="text-xs text-gray-500 truncate">{a.razon_social || a.cuit}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(a.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Sin alertas nuevas</p>
                    </div>
                  )}
                  
                  {/* Botones de acción */}
                  <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                    <button
                      onClick={() => {
                        setActiveView('monitoreo')
                        setSubView(null)
                        setShowAlertasDropdown(false)
                      }}
                      className="flex-1 text-center py-2 text-xs font-semibold text-inforysk-navy-900 hover:bg-inforysk-navy-50 rounded-lg"
                    >
                      Ver Monitoreo
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('alertas')
                        setSubView(null)
                        setShowAlertasDropdown(false)
                      }}
                      className="flex-1 text-center py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Todas las alertas
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Versión MÓVIL: Avatar compacto con dropdown */}
            <div className="sm:hidden relative" ref={perfilDropdownRef}>
              <button
                onClick={() => setShowPerfilDropdown(!showPerfilDropdown)}
                className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {user?.pais && (
                  <img 
                    src={getCountryFlag(user.pais)} 
                    alt={user.pais}
                    className="w-5 h-3.5 rounded shadow-sm"
                  />
                )}
                <div className="w-8 h-8 bg-inforysk-navy-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-inforysk-navy-900" />
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showPerfilDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu Móvil */}
              {showPerfilDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  {/* Info empresa en móvil */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      {user?.pais && (
                        <img 
                          src={getCountryFlag(user.pais)} 
                          alt={user.pais}
                          className="w-6 h-4 rounded shadow-sm"
                        />
                      )}
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800 truncate">{user?.empresa_nombre || t('portal.myCompany')}</span>
                    </div>
                    {user?.empresa_cuit && (
                      <span className="text-xs text-gray-500 font-mono">{user.empresa_tipo_id || 'CUIT'}: {user.empresa_cuit}</span>
                    )}
                  </div>
                  {/* Info usuario */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.nombre_completo}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]" title={user?.email}>{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true); setShowPerfilDropdown(false) }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    {t('portal.myProfile')}
                  </button>
                  <button
                    onClick={() => { setPerfilInitialTab('seguridad'); setShowPerfilModal(true); setShowPerfilDropdown(false) }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Lock className="h-4 w-4 text-gray-400" />
                    {t('portal.changePassword')}
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('portal.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Versión DESKTOP: Info completa de empresa y usuario */}
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
              {/* Bandera del país */}
              {user?.pais && (
                <img 
                  src={getCountryFlag(user.pais)} 
                  alt={user.pais}
                  title={user.pais}
                  className="w-6 h-4 rounded shadow-sm"
                />
              )}
              {/* Info de empresa */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">{user?.empresa_nombre || t('portal.myCompany')}</span>
                </div>
                {user?.empresa_cuit && (
                  <span className="text-xs text-gray-500 font-mono">{user.empresa_tipo_id || 'CUIT'}: {user.empresa_cuit}</span>
                )}
              </div>
              {/* Avatar usuario con dropdown */}
              <div className="relative" ref={perfilDropdownDesktopRef}>
                <button
                  onClick={() => setShowPerfilDropdown(!showPerfilDropdown)}
                  className="flex items-center gap-2 pl-3 border-l border-gray-100 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition"
                >
                  <div className="w-8 h-8 bg-inforysk-navy-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-inforysk-navy-900" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.nombre_completo || user?.username}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showPerfilDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu Desktop */}
                {showPerfilDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.nombre_completo}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setPerfilInitialTab('perfil'); setShowPerfilModal(true); setShowPerfilDropdown(false) }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      {t('portal.myProfile')}
                    </button>
                    <button
                      onClick={() => { setPerfilInitialTab('seguridad'); setShowPerfilModal(true); setShowPerfilDropdown(false) }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <Lock className="h-4 w-4 text-gray-400" />
                      {t('portal.changePassword')}
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={logout}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('portal.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {/* Banner de estado de pago */}
          {paymentStatus && paymentStatus.estado === 'suspendido' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Cuenta Suspendida</h3>
                <p className="text-sm text-red-600">
                  Tu cuenta ha sido suspendida por problemas de pago. Contacta a soporte para regularizar tu situación.
                </p>
              </div>
              <button
                onClick={() => { setActiveView('facturacion'); setSubView(null) }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Ver Facturación
              </button>
            </div>
          )}
          {paymentStatus && paymentStatus.estado === 'en_riesgo' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Pago Pendiente</h3>
                <p className="text-sm text-amber-600">
                  Tienes pagos pendientes. Por favor, regulariza tu situación para evitar la suspensión de tu cuenta.
                  {paymentStatus.monto_pendiente > 0 && (
                    <span className="font-medium"> Monto: {paymentStatus.currency_code} {paymentStatus.monto_pendiente}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => { setActiveView('facturacion'); setSubView(null) }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                Ver Facturación
              </button>
            </div>
          )}
          {renderView()}
        </main>
      </div>

      {/* Modal de Perfil */}
      <PerfilModal
        isOpen={showPerfilModal}
        onClose={() => setShowPerfilModal(false)}
        user={user}
        initialTab={perfilInitialTab}
        onUpdate={(updatedUser) => {
          // Refrescar datos del usuario si es necesario
          if (refreshUser) refreshUser()
        }}
      />

      {/* Modal de Bienvenida (primera vez) */}
      {showWelcome && (
        <WelcomeModal
          user={user}
          onClose={() => {
            setShowWelcome(false)
            // Refrescar usuario para actualizar el flag
            if (refreshUser) refreshUser()
          }}
        />
      )}
    </div>
  )
}

function ComingSoon({ title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md">{desc}</p>
      <span className="mt-4 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">Próximamente</span>
    </div>
  )
}
