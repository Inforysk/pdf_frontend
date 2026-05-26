import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import PDFUploader from './components/PDFUploader'
import DataEditor from './components/DataEditor'
import EmpresasList from './components/EmpresasList'
import BulkUploader from './components/BulkUploader'
import SearchView from './components/SearchView'
import HistorialView from './components/HistorialView'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ChangePasswordModal from './components/ChangePasswordModal'
import AdminPanel from './components/AdminPanel'
import ClienteAdminPanel from './components/ClienteAdminPanel'
import CreditosView from './components/CreditosView'
import PlanesView from './components/PlanesView'
import ScoringView from './components/ScoringView'
import ScoringDashboard from './components/ScoringDashboard'
import ScoreCompare from './components/ScoreCompare'
import ComparadorEmpresas from './components/ComparadorEmpresas'
import SolicitudesView from './components/SolicitudesView'
import PedidosSolicitudesView from './components/PedidosSolicitudesView'
import AdminDashboard from './components/AdminDashboard'
import AdminNotifications from './components/AdminNotifications'
import ClientPortal from './components/portal/ClientPortal'
import BoletinOficialView from './components/BoletinOficialView'
import AdminCouponsView from './components/admin/AdminCouponsView'
import AdminDunningView from './components/admin/AdminDunningView'
import AdminFacturacionView from './components/admin/AdminFacturacionView'
import AdminRevenueView from './components/admin/AdminRevenueView'
import AdminPaymentsView from './components/admin/AdminPaymentsView'
import AdminPreciosPaisView from './components/admin/AdminPreciosPaisView'
import AdminProveedoresView from './components/admin/AdminProveedoresView'
import AdminProductosView from './components/admin/AdminProductosView'
import AdminFacturacionSolicitudesView from './components/admin/AdminFacturacionSolicitudesView'
import ClienteProductosView from './components/admin/ClienteProductosView'
import UsuariosPedidosView from './components/UsuariosPedidosView'
import logo from './assets/logo_symbol.png'
import axios from 'axios'
import { useAuth } from './contexts/AuthContext'
import { FileText, List, Upload, Files, CheckCircle2, AlertTriangle, XCircle, Search, History, Menu, X, Shield, LogOut, User, Loader2, BarChart3, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, Calculator, GitCompare, FilePlus2, ClipboardList, TrendingUp, ArrowLeft, Globe, CreditCard, Package, Bell, Newspaper, UserCheck, Ticket, Webhook, Users2, Users, Building2, ScrollText, KeyRound } from 'lucide-react'

function App() {
  const { t } = useTranslation()
  const { user, loading: authLoading, mustChangePassword, login, logout, onPasswordChanged, hasPermission, isAdmin } = useAuth()
  const isClienteAdmin = user?.rol === 'cliente_admin'
  const canAccessScoring = isAdmin && hasPermission('scoring')
  const canAccessDashboard = hasPermission('inicio')
  const [currentView, setCurrentView] = useState(canAccessDashboard ? 'dashboard' : 'search') // dashboard, search, upload, bulk, edit, view, list, historial, admin, scoring, scoring-dashboard, scoring-compare
  const [previousView, setPreviousView] = useState(null) // Para rastrear de dónde viene
  const [originView, setOriginView] = useState(null) // Para navegación profunda (list -> historial -> ver versión)
  const [extractedData, setExtractedData] = useState(null)
  const [filename, setFilename] = useState('')
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(null)
  const [selectedEmpresaCuit, setSelectedEmpresaCuit] = useState(null)
  const [selectedEmpresaMode, setSelectedEmpresaMode] = useState(null) // 'view' o 'edit'
  const [listDetailEmpresaId, setListDetailEmpresaId] = useState(null) // Para reabrir modal al volver a list
  // Estado para preservar resultados de carga masiva
  const [bulkResults, setBulkResults] = useState({ success: [], warnings: [], failed: [] })
  const [hasBulkResults, setHasBulkResults] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openSubmenu, setOpenSubmenu] = useState(null) // Para submenús desplegables
  const [newReportCountry, setNewReportCountry] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [solicitudActiva, setSolicitudActiva] = useState(null) // Solicitud desde la que se inicia un informe
  const [alertasCount, setAlertasCount] = useState(0) // Contador de alertas no leídas
  const [aprobacionesCount, setAprobacionesCount] = useState(0) // Contador de aprobaciones pendientes (admin)
  const [aprobacionesEmpresaCount, setAprobacionesEmpresaCount] = useState(0) // Contador para cliente_admin
  const [showRegister, setShowRegister] = useState(false) // Mostrar página de registro
  const prevUserRef = useRef(user?.id)

  // Fetch contador de alertas para admin
  useEffect(() => {
    if (!user || user.rol !== 'admin') {
      setAlertasCount(0)
      return
    }
    const fetchAlertasCount = async () => {
      try {
        const res = await axios.get('/api/admin/notifications/count')
        if (res.data.success) {
          setAlertasCount(res.data.total || 0)
        }
      } catch (err) {
        console.error('Error fetching alertas count:', err)
      }
    }
    fetchAlertasCount()
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchAlertasCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Fetch contador de aprobaciones pendientes para admin
  useEffect(() => {
    if (!user || user.rol !== 'admin') {
      setAprobacionesCount(0)
      return
    }
    const fetchAprobaciones = async () => {
      try {
        const res = await axios.get('/api/admin/aprobaciones-count')
        if (res.data.success) {
          setAprobacionesCount(res.data.count || 0)
        }
      } catch (err) {
        console.error('Error fetching aprobaciones count:', err)
      }
    }
    fetchAprobaciones()
    const interval = setInterval(fetchAprobaciones, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Fetch contador de aprobaciones pendientes para cliente_admin
  useEffect(() => {
    if (!user || user.rol !== 'cliente_admin') {
      setAprobacionesEmpresaCount(0)
      return
    }
    const fetchAprobacionesEmpresa = async () => {
      try {
        const res = await axios.get('/api/cliente-admin/pendientes-count')
        if (res.data.success) {
          setAprobacionesEmpresaCount(res.data.count || 0)
        }
      } catch (err) {
        console.error('Error fetching aprobaciones empresa count:', err)
      }
    }
    fetchAprobacionesEmpresa()
    const interval = setInterval(fetchAprobacionesEmpresa, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Resetear estado al cambiar de usuario o cerrar sesión
  useEffect(() => {
    if (prevUserRef.current !== user?.id) {
      const userHasDashboard = user?.permisos?.includes('inicio') || user?.rol === 'admin'
      // Analista inicia en solicitudes (nueva tabla pedidos-solicitudes)
      const initialView = user?.rol === 'analista' ? 'pedidos-solicitudes' : (userHasDashboard ? 'dashboard' : 'search')
      setCurrentView(initialView)
      setPreviousView(null)
      setOriginView(null)
      setExtractedData(null)
      setFilename('')
      setSelectedEmpresaId(null)
      setSelectedEmpresaCuit(null)
      setSelectedEmpresaMode(null)
      setListDetailEmpresaId(null)
      setBulkResults({ success: [], warnings: [], failed: [] })
      setHasBulkResults(false)
      setMobileMenuOpen(false)
      setNewReportCountry(null)
      setSolicitudActiva(null)
      prevUserRef.current = user?.id
    }
  }, [user])

  const [sinopsisInfo, setSinopsisInfo] = useState(null)

  const handleDataExtracted = (data, name, sinopsisInfoData) => {
    setExtractedData(data)
    setFilename(name)
    setSinopsisInfo(sinopsisInfoData || null)
    setPreviousView(currentView)
    setCurrentView('edit')
  }

  const handleSaveComplete = () => {
    setExtractedData(null)
    setFilename('')
    setSinopsisInfo(null)
    setNewReportCountry(null)
    setRefreshKey(k => k + 1)
    setCurrentView('search')
    setPreviousView(null)
  }

  const handleBack = () => {
    setExtractedData(null)
    setFilename('')
    setSinopsisInfo(null)
    setNewReportCountry(null)
    setRefreshKey(k => k + 1)
    setCurrentView('search')
    setPreviousView(null)
  }

  const handleNewReportCreated = (empresaId, cuit, countryConfig) => {
    setSelectedEmpresaId(empresaId)
    setSelectedEmpresaCuit(cuit)
    setSelectedEmpresaMode('edit')
    setNewReportCountry(countryConfig || null)
    setPreviousView('new-report')
    setCurrentView('edit')
  }

  const handleNewReportEditExisting = (empresaId, cuit) => {
    setSelectedEmpresaId(empresaId)
    setSelectedEmpresaCuit(cuit)
    setSelectedEmpresaMode('edit')
    setNewReportCountry(null)
    setPreviousView('new-report')
    setCurrentView('edit')
  }

  const handleIniciarInformeSolicitud = async (solicitud) => {
    // Marcar como en_proceso en backend y obtener datos del pedido
    let pedidoInfo = null
    try {
      const putRes = await axios.put(`/api/pedidos-solicitudes/${solicitud.id}`, { estado: 'en_proceso' })
      console.log('[handleIniciarInformeSolicitud] PUT response:', putRes.data)
      if (putRes.data.pedido) {
        pedidoInfo = putRes.data.pedido
        console.log('[handleIniciarInformeSolicitud] Pedido info:', pedidoInfo)
      }
    } catch (err) {
      console.error('[handleIniciarInformeSolicitud] Error en PUT:', err)
    }
    
    // Determinar el abonado correcto:
    // Si hay cliente_abono (solicitud creada por analista para un cliente), usar ese
    // Si no, usar solicitante_abono (usuario que creó la solicitud)
    const abonadoFinal = solicitud.cliente_abono || solicitud.solicitante_abono || pedidoInfo?.usuario_id_interno || ''
    console.log('[handleIniciarInformeSolicitud] Abonado final:', abonadoFinal, 'cliente_abono:', solicitud.cliente_abono, 'solicitante_abono:', solicitud.solicitante_abono)
    
    // Enriquecer solicitud con datos del pedido
    const solicitudEnriquecida = {
      ...solicitud,
      abonado: abonadoFinal,
      expediente: pedidoInfo?.expediente || '',  // Expediente aleatorio auto-generado
      referencia: pedidoInfo?.referencia || '',  // Referencia del cliente (manual)
      fecha_informe: new Date().toISOString().split('T')[0] // Siempre fecha de hoy
    }
    console.log('[handleIniciarInformeSolicitud] Solicitud enriquecida:', solicitudEnriquecida)
    
    // Buscar si ya existe una empresa con este CUIT en la tabla empresas
    const cuit = (solicitud.cuit || '').replace(/\D/g, '')
    console.log('[handleIniciarInformeSolicitud] CUIT limpio:', cuit, 'Original:', solicitud.cuit)
    
    if (cuit) {
      try {
        console.log('[handleIniciarInformeSolicitud] Buscando empresa por CUIT...')
        const res = await axios.get(`/api/empresas/por-cuit/${cuit}`)
        console.log('[handleIniciarInformeSolicitud] Respuesta:', res.data)
        
        if (res.data.success && res.data.empresa) {
          console.log('[handleIniciarInformeSolicitud] ¡Empresa encontrada! ID:', res.data.empresa.id)
          // Ya existe una empresa con este CUIT - abrir en modo edición
          setSolicitudActiva(solicitudEnriquecida) // Mantener referencia con datos del pedido
          setSelectedEmpresaId(res.data.empresa.id)
          setSelectedEmpresaCuit(cuit)
          setSelectedEmpresaMode('edit')
          setExtractedData(null)
          setNewReportCountry(null)
          setPreviousView('pedidos-solicitudes')
          setCurrentView('solicitud-informe')
          return
        } else {
          console.log('[handleIniciarInformeSolicitud] Empresa NO encontrada, success:', res.data.success)
        }
      } catch (err) {
        console.error('[handleIniciarInformeSolicitud] Error buscando empresa:', err)
        // Si falla la búsqueda, continuar con flujo normal
      }
    }
    
    console.log('[handleIniciarInformeSolicitud] Creando nueva empresa desde solicitud')
    // No existe empresa - crear nueva desde datos de solicitud
    setSolicitudActiva(solicitudEnriquecida)
    setExtractedData(null)
    setSelectedEmpresaId(null)
    setSelectedEmpresaCuit(null)
    setSelectedEmpresaMode(null)
    setNewReportCountry(null)
    setPreviousView('pedidos-solicitudes')
    setCurrentView('solicitud-informe')
  }

  const handleSolicitudInformeComplete = () => {
    setSolicitudActiva(null)
    setSelectedEmpresaId(null)
    setSelectedEmpresaCuit(null)
    setRefreshKey(k => k + 1)
    setCurrentView('pedidos-solicitudes')
    setPreviousView(null)
  }

  const handleBackFromSolicitudInforme = () => {
    setSolicitudActiva(null)
    setSelectedEmpresaId(null)
    setSelectedEmpresaCuit(null)
    setCurrentView('pedidos-solicitudes')
    setPreviousView(null)
  }

  const _handleNewReport_UNUSED = async (pais, afipData) => {
    // Legacy — reemplazado por NewReportView
    if (afipData?._existing_id) {
      setSelectedEmpresaId(afipData._existing_id)
      setSelectedEmpresaCuit(afipData.cuit || null)
      setSelectedEmpresaMode('edit')
      setNewReportCountry(null)
      setPreviousView(currentView)
      setCurrentView('edit')
      return
    }

    try {
      const saveData = {
        tipo_identificacion: pais.tipo_id_fiscal || 'CUIT',
        cuit: afipData?.cuit || '',
        razon_social: afipData?.razon_social || '',
        domicilio: afipData?.domicilio || '',
        actividad_principal: afipData?.actividad_principal || '',
        ingresos_brutos: afipData?.ingresos_brutos || '',
      }
      const res = await axios.post('/api/save', saveData)
      if (res.data.success && res.data.id) {
        // Abrir el registro recién creado para editar
        setSelectedEmpresaId(res.data.id)
        setSelectedEmpresaCuit(afipData?.cuit || null)
        setSelectedEmpresaMode('edit')
        setNewReportCountry(null)
        setExtractedData(null)
        setFilename('')
        setSinopsisInfo(null)
        setPreviousView(currentView)
        setCurrentView('edit')
        return
      }
    } catch (err) {
      console.error('Error al pre-guardar:', err)
      // Si falla el pre-guardado, abrir como nuevo informe sin guardar
    }

    setNewReportCountry({ ...pais, afipData: afipData || {} })
    setExtractedData(null)
    setFilename('')
    setSinopsisInfo(null)
    setSelectedEmpresaId(null)
    setSelectedEmpresaCuit(null)
    setSelectedEmpresaMode(null)
    setPreviousView(currentView)
    setCurrentView('edit')
  }

  const handleBulkResults = (results) => {
    setBulkResults(results)
    setHasBulkResults(results.success.length > 0 || results.warnings.length > 0 || results.failed.length > 0)
  }

  const handleSelectEmpresa = (empresaId, mode, cuit = null) => {
    if (mode === 'scoring' && !canAccessScoring) {
      return
    }
    setSelectedEmpresaId(empresaId)
    setSelectedEmpresaCuit(cuit)
    setSelectedEmpresaMode(mode)
    setPreviousView(currentView) // Guardar vista actual antes de cambiar
    if (mode === 'historial') {
      setCurrentView('historial')
    } else if (mode === 'scoring') {
      setCurrentView('scoring')
    } else {
      setCurrentView(mode === 'view' ? 'view' : 'edit')
    }
  }

  // Función especial para navegación desde el modal de EmpresasList
  const handleSelectFromListModal = (empresaId, mode, cuit = null) => {
    if (mode === 'scoring' && !canAccessScoring) {
      return
    }
    setListDetailEmpresaId(empresaId) // Guardar para reabrir modal al volver
    setSelectedEmpresaId(empresaId)
    setSelectedEmpresaCuit(cuit)
    setSelectedEmpresaMode(mode)
    setPreviousView('list-modal') // Marcar que viene del modal de list
    if (mode === 'historial') {
      setCurrentView('historial')
    } else if (mode === 'scoring') {
      setCurrentView('scoring')
    } else {
      setCurrentView(mode === 'view' ? 'view' : 'edit')
    }
  }

  const handleBackToSearch = () => {
    setSelectedEmpresaId(null)
    setSelectedEmpresaCuit(null)
    setSelectedEmpresaMode(null)
    setPreviousView(null)
    setOriginView(null)
    setListDetailEmpresaId(null)
    setNewReportCountry(null)
    setRefreshKey(k => k + 1)
    setCurrentView('search')
  }

  // Volver a la vista anterior según de dónde vino
  const handleBackFromView = () => {
    setRefreshKey(k => k + 1)
    if (previousView === 'historial' && selectedEmpresaCuit) {
      // Volver al historial y restaurar el origen
      setCurrentView('historial')
      setPreviousView(originView || 'search') // Restaurar el origen
      setOriginView(null)
    } else if (previousView === 'list-modal') {
      // Volver a Ver Registros con el modal abierto
      setSelectedEmpresaId(null)
      setSelectedEmpresaCuit(null)
      setSelectedEmpresaMode(null)
      setPreviousView(null)
      setOriginView(null)
      // listDetailEmpresaId se mantiene para reabrir el modal
      setCurrentView('list')
    } else if (previousView === 'list') {
      // Volver a Ver Registros sin modal
      setSelectedEmpresaId(null)
      setSelectedEmpresaCuit(null)
      setSelectedEmpresaMode(null)
      setPreviousView(null)
      setOriginView(null)
      setListDetailEmpresaId(null)
      setCurrentView('list')
    } else if (previousView === 'pedidos-solicitudes' || previousView === 'solicitudes') {
      // Volver a Solicitudes
      setSelectedEmpresaId(null)
      setSelectedEmpresaCuit(null)
      setSelectedEmpresaMode(null)
      setExtractedData(null)
      setNewReportCountry(null)
      setPreviousView(null)
      setOriginView(null)
      setCurrentView(previousView)
    } else {
      // Volver a búsqueda por defecto
      handleBackToSearch()
    }
  }

  // Volver desde historial respetando de dónde vino
  const handleBackFromHistorial = () => {
    setRefreshKey(k => k + 1)
    if (previousView === 'list-modal') {
      // Volver a Ver Registros con el modal abierto
      setSelectedEmpresaId(null)
      setSelectedEmpresaCuit(null)
      setSelectedEmpresaMode(null)
      setPreviousView(null)
      setOriginView(null)
      setCurrentView('list')
    } else if (previousView === 'list') {
      setSelectedEmpresaId(null)
      setSelectedEmpresaCuit(null)
      setSelectedEmpresaMode(null)
      setPreviousView(null)
      setOriginView(null)
      setListDetailEmpresaId(null)
      setCurrentView('list')
    } else {
      handleBackToSearch()
    }
  }

  const handleViewVersion = (versionId, versionNum) => {
    // Guardar el origen si estamos en historial y previousView tiene valor
    if (previousView) {
      setOriginView(previousView)
    }
    setPreviousView('historial') // Marcar que viene del historial
    setSelectedEmpresaId(versionId)
    setSelectedEmpresaMode('view')
    setCurrentView('view')
  }

  const totalProcessed = bulkResults.success.length + bulkResults.warnings.length

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    )
  }

  // Not authenticated → login or register
  if (!user) {
    if (showRegister) {
      return <RegisterPage onBack={() => setShowRegister(false)} />
    }
    return <LoginPage onLogin={login} onRegister={() => setShowRegister(true)} />
  }

  // Must change password
  if (mustChangePassword) {
    return <ChangePasswordModal required onClose={() => {}} onSuccess={onPasswordChanged} />
  }

  // Portal cliente: usuarios con rol cliente_admin, cliente_usuario, usuario o cliente_presentacion ven el portal con sidebar
  const isClientUser = ['cliente_admin', 'cliente_usuario', 'usuario', 'cliente_presentacion'].includes(user?.rol) && !isAdmin
  if (isClientUser) {
    return <ClientPortal />
  }

  // ─── Build sidebar items based on permissions ───
  const sidebarItems = []
  if (canAccessDashboard) sidebarItems.push({ id: 'dashboard', label: t('nav.home'), icon: LayoutDashboard, color: 'violet' })
  // Solicitudes (nueva tabla solicitudes_pedidos)
  if (user?.rol === 'analista') sidebarItems.push({ id: 'pedidos-solicitudes', label: 'Solicitudes', icon: ClipboardList, color: 'indigo' })
  // Legacy solicitudes_investigacion - OCULTO
  // if (user?.rol === 'analista') sidebarItems.push({ id: 'solicitudes', label: 'Solicitudes (Legacy)', icon: ClipboardList, color: 'gray' })
  sidebarItems.push({ id: 'search', label: t('nav.search'), icon: Search })
  // Solicitudes (nueva tabla solicitudes_pedidos) para admin
  if (isAdmin) sidebarItems.push({ id: 'pedidos-solicitudes', label: 'Solicitudes', icon: ClipboardList, color: 'indigo' })
  // Legacy solicitudes_investigacion - OCULTO
  // if (isAdmin) sidebarItems.push({ id: 'solicitudes', label: 'Solicitudes (Legacy)', icon: ClipboardList, color: 'gray' })
  if (hasPermission('subir')) {
    sidebarItems.push({ id: 'upload', label: t('nav.uploadPdf'), icon: Upload })
    sidebarItems.push({ id: 'bulk', label: t('nav.bulkUpload'), icon: Files, badge: hasBulkResults && currentView !== 'bulk' })
  }
  // Nuevo Informe: solo para usuarios normales, no admin/analista (ellos usan Solicitudes)
  if (hasPermission('nuevo_informe') && !isAdmin && user?.rol !== 'analista') sidebarItems.push({ id: 'new-blank', label: t('nav.newReport'), icon: FilePlus2 })
  if (hasPermission('editar')) sidebarItems.push({ id: 'list', label: t('nav.records'), icon: List })
  if (canAccessScoring) {
    sidebarItems.push({ id: '_sep_scoring', separator: true, label: t('nav.scoring') })
    sidebarItems.push({ id: 'scoring', label: t('nav.calculateScore'), icon: Calculator, color: 'emerald' })
    sidebarItems.push({ id: 'scoring-dashboard', label: t('nav.scoreDashboard'), icon: BarChart3, color: 'emerald' })
    sidebarItems.push({ id: 'scoring-compare', label: t('nav.compare'), icon: GitCompare, color: 'emerald' })
  }
  if (isAdmin || user?.rol === 'analista') {
    sidebarItems.push({ id: '_sep_sistema', separator: true, label: t('nav.system') })
  }
  if (isAdmin || user?.rol === 'analista') sidebarItems.push({ id: 'usuarios-pedidos', label: 'Usuarios Clientes', icon: Users2, color: 'cyan' })
  if (isAdmin) sidebarItems.push({ id: 'creditos', label: t('nav.credits'), icon: CreditCard, color: 'amber' })
  if (isAdmin) sidebarItems.push({ id: 'planes', label: t('nav.plans'), icon: Package, color: 'indigo' })
  if (isAdmin) sidebarItems.push({ id: 'cupones', label: t('nav.coupons'), icon: Ticket, color: 'purple' })
  if (isAdmin) sidebarItems.push({ id: 'dunning', label: t('nav.paymentsDunning'), icon: AlertTriangle, color: 'red' })
  if (isAdmin) sidebarItems.push({ id: 'facturacion-admin', label: t('nav.billing'), icon: FileText, color: 'blue' })
  if (isAdmin) sidebarItems.push({ id: 'revenue', label: t('nav.revenue'), icon: TrendingUp, color: 'green' })
  if (isAdmin) sidebarItems.push({ id: 'pasarelas', label: t('nav.paymentGateways'), icon: Webhook, color: 'purple' })
  if (isAdmin) sidebarItems.push({ id: 'precios-pais', label: t('nav.countryPricing'), icon: Globe, color: 'teal' })
  if (isAdmin) sidebarItems.push({ id: 'proveedores-pricing', label: t('nav.pricingEngine'), icon: Calculator, color: 'cyan' })
  if (isAdmin || user?.rol === 'analista') sidebarItems.push({ id: 'facturacion-solicitudes', label: 'Fact. Solicitudes', icon: CreditCard, color: 'emerald' })
  if (isAdmin) sidebarItems.push({ id: 'productos-admin', label: t('nav.products'), icon: Package, color: 'violet' })
  if (isAdmin) sidebarItems.push({ id: 'alertas', label: t('nav.alerts'), icon: Bell, color: alertasCount > 0 ? 'amber' : 'blue', alertCount: alertasCount })
  if (isAdmin) sidebarItems.push({ 
    id: 'admin', 
    label: 'Panel Administración', 
    icon: Shield, 
    color: aprobacionesCount > 0 ? 'amber' : 'red', 
    alertCount: aprobacionesCount,
    children: [
      { id: 'admin-usuarios', label: 'Usuarios', icon: Users },
      { id: 'admin-aprobaciones', label: 'Aprobaciones', icon: UserCheck, alertCount: aprobacionesCount },
      { id: 'admin-packs', label: 'Packs', icon: Package },
      { id: 'admin-prepago', label: 'Clientes Prepago', icon: Building2 },
      { id: 'admin-roles', label: 'Roles', icon: Shield },
      { id: 'admin-auditoria', label: 'Auditoría', icon: ScrollText },
      { id: 'admin-apikeys', label: 'API Keys', icon: KeyRound },
      { id: 'admin-webhooks', label: 'Webhooks', icon: Webhook },
    ]
  })
  if (isClienteAdmin) sidebarItems.push({ id: 'cliente-admin', label: t('nav.myCompany'), icon: UserCheck, color: aprobacionesEmpresaCount > 0 ? 'amber' : 'blue', alertCount: aprobacionesEmpresaCount })
  if (isClienteAdmin) sidebarItems.push({ id: 'cliente-productos', label: t('nav.myModules'), icon: Package, color: 'violet' })
  sidebarItems.push({ id: '_sep_bo', separator: true, label: t('nav.externalServices') })
  sidebarItems.push({ id: 'boletin-oficial', label: t('nav.officialGazette'), icon: Newspaper, color: 'indigo' })

  const currentLabel = sidebarItems.find(i => i.id === currentView)?.label || 'Inforysk'

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 fixed h-full z-30`}>
        <div className={`h-20 flex items-center border-b border-gray-100 ${sidebarOpen ? 'justify-between px-4' : 'flex-col justify-center py-2'}`}>
          {sidebarOpen ? (
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => { handleBackToSearch(); setMobileMenuOpen(false); }}
            >
              <img src={logo} alt="Inforysk" className="h-[68px] w-auto" />
            </div>
          ) : (
            <div
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => { handleBackToSearch(); setMobileMenuOpen(false); }}
            >
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

        {sidebarOpen && (
          <div className="px-4 py-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-inforysk-navy-50 to-inforysk-red-50 text-inforysk-navy-900">
              {user.rol === 'admin' ? t('nav.administrator') : t('nav.analyst')}
            </span>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {sidebarItems.map(item => {
            if (item.separator) {
              return sidebarOpen ? (
                <p key={item.id} className="px-3 pt-4 pb-1 text-[10px] uppercase font-semibold text-gray-400 tracking-wider">{item.label}</p>
              ) : <div key={item.id} className="my-2 border-t border-gray-100" />
            }
            const Icon = item.icon
            const isActive = currentView === item.id || (item.children && item.children.some(c => currentView === c.id))
            const isSubmenuOpen = openSubmenu === item.id
            const activeColor = {
              violet: 'bg-violet-50 text-violet-700',
              emerald: 'bg-emerald-50 text-emerald-700',
              indigo: 'bg-inforysk-navy-50 text-inforysk-navy-900',
              red: 'bg-inforysk-red-50 text-inforysk-red-700',
              amber: 'bg-amber-50 text-amber-700',
            }[item.color] || 'bg-inforysk-navy-50 text-inforysk-navy-900'
            const activeIcon = {
              violet: 'text-violet-600',
              emerald: 'text-emerald-600',
              indigo: 'text-inforysk-navy-900',
              red: 'text-inforysk-red-600',
              amber: 'text-amber-600',
            }[item.color] || 'text-inforysk-navy-900'

            // Item con submenú
            if (item.children && sidebarOpen) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setOpenSubmenu(isSubmenuOpen ? null : item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                      isActive ? `${activeColor} shadow-sm` : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? activeIcon : item.alertCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.alertCount > 0 && (
                      <span className="flex items-center justify-center rounded-full text-[10px] text-white font-bold h-4 w-4 bg-amber-500 mr-1">
                        {item.alertCount > 9 ? '9+' : item.alertCount}
                      </span>
                    )}
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isSubmenuOpen && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-3">
                      {item.children.map(child => {
                        const ChildIcon = child.icon
                        const isChildActive = currentView === child.id
                        return (
                          <button
                            key={child.id}
                            onClick={() => { setCurrentView(child.id); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all relative ${
                              isChildActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <ChildIcon className={`h-4 w-4 ${isChildActive ? 'text-gray-700' : 'text-gray-400'}`} />
                            <span>{child.label}</span>
                            {child.alertCount > 0 && (
                              <span className="ml-auto flex items-center justify-center rounded-full text-[10px] text-white font-bold h-4 w-4 bg-amber-500">
                                {child.alertCount > 9 ? '9+' : child.alertCount}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Item sin submenú (sidebar abierto o cerrado)
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.children && !sidebarOpen) {
                    // Si tiene children y sidebar cerrado, abrir sidebar y submenu
                    setSidebarOpen(true);
                    setOpenSubmenu(item.id);
                    return;
                  }
                  if (item.id === 'new-blank') {
                    setExtractedData(null); setSelectedEmpresaId(null); setSelectedEmpresaCuit(null); setSelectedEmpresaMode(null); setNewReportCountry(null); setPreviousView(currentView);
                  }
                  if (item.id === 'search') {
                    setRefreshKey(k => k + 1);
                  }
                  setCurrentView(item.id); setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive ? `${activeColor} shadow-sm` : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? activeIcon : item.alertCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                {sidebarOpen && <span>{item.label}</span>}
                {item.alertCount > 0 && (
                  <span className={`absolute top-1 right-1 flex items-center justify-center rounded-full text-[10px] text-white font-bold ${item.alertCount > 9 ? 'h-5 w-5 bg-amber-500' : 'h-4 w-4 bg-amber-500'}`}>
                    {item.alertCount > 99 ? '99+' : item.alertCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-inforysk-navy-900 to-inforysk-red-600 flex items-center justify-center text-white font-bold text-xs">
                {(user.nombre_completo || user.username || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.nombre_completo || user.username}</p>
                <p className="text-xs text-gray-500 truncate">{user.rol}</p>
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title={t('portal.logout')}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} className="w-full flex justify-center p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title={t('portal.logout')}>
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl z-50 flex flex-col">
            <div className="h-20 flex items-center justify-between px-4 border-b">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Inforysk" className="h-[68px] w-auto" />
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-4 py-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-inforysk-navy-50 to-inforysk-red-50 text-inforysk-navy-900">
                {user.rol === 'admin' ? t('nav.administrator') : t('nav.analyst')}
              </span>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
              {sidebarItems.map(item => {
                if (item.separator) {
                  return <p key={item.id} className="px-3 pt-4 pb-1 text-[10px] uppercase font-semibold text-gray-400 tracking-wider">{item.label}</p>
                }
                const Icon = item.icon
                const isActive = currentView === item.id || (item.children && item.children.some(c => currentView === c.id))
                const isSubmenuOpen = openSubmenu === item.id
                const activeColor = {
                  violet: 'bg-violet-50 text-violet-700',
                  emerald: 'bg-emerald-50 text-emerald-700',
                  indigo: 'bg-inforysk-navy-50 text-inforysk-navy-900',
                  red: 'bg-inforysk-red-50 text-inforysk-red-700',
                  amber: 'bg-amber-50 text-amber-700',
                }[item.color] || 'bg-inforysk-navy-50 text-inforysk-navy-900'
                const activeIcon = {
                  violet: 'text-violet-600',
                  emerald: 'text-emerald-600',
                  indigo: 'text-inforysk-navy-900',
                  red: 'text-inforysk-red-600',
                  amber: 'text-amber-600',
                }[item.color] || 'text-inforysk-navy-900'

                // Item con submenú (móvil)
                if (item.children) {
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setOpenSubmenu(isSubmenuOpen ? null : item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                          isActive ? activeColor : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? activeIcon : item.alertCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.alertCount > 0 && (
                          <span className="flex items-center justify-center rounded-full text-[10px] text-white font-bold h-4 w-4 bg-amber-500 mr-1">
                            {item.alertCount > 9 ? '9+' : item.alertCount}
                          </span>
                        )}
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isSubmenuOpen && (
                        <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-3">
                          {item.children.map(child => {
                            const ChildIcon = child.icon
                            const isChildActive = currentView === child.id
                            return (
                              <button
                                key={child.id}
                                onClick={() => { setCurrentView(child.id); setMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all relative ${
                                  isChildActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                              >
                                <ChildIcon className={`h-4 w-4 ${isChildActive ? 'text-gray-700' : 'text-gray-400'}`} />
                                <span>{child.label}</span>
                                {child.alertCount > 0 && (
                                  <span className="ml-auto flex items-center justify-center rounded-full text-[10px] text-white font-bold h-4 w-4 bg-amber-500">
                                    {child.alertCount > 9 ? '9+' : child.alertCount}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'new-blank') {
                        setExtractedData(null); setSelectedEmpresaId(null); setSelectedEmpresaCuit(null); setSelectedEmpresaMode(null); setNewReportCountry(null); setPreviousView(currentView);
                      }
                      if (item.id === 'search') {
                        setRefreshKey(k => k + 1);
                      }
                      setCurrentView(item.id); setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                      isActive ? activeColor : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? activeIcon : item.alertCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                    {item.alertCount > 0 && (
                      <span className={`ml-auto flex items-center justify-center rounded-full text-[10px] text-white font-bold ${item.alertCount > 9 ? 'h-5 w-5 bg-amber-500' : 'h-4 w-4 bg-amber-500'}`}>
                        {item.alertCount > 99 ? '99+' : item.alertCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
            <div className="border-t p-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-inforysk-navy-900 to-inforysk-red-600 flex items-center justify-center text-white font-bold text-xs">
                  {(user.nombre_completo || user.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.nombre_completo || user.username}</p>
                  <p className="text-xs text-gray-400">{user.rol}</p>
                </div>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300`}>
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            {(previousView || currentView === 'edit' || currentView === 'view' || currentView === 'historial' || currentView === 'solicitud-informe') && (
              <button onClick={currentView === 'solicitud-informe' ? handleBackFromSolicitudInforme : handleBackFromView} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{currentLabel}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk results badge */}
            {hasBulkResults && currentView !== 'bulk' && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                {bulkResults.success.length > 0 && (
                  <span className="flex items-center gap-0.5 text-green-600 text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {bulkResults.success.length}
                  </span>
                )}
                {bulkResults.warnings.length > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-600 text-xs font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" /> {bulkResults.warnings.length}
                  </span>
                )}
                {bulkResults.failed.length > 0 && (
                  <span className="flex items-center gap-0.5 text-red-600 text-xs font-medium">
                    <XCircle className="h-3.5 w-3.5" /> {bulkResults.failed.length}
                  </span>
                )}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-inforysk-navy-900 to-inforysk-red-600 flex items-center justify-center text-white font-bold text-xs">
                {(user.nombre_completo || user.username || '?')[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.nombre_completo || user.username}</span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
        {/* SearchView se mantiene montado pero oculto para preservar búsqueda */}
        <div className={currentView === 'search' ? '' : 'hidden'}>
          <SearchView onSelectEmpresa={handleSelectEmpresa} refreshKey={refreshKey} />
        </div>
        
        {currentView === 'upload' && (
            <PDFUploader onDataExtracted={handleDataExtracted} />
        )}
        
        {/* BulkUploader se mantiene montado pero oculto para preservar estado */}
        <div className={currentView === 'bulk' ? '' : 'hidden'}>
          <BulkUploader 
            onResultsChange={handleBulkResults}
          />
        </div>
        
        {currentView === 'edit' && (extractedData || selectedEmpresaId || newReportCountry) && (
            <DataEditor 
              key={selectedEmpresaId || (newReportCountry ? `new-${newReportCountry.afipData?.cuit || 'blank'}` : 'extract')}
              data={extractedData}
              filename={filename}
              empresaId={selectedEmpresaId}
              mode={selectedEmpresaMode === 'view' ? 'view' : 'edit'}
              onSave={handleSaveComplete}
              onBack={extractedData || newReportCountry ? handleBackToSearch : handleBackFromView}
              sinopsisInfo={sinopsisInfo}
              countryConfig={newReportCountry}
              isFromPdfUpload={!!extractedData && !selectedEmpresaId}
            />
        )}

        {currentView === 'new-blank' && (
            <DataEditor
              key="new-blank"
              mode="edit"
              isNewBlank={true}
              onSave={handleSaveComplete}
              onBack={handleBackToSearch}
            />
        )}

        {currentView === 'view' && selectedEmpresaId && (
            <DataEditor 
              empresaId={selectedEmpresaId}
              mode="view"
              onSave={handleBackFromView}
              onBack={handleBackFromView}
            />
        )}
        
        {currentView === 'list' && (
            <EmpresasList 
              onSelectEmpresa={handleSelectEmpresa}
              onSelectFromModal={handleSelectFromListModal}
              initialDetailId={listDetailEmpresaId}
              onClearInitialDetail={() => setListDetailEmpresaId(null)}
            />
        )}

        {currentView === 'historial' && (selectedEmpresaId || selectedEmpresaCuit) && (
            <HistorialView 
              empresaId={selectedEmpresaId}
              cuit={selectedEmpresaCuit}
              onBack={handleBackFromHistorial}
              onViewVersion={handleViewVersion}
            />
        )}

        {currentView === 'dashboard' && canAccessDashboard && (
            <AdminDashboard />
        )}

        {currentView === 'admin' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} />
        )}

        {/* Submenús de Admin - cada uno abre AdminPanel con tab específico */}
        {currentView === 'admin-usuarios' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="usuarios" />
        )}
        {currentView === 'admin-aprobaciones' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="aprobaciones" />
        )}
        {currentView === 'admin-packs' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="informes" />
        )}
        {currentView === 'admin-prepago' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="clientes-prepago" />
        )}
        {currentView === 'admin-roles' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="roles" />
        )}
        {currentView === 'admin-auditoria' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="logs" />
        )}
        {currentView === 'admin-apikeys' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="apikeys" />
        )}
        {currentView === 'admin-webhooks' && isAdmin && (
            <AdminPanel onBack={() => setCurrentView('search')} defaultTab="webhooks" />
        )}

        {currentView === 'cliente-admin' && isClienteAdmin && (
            <ClienteAdminPanel onBack={() => setCurrentView('search')} />
        )}

        {currentView === 'cliente-productos' && isClienteAdmin && (
            <ClienteProductosView />
        )}

        {currentView === 'usuarios-pedidos' && (isAdmin || user?.rol === 'analista') && (
            <UsuariosPedidosView />
        )}

        {currentView === 'creditos' && isAdmin && (
            <CreditosView />
        )}

        {currentView === 'planes' && isAdmin && (
            <PlanesView />
        )}

        {currentView === 'cupones' && isAdmin && (
            <AdminCouponsView />
        )}

        {currentView === 'dunning' && isAdmin && (
            <AdminDunningView />
        )}

        {currentView === 'facturacion-admin' && isAdmin && (
            <AdminFacturacionView />
        )}

        {currentView === 'revenue' && isAdmin && (
            <AdminRevenueView />
        )}

        {currentView === 'pasarelas' && isAdmin && (
            <AdminPaymentsView />
        )}

        {currentView === 'precios-pais' && isAdmin && (
            <AdminPreciosPaisView />
        )}

        {currentView === 'proveedores-pricing' && isAdmin && (
            <AdminProveedoresView />
        )}

        {currentView === 'facturacion-solicitudes' && (isAdmin || user?.rol === 'analista') && (
            <AdminFacturacionSolicitudesView />
        )}

        {currentView === 'productos-admin' && isAdmin && (
            <AdminProductosView />
        )}

        {currentView === 'alertas' && isAdmin && (
            <AdminNotifications onCountChange={(count) => setAlertasCount(count)} />
        )}

        {currentView === 'scoring' && canAccessScoring && (
            selectedEmpresaCuit ? (
              <ScoringView
                empresaId={selectedEmpresaId}
                cuit={selectedEmpresaCuit}
                onBack={handleBackFromView}
              />
            ) : (
              <ScoringSelector onSelect={(empresaId, cuit) => {
                setSelectedEmpresaId(empresaId)
                setSelectedEmpresaCuit(cuit)
              }} />
            )
        )}

        {currentView === 'scoring-dashboard' && canAccessScoring && (
            <ScoringDashboard />
        )}

        {currentView === 'scoring-compare' && canAccessScoring && (
            <ComparadorEmpresas onBack={() => setCurrentView('search')} />
        )}

        {currentView === 'solicitudes' && (isAdmin || user?.rol === 'analista') && (
            <SolicitudesView 
              isAdmin={isAdmin} 
              onIniciarInforme={handleIniciarInformeSolicitud}
              onNuevoInforme={() => {
                setExtractedData(null)
                setSelectedEmpresaId(null)
                setSelectedEmpresaCuit(null)
                setSelectedEmpresaMode(null)
                setNewReportCountry(null)
                setPreviousView('solicitudes')
                setCurrentView('new-blank')
              }}
            />
        )}

        {currentView === 'pedidos-solicitudes' && (isAdmin || user?.rol === 'analista') && (
            <PedidosSolicitudesView 
              isAdmin={isAdmin}
              onIniciarInforme={handleIniciarInformeSolicitud}
              onNuevoInforme={() => {
                setExtractedData(null)
                setSelectedEmpresaId(null)
                setSelectedEmpresaCuit(null)
                setSelectedEmpresaMode(null)
                setNewReportCountry(null)
                setPreviousView('pedidos-solicitudes')
                setCurrentView('new-blank')
              }}
            />
        )}

        {currentView === 'solicitud-informe' && solicitudActiva && (
          selectedEmpresaId ? (
            // Empresa existente - cargar datos desde BD pero con info del pedido
            <DataEditor
              key={`solicitud-empresa-${selectedEmpresaId}`}
              empresaId={selectedEmpresaId}
              mode="edit"
              fromSolicitud={solicitudActiva}
              onSave={handleSolicitudInformeComplete}
              onBack={handleBackFromSolicitudInforme}
            />
          ) : (
            // Nueva empresa - usar datos de solicitud como semilla
            <DataEditor
              key={`solicitud-${solicitudActiva.id}`}
              mode="edit"
              isNewBlank={true}
              fromSolicitud={solicitudActiva}
              onSave={handleSolicitudInformeComplete}
              onBack={handleBackFromSolicitudInforme}
            />
          )
        )}

        {currentView === 'boletin-oficial' && (
            <BoletinOficialView />
        )}
        </main>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════
// NavDropdown - Menú desplegable para grupos
// ═══════════════════════════════════════════════
function NavDropdown({ label, icon: Icon, active, color = 'blue', badge, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeColors = color === 'emerald' 
    ? 'bg-emerald-100 text-emerald-700' 
    : 'bg-blue-100 text-blue-700'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
          active ? activeColors : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon className="h-4 w-4 mr-1.5" />
        {label}
        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        {badge && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">!</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                item.active 
                  ? (color === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-4 w-4 mr-2.5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">!</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


function ScoringSelector({ onSelect }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [allEmpresas, setAllEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [countryFilter, setCountryFilter] = useState('all')
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef(null)

  const [page, setPage] = useState(1)
  const PER_PAGE = 16

  const COUNTRY_ISO = {
    'Argentina': 'ar', 'Uruguay': 'uy', 'Colombia': 'co', 'Peru': 'pe',
    'Rep. Dominicana': 'do', 'Honduras': 'hn', 'Mexico': 'mx', 'Costa Rica': 'cr',
    'Union Europea': 'eu', 'Internacional': null,
  }
  const TIPO_TO_PAIS = {
    CUIT: 'Argentina', RUT: 'Uruguay', NIT: 'Colombia', RUC: 'Peru',
    RNC: 'Rep. Dominicana', RTN: 'Honduras', RFC: 'Mexico',
    'CEDULA JURIDICA': 'Costa Rica', VAT: 'Union Europea',
  }

  useEffect(() => {
    const handler = (e) => { if (countryRef.current && !countryRef.current.contains(e.target)) setCountryOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    loadEmpresas()
  }, [])

  const loadEmpresas = async () => {
    try {
      const res = await axios.get('/api/empresas')
      if (res.data.success) {
        setAllEmpresas(res.data.empresas || res.data.data || [])
      }
    } catch (err) { /* ignore */ }
    setLoading(false)
  }

  // Países disponibles (extraer de allEmpresas)
  const availableCountries = useMemo(() => {
    const set = new Set()
    allEmpresas.forEach(e => {
      const tipo = (e.tipo_identificacion || '').toUpperCase()
      const pais = TIPO_TO_PAIS[tipo]
      if (pais) set.add(pais)
    })
    return Array.from(set).sort()
  }, [allEmpresas])

  useEffect(() => {
    const term = search.toLowerCase().trim()
    const termClean = term.replace(/[-.\s]/g, '')

    let base = allEmpresas
    // Filtro por país
    if (countryFilter !== 'all') {
      base = base.filter(e => {
        const tipo = (e.tipo_identificacion || '').toUpperCase()
        return TIPO_TO_PAIS[tipo] === countryFilter
      })
    }

    if (!term) {
      setResults(countryFilter !== 'all' ? base : [])
      setPage(1)
      return
    }

    const filtered = base.filter(e => {
      const cuit = (e.cuit || '').toLowerCase()
      const cuitClean = cuit.replace(/[-.\s]/g, '')
      const nombre = (e.razon_social || '').toLowerCase()
      return cuitClean.includes(termClean) || nombre.includes(term)
    })
    setResults(filtered)
    setPage(1)
  }, [search, allEmpresas, countryFilter])

  const totalPages = Math.ceil(results.length / PER_PAGE)
  const paginatedResults = results.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const selectedCountry = countryFilter !== 'all'
  const selectedIso = selectedCountry ? COUNTRY_ISO[countryFilter] : null

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-0">
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Scoring Crediticio</h2>
        <p className="text-sm text-gray-500 mb-4">Busca por CUIT / RNC / RUT / RTN o razón social para calcular el score</p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ingresa CUIT/RNC/RUT/RTN o nombre de empresa..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>

        {/* Filtro por país */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative" ref={countryRef}>
            <button
              type="button"
              onClick={() => setCountryOpen(!countryOpen)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                selectedCountry
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectedCountry && selectedIso ? (
                <img src={`https://flagcdn.com/20x15/${selectedIso}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {selectedCountry ? countryFilter : 'Filtrar por país'}
              {selectedCountry ? (
                <span
                  onClick={(e) => { e.stopPropagation(); setCountryFilter('all'); setCountryOpen(false) }}
                  className="ml-0.5 p-0.5 rounded hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              ) : (
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
            {countryOpen && availableCountries.length > 0 && (
              <div className="absolute z-50 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  {availableCountries.map(pais => {
                    const code = COUNTRY_ISO[pais]
                    return (
                      <button
                        key={pais}
                        onClick={() => { setCountryFilter(pais); setCountryOpen(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${countryFilter === pais ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'}`}
                      >
                        {code ? (
                          <img src={`https://flagcdn.com/24x18/${code}.png`} alt="" className="w-6 h-4 rounded-sm object-cover" />
                        ) : (
                          <Globe className="h-4 w-4 text-gray-400" />
                        )}
                        {pais}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          {selectedCountry && (
            <span className="text-xs text-gray-500">
              {allEmpresas.filter(e => TIPO_TO_PAIS[(e.tipo_identificacion || '').toUpperCase()] === countryFilter).length} empresas
            </span>
          )}
        </div>
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}
        {!loading && results.length > 0 && (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {paginatedResults.map(e => {
              const ePais = TIPO_TO_PAIS[(e.tipo_identificacion || '').toUpperCase()]
              const eIso = ePais ? COUNTRY_ISO[ePais] : null
              return (
              <button
                key={e.id}
                onClick={() => onSelect(e.id, e.cuit)}
                className="w-full text-left px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {eIso && <img src={`https://flagcdn.com/16x12/${eIso}.png`} alt="" className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />}
                      <p className="font-medium text-sm text-gray-900 group-hover:text-blue-700 truncate">{e.razon_social}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      <span className="font-medium text-gray-600">{e.tipo_identificacion || 'CUIT'}:</span> {e.cuit}
                      {e.actividad_principal && <span className="ml-2 text-gray-400 hidden sm:inline">· {e.actividad_principal}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {e.scoring ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        e.scoring.score_total >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        e.scoring.score_total >= 60 ? 'bg-blue-100 text-blue-700' :
                        e.scoring.score_total >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {e.scoring.score_total} · {e.scoring.rating}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-400">
                        Sin score
                      </span>
                    )}
                    <BarChart3 className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                  </div>
                </div>
              </button>
              )
            })}
          </div>
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, results.length)} de {results.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >«</button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >‹ Anterior</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p
                  if (totalPages <= 5) p = i + 1
                  else if (page <= 3) p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else p = page - 2 + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs rounded-lg font-medium ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                    >{p}</button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >Siguiente ›</button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >»</button>
              </div>
            </div>
          )}
          </>
        )}
        {!loading && results.length === 0 && search.trim() && (
          <p className="text-sm text-gray-400 text-center py-6">No se encontraron empresas con ese CUIT/RNC/RUT/RTN</p>
        )}
        {!loading && !search.trim() && !selectedCountry && (
          <p className="text-sm text-gray-400 text-center py-6">Ingresa un CUIT/RNC/RUT/RTN para comenzar</p>
        )}
      </div>
    </div>
  )
}


export default App
