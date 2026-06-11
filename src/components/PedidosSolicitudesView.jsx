import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, ExternalLink, Clock, CheckCircle2, ChevronDown, Building2, MapPin, Briefcase, Shield, Send, Eye, X, Globe, Database, Filter, RotateCcw, Play, FileText, Ban, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileDown, Plus, FilePlus2, UserPlus, SlidersHorizontal, Calendar, AlertTriangle, ArrowLeft, ArrowRight, RotateCw, Zap, Check, MoreVertical } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ESTADO_CONFIG = {
  consulta: { label: 'Consulta', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Search },
  precarga: { label: 'Precarga', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Database },
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  en_proceso: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Search },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: X },
}

const PRIORIDAD_CONFIG = {
  normal: { label: 'Normal', color: 'text-blue-600' },
  '72h': { label: '72 Horas', color: 'text-orange-600' },
  urgente: { label: 'Urgente', color: 'text-red-600 font-bold' },
}

const COUNTRY_ISO = {
  'Argentina': 'ar', 'Uruguay': 'uy', 'Brasil': 'br', 'Chile': 'cl',
  'Colombia': 'co', 'Perú': 'pe', 'Peru': 'pe', 
  'Rep. Dominicana': 'do', 'República Dominicana': 'do', 'Republica Dominicana': 'do',
  'Honduras': 'hn', 'México': 'mx', 'Mexico': 'mx', 'Costa Rica': 'cr', 'Guatemala': 'gt', 'España': 'es',
  'Ecuador': 'ec', 'Paraguay': 'py', 'Bolivia': 'bo', 'Venezuela': 've',
  'Panamá': 'pa', 'Panama': 'pa', 'El Salvador': 'sv', 'Nicaragua': 'ni', 'Saint Lucia': 'lc',
  'Jamaica': 'jm', 'Barbados': 'bb', 'Bahamas': 'bs', 'Trinidad y Tobago': 'tt',
  'Antigua & Barbuda': 'ag', 'Antigua and Barbuda': 'ag', 'Antigua y Barbuda': 'ag',
  'Estados Unidos': 'us', 'Alemania': 'de', 'Union Europea': 'eu', 'Unión Europea': 'eu',
  'Desconocido': null, 'Internacional': null
}

const PAISES_DISPONIBLES = ['Argentina', 'Uruguay', 'Chile', 'Colombia', 'Perú', 'Rep. Dominicana', 'Honduras', 'México', 'Costa Rica', 'Guatemala', 'España', 'Saint Lucia', 'Jamaica', 'Antigua & Barbuda', 'Brasil', 'Estados Unidos', 'Alemania']

// Mapeo de país a tipo de identificación fiscal
const PAIS_TIPO_ID = {
  'Argentina': 'CUIT', 'Uruguay': 'RUT', 'Chile': 'RUT', 'Colombia': 'NIT',
  'Perú': 'RUC', 'Rep. Dominicana': 'RNC', 'Honduras': 'RTN', 'México': 'RFC',
  'Costa Rica': 'CEDULA JURIDICA', 'Guatemala': 'NIT', 'España': 'CIF',
  'Saint Lucia': 'ID', 'Jamaica': 'TRN', 'Antigua & Barbuda': 'ID', 'Brasil': 'CNPJ', 'Estados Unidos': 'EIN', 'Alemania': 'ID'
}

const PAIS_POR_CODIGO = {
  AR: 'Argentina', UY: 'Uruguay', BR: 'Brasil', CL: 'Chile',
  CO: 'Colombia', PE: 'Perú', DO: 'Rep. Dominicana', HN: 'Honduras',
  CR: 'Costa Rica', GT: 'Guatemala', MX: 'México', ES: 'España',
  JM: 'Jamaica', LC: 'Saint Lucia', AG: 'Antigua & Barbuda',
  US: 'Estados Unidos', DE: 'Alemania'
}

const PER_PAGE = 5

export default function PedidosSolicitudesView({ isAdmin, onIniciarInforme, onNuevoInforme }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [paisFilter, setPaisFilter] = useState('all')
  const [origenFilter, setOrigenFilter] = useState('all') // 'all', 'analista', 'usuario'
  const [stats, setStats] = useState({})
  const [paises, setPaises] = useState({})
  const [detalle, setDetalle] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 })
  const [downloading, setDownloading] = useState(null)
  const searchTimerRef = useRef(null)

  // Filtros avanzados
  const [showFiltrosAvanzados, setShowFiltrosAvanzados] = useState(false)
  const [filtroSolicitante, setFiltroSolicitante] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [clientesFiltro, setClientesFiltro] = useState([])
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  // Modal Nueva Solicitud
  const [showNuevaSolicitud, setShowNuevaSolicitud] = useState(false)
  const [modalStep, setModalStep] = useState(1)
  const [clientes, setClientes] = useState([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [empresaSearch, setEmpresaSearch] = useState('')
  const [empresaData, setEmpresaData] = useState({ razon_social: '', cuit: '', pais: 'Argentina', tipo_identificacion: 'CUIT' })
  const [empresaExistente, setEmpresaExistente] = useState(false) // true si viene de BD (no editable)
  const [searchingEmpresa, setSearchingEmpresa] = useState(false)
  const [empresasEncontradas, setEmpresasEncontradas] = useState([])
  const [creandoSolicitud, setCreandoSolicitud] = useState(false)
  const [prioridadSeleccionada, setPrioridadSeleccionada] = useState('normal')
  const [modalSearchType, setModalSearchType] = useState('all') // 'all', 'cuit', 'nombre'
  const [modalCountryFilter, setModalCountryFilter] = useState('all')
  const [modalCountryOpen, setModalCountryOpen] = useState(false)
  const [paisesEmpresas, setPaisesEmpresas] = useState([]) // Países disponibles en empresas
  const countryDropdownRef = useRef(null)

  // Dropdown de acciones y modales
  const [actionDropdownId, setActionDropdownId] = useState(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const [modalAccion, setModalAccion] = useState(null) // 'cancelar', 'devolver', 'reabrir', 'aceptar', 'completar', 'continuar'
  const [solicitudAccion, setSolicitudAccion] = useState(null)
  const [motivoAccion, setMotivoAccion] = useState('')
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const dropdownRef = useRef(null)

  // Abrir dropdown y calcular posición
  const handleOpenDropdown = (e, solId) => {
    if (actionDropdownId === solId) {
      setActionDropdownId(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setDropdownPosition({
      top: rect.top - 8, // Posición arriba del botón
      right: window.innerWidth - rect.right
    })
    setActionDropdownId(solId)
  }

  const resolvePaisNombre = (paisNombre, codigoPais) => {
    const code = String(codigoPais || '').toUpperCase()
    if (code && PAIS_POR_CODIGO[code]) return PAIS_POR_CODIGO[code]
    return paisNombre || 'Argentina'
  }

  const inferPaisDisplay = (sol) => {
    const resolvedByCode = resolvePaisNombre(sol.pais, sol.codigo_pais)
    if (resolvedByCode && resolvedByCode !== 'Argentina') return resolvedByCode

    // Primero usar el país guardado si existe
    if (sol.pais && sol.pais !== 'Argentina') return sol.pais
    
    const tipo = (sol.tipo_identificacion || '').toUpperCase()
    // Si es tipo ID genérico, usar el país guardado o 'Internacional'
    if (tipo === 'ID') {
      if ((sol.pais || '').toLowerCase() === 'argentina') return 'Internacional'
      return sol.pais || 'Internacional'
    }
    if (tipo === 'RNC') return 'Rep. Dominicana'
    if (tipo === 'RUC') return 'Perú'
    if (tipo === 'RUT') return 'Uruguay'
    if (tipo === 'CUIT') return sol.pais || 'Argentina'
    if (tipo === 'NIT') return 'Colombia'
    if (tipo === 'RTN') return 'Honduras'
    if (tipo === 'CEDULA JURIDICA') return 'Costa Rica'
    if (tipo === 'DPI') return 'Guatemala'
    const digits = (sol.cuit || '').replace(/\D/g, '')
    if (digits.length === 12) return 'Uruguay'
    if (digits.length === 9) return 'Rep. Dominicana'
    return sol.pais || 'Argentina'
  }

  // Key para forzar recargas
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  // Cargar clientes para filtro al inicio
  useEffect(() => {
    const loadClientesFiltro = async () => {
      try {
        const res = await axios.get('/api/admin/usuarios-pedidos', { params: { per_page: 500 } })
        if (res.data.success && res.data.usuarios) {
          setClientesFiltro(res.data.usuarios)
        }
      } catch { /* ignore */ }
    }
    loadClientesFiltro()
  }, [])

  const reloadStats = async () => {
    try {
      const statsParams = new URLSearchParams()
      if (origenFilter !== 'all') statsParams.set('origen', origenFilter)
      const res = await axios.get(`/api/pedidos-solicitudes/stats?${statsParams}`)
      if (res.data.success) {
        setStats(res.data.stats)
        setPaises(res.data.paises || {})
      }
    } catch { /* ignore */ }
  }

  // Cargar datos cuando cambian filtros, página o reloadKey
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filtroEstado) params.set('estado', filtroEstado)
        if (busqueda.trim()) params.set('q', busqueda.trim())
        if (paisFilter !== 'all') params.set('pais', paisFilter)
        if (origenFilter !== 'all') params.set('origen', origenFilter)
        if (filtroSolicitante.trim()) params.set('solicitante', filtroSolicitante.trim())
        if (filtroCliente) params.set('cliente_id', filtroCliente)
        if (filtroEmpresa.trim()) params.set('empresa', filtroEmpresa.trim())
        if (filtroFechaInicio) params.set('fecha_inicio', filtroFechaInicio)
        if (filtroFechaFin) params.set('fecha_fin', filtroFechaFin)
        if (filtroMes) params.set('mes', filtroMes)
        params.set('page', page)
        params.set('per_page', PER_PAGE)

        // Stats params (solo origen)
        const statsParams = new URLSearchParams()
        if (origenFilter !== 'all') statsParams.set('origen', origenFilter)

        const responses = await Promise.all([
          axios.get(`/api/pedidos-solicitudes?${params}`),
          axios.get(`/api/pedidos-solicitudes/stats?${statsParams}`)
        ])

        if (responses[0].data.success) {
          setSolicitudes(responses[0].data.solicitudes)
          setPagination(responses[0].data.pagination || { total: 0, total_pages: 1 })
        }
        if (responses[1]?.data?.success) {
          setStats(responses[1].data.stats)
          setPaises(responses[1].data.paises || {})
        }
      } catch {
        toast.error('Error al cargar solicitudes')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filtroEstado, paisFilter, origenFilter, busqueda, page, reloadKey, filtroSolicitante, filtroCliente, filtroEmpresa, filtroFechaInicio, filtroFechaFin, filtroMes])

  const actualizarEstado = async (id, nuevoEstado, motivo = null) => {
    try {
      const payload = { estado: nuevoEstado }
      if (motivo) payload.motivo_cambio = motivo
      const res = await axios.put(`/api/pedidos-solicitudes/${id}`, payload)
      if (res.data.success) {
        toast.success(`Solicitud actualizada a: ${ESTADO_CONFIG[nuevoEstado]?.label}`)
        reload()
        reloadStats()
        if (detalle?.id === id) setDetalle(prev => ({ ...prev, estado: nuevoEstado }))
      }
    } catch {
      toast.error('Error al actualizar')
    }
  }

  // Ejecutar acción desde modal
  const ejecutarAccionModal = async () => {
    if (!solicitudAccion) return
    setProcesandoAccion(true)
    try {
      // Si es continuar, llamar a onIniciarInforme directamente
      if (modalAccion === 'continuar') {
        if (onIniciarInforme) await onIniciarInforme({ ...solicitudAccion, solicitud_source: 'pedidos-solicitudes' })
        setModalAccion(null)
        setSolicitudAccion(null)
        setMotivoAccion('')
        return
      }
      
      let nuevoEstado = ''
      if (modalAccion === 'cancelar') nuevoEstado = 'cancelada'
      else if (modalAccion === 'devolver') nuevoEstado = 'pendiente'
      else if (modalAccion === 'reabrir') nuevoEstado = 'pendiente'
      else if (modalAccion === 'aceptar') nuevoEstado = 'en_proceso'
      else if (modalAccion === 'completar') nuevoEstado = 'completada'
      
      await actualizarEstado(solicitudAccion.id, nuevoEstado, motivoAccion || null)
      setModalAccion(null)
      setSolicitudAccion(null)
      setMotivoAccion('')
    } catch {
      toast.error('Error al ejecutar acción')
    } finally {
      setProcesandoAccion(false)
    }
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActionDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const actualizarPrioridad = async (id, prioridad) => {
    try {
      await axios.put(`/api/pedidos-solicitudes/${id}`, { prioridad })
      reload()
    } catch {
      toast.error('Error al actualizar prioridad')
    }
  }

  const goToPage = (p) => {
    if (p >= 1 && p <= pagination.total_pages) {
      setPage(p)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleExport = async (format) => {
    setDownloading(format)
    try {
      const params = new URLSearchParams({ format })
      if (filtroEstado) params.set('estado', filtroEstado)
      if (busqueda.trim()) params.set('q', busqueda.trim())
      if (paisFilter !== 'all') params.set('pais', paisFilter)
      if (origenFilter !== 'all') params.set('origen', origenFilter)
      const res = await axios.get(`/api/pedidos-solicitudes/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `solicitudes.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} descargado`)
    } catch {
      toast.error('Error al descargar')
    } finally {
      setDownloading(null)
    }
  }

  // Cargar clientes para el modal
  const loadClientes = async () => {
    setLoadingClientes(true)
    try {
      const res = await axios.get('/api/admin/usuarios-pedidos', { params: { per_page: 200 } })
      if (res.data.success) {
        setClientes(res.data.usuarios || [])
      }
    } catch (err) {
      console.error('Error loading clientes:', err)
    }
    setLoadingClientes(false)
  }

  // Cargar países disponibles de empresas
  const loadPaisesEmpresas = async () => {
    try {
      const res = await axios.get('/api/empresas/paises')
      if (res.data.success && res.data.paises) {
        setPaisesEmpresas(res.data.paises)
      }
    } catch {
      // Fallback a lista principal si falla
      setPaisesEmpresas(['Argentina', 'Uruguay', 'Perú', 'Rep. Dominicana', 'Honduras', 'México', 'Colombia', 'Costa Rica', 'Guatemala', 'Jamaica', 'Saint Lucia', 'Antigua & Barbuda'])
    }
  }

  // Buscar empresa por CUIT o razón social
  const buscarEmpresa = async (searchValue = empresaSearch) => {
    // Permitir búsqueda solo por país (sin texto)
    const hasText = searchValue && searchValue.trim().length >= 2
    const hasCountry = modalCountryFilter !== 'all'
    const taxIdQuery = String(searchValue || '').toUpperCase().replace(/[^0-9K]/g, '')
    
    if (!hasText && !hasCountry) return
    
    setSearchingEmpresa(true)
    setEmpresasEncontradas([])
    setEmpresaData({ razon_social: '', cuit: '', pais: modalCountryFilter !== 'all' ? modalCountryFilter : 'Argentina', tipo_identificacion: PAIS_TIPO_ID[modalCountryFilter] || 'CUIT' })
    setEmpresaExistente(false)
    try {
      // Buscar en nuestra BD con filtros
      const queryTerm = hasText
        ? (modalSearchType === 'cuit' && taxIdQuery ? taxIdQuery : searchValue.trim())
        : '*'
      const params = { 
        q: queryTerm, // Para CUIT/RUT usar término normalizado y evitar fallas por puntos/guiones
        limit: 50,
        pais: modalCountryFilter !== 'all' ? modalCountryFilter : undefined
      }
      const res = await axios.get('/api/search', { params })
      let resultados = res.data.empresas || []
      
      // Filtrar por tipo de búsqueda en frontend si es necesario
      if (hasText && modalSearchType === 'cuit') {
        resultados = resultados.filter(e => {
          const companyId = String(e.cuit || '').toUpperCase().replace(/[^0-9K]/g, '')
          return companyId.includes(taxIdQuery)
        })
      } else if (hasText && modalSearchType === 'nombre') {
        const term = searchValue.toLowerCase()
        resultados = resultados.filter(e => (e.razon_social || '').toLowerCase().includes(term))
      }
      
      if (resultados.length > 0) {
        setEmpresasEncontradas(resultados)
      } else if (hasText) {
        // No encontrada y hay texto, permitir crear nueva (campos editables)
        const paisNuevo = modalCountryFilter !== 'all' ? modalCountryFilter : 'Argentina'
        setEmpresaData({
          razon_social: searchValue.trim(),
          cuit: '',
          pais: paisNuevo,
          tipo_identificacion: PAIS_TIPO_ID[paisNuevo] || 'ID'
        })
        setEmpresaExistente(false)
      }
    } catch (err) {
      console.error('Error buscando empresa:', err)
    }
    setSearchingEmpresa(false)
  }
  
  // Efecto para buscar al escribir (debounced) o cambiar filtro de país
  const searchTimerModalRef = useRef(null)
  useEffect(() => {
    if (modalStep !== 2) return
    const hasText = empresaSearch && empresaSearch.trim().length >= 2
    const hasCountry = modalCountryFilter !== 'all'
    if (!hasText && !hasCountry) return
    
    clearTimeout(searchTimerModalRef.current)
    searchTimerModalRef.current = setTimeout(() => {
      buscarEmpresa()
    }, 400)
    return () => clearTimeout(searchTimerModalRef.current)
  }, [empresaSearch, modalSearchType, modalCountryFilter, modalStep])
  
  // Cerrar dropdown de países al clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setModalCountryOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const seleccionarEmpresa = (emp) => {
    const paisResuelto = resolvePaisNombre(emp.pais, emp.codigo_pais)
    setEmpresaData({
      razon_social: emp.razon_social || '',
      cuit: emp.cuit || '',
      pais: paisResuelto,
      tipo_identificacion: emp.tipo_identificacion || PAIS_TIPO_ID[paisResuelto] || 'ID'
    })
    setEmpresaExistente(true) // Viene de BD, no editable
    setEmpresasEncontradas([])
  }

  // Mostrar modal de confirmación antes de crear
  const [showConfirmacion, setShowConfirmacion] = useState(false)
  
  // Abrir confirmación antes de crear
  const abrirConfirmacion = () => {
    if (!clienteSeleccionado || !empresaData.razon_social) {
      toast.error('Seleccioná un cliente y una empresa')
      return
    }
    setShowConfirmacion(true)
  }
  
  // Crear solicitud
  const crearNuevaSolicitud = async () => {
    if (!clienteSeleccionado || !empresaData.razon_social) {
      toast.error('Seleccioná un cliente y una empresa')
      return
    }
    setCreandoSolicitud(true)
    try {
      const res = await axios.post('/api/pedidos-solicitudes', {
        cuit: empresaData.cuit || '',
        razon_social: empresaData.razon_social,
        pais: empresaData.pais || 'Argentina',
        tipo_identificacion: empresaData.tipo_identificacion || PAIS_TIPO_ID[empresaData.pais] || 'ID',
        tipo_informe: 'completo',
        prioridad: prioridadSeleccionada,
        notas: `Solicitud creada por analista para cliente: ${clienteSeleccionado.numero_abono || clienteSeleccionado.id} - ${clienteSeleccionado.nombre_completo}`,
        cliente_id: clienteSeleccionado.id
      })
      if (res.data.success) {
        toast.success('Solicitud creada exitosamente')
        setShowConfirmacion(false)
        setShowNuevaSolicitud(false)
        resetModal()
        reload()
        reloadStats()
      } else {
        toast.error(res.data.error || 'Error al crear solicitud')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear solicitud')
    }
    setCreandoSolicitud(false)
  }

  const resetModal = () => {
    setModalStep(1)
    setClienteSeleccionado(null)
    setClienteSearch('')
    setEmpresaSearch('')
    setEmpresaData({ razon_social: '', cuit: '', pais: 'Argentina', tipo_identificacion: 'CUIT' })
    setEmpresaExistente(false)
    setEmpresasEncontradas([])
    setModalSearchType('all')
    setModalCountryFilter('all')
    setModalCountryOpen(false)
    setPrioridadSeleccionada('normal')
    setShowConfirmacion(false)
  }

  const openNuevaSolicitudModal = () => {
    resetModal()
    loadClientes()
    loadPaisesEmpresas()
    setShowNuevaSolicitud(true)
  }

  const clientesFiltrados = clientes.filter(c => {
    if (!clienteSearch.trim()) return true
    const search = clienteSearch.toLowerCase()
    return (
      (c.nombre_completo || '').toLowerCase().includes(search) ||
      (c.numero_abono || '').toLowerCase().includes(search) ||
      (c.razon_social_cliente || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search)
    )
  })

  // Total para "Todas" es la suma de todos los estados relevantes
  const totalTodas = (stats.pendiente || 0) + (stats.en_proceso || 0) + (stats.completada || 0) + (stats.cancelada || 0)
  const paisesDisponibles = Object.entries(paises).sort((a, b) => b[1] - a[1])

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Solicitudes</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botones de acción */}
          {onNuevoInforme && (
            <button
              onClick={onNuevoInforme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              title="Crear nuevo informe en blanco"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Nuevo Informe
            </button>
          )}
          <button
            onClick={openNuevaSolicitudModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            title="Nueva solicitud para un cliente"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Nueva Solicitud
          </button>
          <span className="text-xs text-gray-400 hidden sm:inline ml-2"><Download className="h-3 w-3 inline mr-1" />Exportar:</span>
          <button
            onClick={() => handleExport('csv')}
            disabled={!!downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            title="Descargar Excel/CSV"
          >
            {downloading === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            title="Descargar PDF"
          >
            {downloading === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            PDF
          </button>
        </div>
      </div>

      {/* Tabs de Origen */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'analista', label: 'Por Analistas' },
          { key: 'usuario', label: 'Por Usuarios' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setOrigenFilter(tab.key); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              origenFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
        {[
          { key: '', label: 'Todas', count: totalTodas, bg: 'bg-gray-50 border-gray-200' },
          { key: 'pendiente', label: 'Pendientes', count: stats.pendiente || 0, bg: 'bg-yellow-50 border-yellow-200' },
          { key: 'en_proceso', label: 'En Proceso', count: stats.en_proceso || 0, bg: 'bg-blue-50 border-blue-200' },
          { key: 'completada', label: 'Completadas', count: stats.completada || 0, bg: 'bg-green-50 border-green-200' },
          { key: 'cancelada', label: 'Canceladas', count: stats.cancelada || 0, bg: 'bg-red-50 border-red-200' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => { setFiltroEstado(s.key); setPage(1) }}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${s.bg} ${filtroEstado === s.key ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:shadow-sm'}`}
          >
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{s.count.toLocaleString()}</p>
            <p className="text-xs text-gray-500 truncate">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Buscador y filtro de país */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por CUIT o razón social..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <select
            value={paisFilter}
            onChange={(e) => { setPaisFilter(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">Todos los países</option>
            {paisesDisponibles.map(([p, count]) => (
              <option key={p} value={p}>{p} ({count.toLocaleString()})</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowFiltrosAvanzados(!showFiltrosAvanzados)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${
            showFiltrosAvanzados || filtroSolicitante || filtroEmpresa || filtroFechaInicio || filtroFechaFin || filtroMes
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(filtroSolicitante || filtroEmpresa || filtroFechaInicio || filtroFechaFin || filtroMes) && (
            <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {[filtroSolicitante, filtroCliente, filtroEmpresa, filtroFechaInicio, filtroFechaFin, filtroMes].filter(Boolean).length}
            </span>
          )}
        </button>
        <p className="text-xs text-gray-400 self-center">
          {pagination.total.toLocaleString()} resultado{pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Panel de Filtros Avanzados */}
      {showFiltrosAvanzados && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros Avanzados
            </h4>
            <button
              onClick={() => {
                setFiltroSolicitante('')
                setFiltroCliente('')
                setFiltroEmpresa('')
                setFiltroFechaInicio('')
                setFiltroFechaFin('')
                setFiltroMes('')
                setPage(1)
              }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar filtros
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Solicitante */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Solicitado por</label>
              <select
                value={filtroSolicitante}
                onChange={(e) => { setFiltroSolicitante(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todos</option>
                {clientesFiltro.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} {c.numero_abono ? `(${c.numero_abono})` : c.id_interno ? `(${c.id_interno})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Cliente */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente</label>
              <select
                value={filtroCliente}
                onChange={(e) => { setFiltroCliente(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todos</option>
                {clientesFiltro.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} {c.numero_abono ? `(${c.numero_abono})` : c.id_interno ? `(${c.id_interno})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Empresa */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Empresa</label>
              <input
                type="text"
                value={filtroEmpresa}
                onChange={(e) => { setFiltroEmpresa(e.target.value); setPage(1) }}
                placeholder="Razón social..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* Fecha Inicio */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={(e) => { setFiltroFechaInicio(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* Fecha Fin */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={(e) => { setFiltroFechaFin(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* Mes */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mes</label>
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => { setFiltroMes(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Solicitudes */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <ExternalLink className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay solicitudes {filtroEstado ? `con estado "${ESTADO_CONFIG[filtroEstado]?.label}"` : ''}{busqueda ? ` para "${busqueda}"` : ''}</p>
        </div>
      ) : (
        <>
        <div className="bg-white rounded-xl border">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Identificador</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo Informe</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridad</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Solicitado por</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha Inicio</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha Fin</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.map(sol => {
                  const estadoCfg = ESTADO_CONFIG[sol.estado] || ESTADO_CONFIG.pendiente
                  const EstadoIcon = estadoCfg.icon
                  const pais = inferPaisDisplay(sol)
                  const esApi = sol.tipo_solicitud === 'api' || (sol.notas || '').toLowerCase().includes('solicitar api')
                  const puedeCompletar = Boolean(sol.empresa_id || sol.empresa_modelo_id)

                  const formatFecha = (fecha) => {
                    if (!fecha) return '-'
                    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  }

                  const fechaFin = sol.fecha_fin || (sol.estado === 'completada' || sol.estado === 'cancelada' ? sol.updated_at : null)

                  return (
                    <tr key={sol.id} className="hover:bg-gray-50 transition-colors">
                      {/* Empresa */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[250px]" title={sol.razon_social}>
                          {sol.razon_social || 'Sin razón social'}
                        </p>
                        <p className="text-xs text-gray-400">{pais}</p>
                      </td>
                      {/* Identificador */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-600">{sol.cuit || '-'}</div>
                        <div className="text-xs text-gray-400">{sol.tipo_identificacion || 'CUIT'}</div>
                      </td>
                      {/* Tipo de Informe */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          esApi
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sol.tipo_informe === 'basico' || sol.tipo_informe === 'express'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {esApi ? 'API' : sol.tipo_informe === 'basico' ? 'Básico' : sol.tipo_informe === 'express' ? 'Express' : 'Completo'}
                        </span>
                      </td>
                      {/* Prioridad */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          sol.prioridad === 'urgente'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : sol.prioridad === '72h'
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {sol.prioridad === 'urgente' ? '🔴 Urgente' : sol.prioridad === '72h' ? '🟠 72 Horas' : '🔵 Normal'}
                        </span>
                      </td>
                      {/* Solicitado por */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 truncate max-w-[140px]" title={sol.solicitante_nombre}>
                          {sol.solicitante_nombre || '?'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {sol.solicitante_rol && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              sol.solicitante_rol === 'admin' || sol.solicitante_rol === 'analista'
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {sol.solicitante_rol}
                            </span>
                          )}
                          {sol.solicitante_abono && sol.solicitante_rol !== 'admin' && sol.solicitante_rol !== 'analista' && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">
                              #{sol.solicitante_abono}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        {sol.cliente_nombre ? (
                            <div>
                              <p className="text-gray-700 truncate max-w-[140px]" title={sol.cliente_nombre}>
                                {sol.cliente_nombre}
                              </p>
                              {sol.cliente_abono && (
                                <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-mono">
                                  #{sol.cliente_abono}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                      </td>
                      {/* Fecha Inicio */}
                      <td className="px-4 py-3 text-gray-600">
                        {formatFecha(sol.created_at)}
                      </td>
                      {/* Fecha Fin */}
                      <td className="px-4 py-3 text-gray-600">
                        {formatFecha(fechaFin)}
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${estadoCfg.color}`}>
                          <EstadoIcon className="h-3 w-3" />
                          {estadoCfg.label}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetalle(sol)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <div className="relative" ref={actionDropdownId === sol.id ? dropdownRef : null}>
                            <button
                              onClick={(e) => handleOpenDropdown(e, sol.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                              <span>Acciones</span>
                            </button>
                            
                            {actionDropdownId === sol.id && (
                              <div 
                                className="fixed w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1"
                                style={{ 
                                  top: dropdownPosition.top, 
                                  right: dropdownPosition.right,
                                  transform: 'translateY(-100%)',
                                  zIndex: 9999
                                }}
                              >
                                {/* Opciones según estado */}
                                {sol.estado === 'pendiente' && (
                                  <>
                                    <button
                                      onClick={() => { setSolicitudAccion(sol); setModalAccion('aceptar'); setActionDropdownId(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
                                    >
                                      <ArrowRight className="h-4 w-4 text-green-500" />
                                      <span>Aceptar</span>
                                    </button>
                                    <button
                                      onClick={() => { setSolicitudAccion(sol); setModalAccion('cancelar'); setActionDropdownId(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4 text-red-500" />
                                      <span>Cancelar</span>
                                    </button>
                                  </>
                                )}
                                {sol.estado === 'en_proceso' && (
                                  <>
                                    {esApi ? (
                                      <button
                                        onClick={() => { setDetalle({ ...sol, _showApi: true }); setActionDropdownId(null) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50"
                                      >
                                        <Zap className="h-4 w-4 text-yellow-500" />
                                        <span>Ver API</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => { setSolicitudAccion(sol); setModalAccion('continuar'); setActionDropdownId(null) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                                      >
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <span>Continuar Informe</span>
                                      </button>
                                    )}
                                    {puedeCompletar && (
                                      <button
                                        onClick={() => { setSolicitudAccion(sol); setModalAccion('completar'); setActionDropdownId(null) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
                                      >
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>Completar</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => { setSolicitudAccion(sol); setModalAccion('devolver'); setActionDropdownId(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50"
                                    >
                                      <ArrowLeft className="h-4 w-4 text-orange-500" />
                                      <span>Devolver</span>
                                    </button>
                                    <div className="border-t border-gray-100 my-1" />
                                    <button
                                      onClick={() => { setSolicitudAccion(sol); setModalAccion('cancelar'); setActionDropdownId(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4 text-red-500" />
                                      <span>Cancelar</span>
                                    </button>
                                  </>
                                )}
                                {(sol.estado === 'completada' || sol.estado === 'cancelada') && (
                                  <button
                                    onClick={() => { setSolicitudAccion(sol); setModalAccion('reabrir'); setActionDropdownId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                                  >
                                    <RotateCw className="h-4 w-4 text-blue-500" />
                                    <span>Reabrir</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

          {/* Paginación */}
          {pagination.total_pages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl border px-4 sm:px-6 py-3 sm:py-4 gap-3">
              <div className="text-sm text-gray-600">
                {((page - 1) * PER_PAGE) + 1} – {Math.min(page * PER_PAGE, pagination.total)} de {pagination.total.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={`p-2 rounded-lg transition-colors ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {(() => {
                    const pages = []
                    const tp = pagination.total_pages
                    const delta = 2
                    const left = Math.max(2, page - delta)
                    const right = Math.min(tp - 1, page + delta)
                    pages.push(1)
                    if (left > 2) pages.push('...')
                    for (let i = left; i <= right; i++) pages.push(i)
                    if (right < tp - 1) pages.push('...')
                    if (tp > 1) pages.push(tp)
                    return pages.map((p, idx) =>
                      p === '...' ? (
                        <span key={`e${idx}`} className="min-w-[32px] h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`min-w-[32px] h-8 rounded-lg font-medium text-sm transition-colors ${
                            page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  })()}
                </div>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === pagination.total_pages}
                  className={`p-2 rounded-lg transition-colors ${page === pagination.total_pages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-semibold text-gray-900">Detalle de Solicitud</h3>
              <button onClick={() => setDetalle(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Badges de tipo y estado */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  detalle.tipo_informe === 'api' || (detalle.notas || '').toLowerCase().includes('solicitar api')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : detalle.tipo_informe === 'basico' || detalle.tipo_informe === 'express'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {detalle.tipo_informe === 'api' ? '⚡ API' : `📄 ${detalle.tipo_informe || 'Completo'}`}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ESTADO_CONFIG[detalle.estado]?.color || ''}`}>
                  {ESTADO_CONFIG[detalle.estado]?.label || detalle.estado}
                </span>
                {detalle.prioridad && detalle.prioridad !== 'normal' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    detalle.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                    detalle.prioridad === '72h' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {PRIORIDAD_CONFIG[detalle.prioridad]?.label || detalle.prioridad}
                  </span>
                )}
              </div>

              {/* Empresa */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-lg">{detalle.razon_social}</p>
                    <p className="text-sm text-gray-500">{detalle.cuit || 'Sin identificador'}</p>
                    {detalle.pais && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {detalle.pais}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información de la solicitud */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Solicitado por</p>
                  <p className="font-medium text-gray-900">{detalle.solicitante_nombre || '—'}</p>
                  <p className="text-xs text-gray-500">{detalle.solicitante_rol || ''} {detalle.solicitante_abono ? `#${detalle.solicitante_abono}` : ''}</p>
                </div>
                {detalle.cliente_nombre && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                    <p className="font-medium text-gray-900">{detalle.cliente_nombre}</p>
                    <p className="text-xs text-gray-500">{detalle.cliente_abono ? `#${detalle.cliente_abono}` : ''}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tipo Informe</p>
                  <p className="font-medium text-gray-900 capitalize">{detalle.tipo_informe || 'Completo'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prioridad</p>
                  <p className={`font-medium ${
                    detalle.prioridad === 'urgente' ? 'text-red-600' :
                    detalle.prioridad === '72h' ? 'text-orange-600' :
                    'text-blue-600'
                  }`}>
                    {detalle.prioridad === 'urgente' ? '🔴 Urgente' : detalle.prioridad === '72h' ? '🟠 72 Horas' : '🔵 Normal'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha Solicitud</p>
                  <p className="font-medium text-gray-900">
                    {detalle.created_at ? new Date(detalle.created_at).toLocaleDateString('es-AR') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha Finalización</p>
                  <p className="font-medium text-gray-900">
                    {(detalle.fecha_fin || ((detalle.estado === 'completada' || detalle.estado === 'cancelada') ? detalle.updated_at : null))
                      ? new Date(detalle.fecha_fin || detalle.updated_at).toLocaleDateString('es-AR')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Notas y Historial de cambios - Timeline con Acordeón */}
              {detalle.notas && (() => {
                const lineas = detalle.notas.split('\n').filter(l => l.trim())
                const notasIniciales = []
                const historial = []
                
                lineas.forEach(linea => {
                  const esHistorial = linea.match(/^\[(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\]\s+(.+?):\s+(.+)$/)
                  if (esHistorial) {
                    const [, fecha, hora, accion, motivo] = esHistorial
                    historial.push({ fecha, hora, accion, motivo })
                  } else {
                    notasIniciales.push(linea)
                  }
                })
                
                const getColorClasses = (accion) => {
                  const a = accion.toLowerCase()
                  if (a.includes('cancelar') || a.includes('cancelada')) 
                    return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', dot: 'bg-red-500' }
                  if (a.includes('devolver') || a.includes('pendiente')) 
                    return { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' }
                  if (a.includes('completar') || a.includes('completada')) 
                    return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', dot: 'bg-green-500' }
                  if (a.includes('aceptar') || a.includes('en proceso')) 
                    return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' }
                  return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }
                }
                
                return (
                  <div className="border-t pt-4">
                    <button 
                      onClick={() => setDetalle(prev => ({ ...prev, _historialOpen: !prev._historialOpen }))}
                      className="w-full flex items-center justify-between text-left mb-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                          Notas e Historial {historial.length > 0 && `(${historial.length} cambios)`}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${detalle._historialOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {detalle._historialOpen && (
                      <div className="space-y-3">
                        {/* Notas iniciales */}
                        {notasIniciales.length > 0 && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-xs font-medium text-blue-700">Nota inicial</span>
                            </div>
                            {notasIniciales.map((nota, idx) => (
                              <p key={idx} className="text-sm text-blue-800">{nota}</p>
                            ))}
                          </div>
                        )}
                        
                        {/* Timeline de historial */}
                        {historial.length > 0 && (
                          <div className="relative pl-4 border-l-2 border-gray-200 space-y-3">
                            {historial.map((item, idx) => {
                              const colors = getColorClasses(item.accion)
                              return (
                                <div key={idx} className="relative">
                                  {/* Dot en la línea */}
                                  <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${colors.dot} border-2 border-white shadow`} />
                                  
                                  {/* Card del evento */}
                                  <div className={`${colors.bg} ${colors.border} border rounded-lg p-2.5`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-xs font-semibold ${colors.text} uppercase`}>
                                        {item.accion}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        {item.fecha} • {item.hora}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{item.motivo}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Preview colapsado */}
                    {!detalle._historialOpen && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 truncate">
                        {notasIniciales[0] || (historial[historial.length - 1] && `Último: ${historial[historial.length - 1].accion} - ${historial[historial.length - 1].motivo}`)}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* PDF si está completada */}
              {detalle.estado === 'completada' && detalle.empresa_id && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Informe Generado</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('access_token')
                        // Pasar expediente, abonado, referencia y fecha de la solicitud específica
                        const params = new URLSearchParams({ lang: 'es', token })
                        if (detalle.expediente) params.append('expediente', detalle.expediente)
                        if (detalle.cliente_abono) params.append('abonado', detalle.cliente_abono)
                        params.append('referencia', detalle.referencia_cliente || '')
                        // Usar fecha de completado (updated_at cuando estado=completada) o fecha actual
                        const fechaCompletado = detalle.updated_at ? new Date(detalle.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                        params.append('fecha', fechaCompletado)
                        window.open(`/api/empresas/${detalle.empresa_id}/pdf?${params.toString()}`, '_blank')
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Español
                    </button>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('access_token')
                        const params = new URLSearchParams({ lang: 'en', token })
                        if (detalle.expediente) params.append('expediente', detalle.expediente)
                        if (detalle.cliente_abono) params.append('abonado', detalle.cliente_abono)
                        params.append('referencia', detalle.referencia_cliente || '')
                        const fechaCompletado = detalle.updated_at ? new Date(detalle.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                        params.append('fecha', fechaCompletado)
                        window.open(`/api/empresas/${detalle.empresa_id}/pdf?${params.toString()}`, '_blank')
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      English
                    </button>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('access_token')
                        const params = new URLSearchParams({ lang: 'de', token })
                        if (detalle.expediente) params.append('expediente', detalle.expediente)
                        if (detalle.cliente_abono) params.append('abonado', detalle.cliente_abono)
                        params.append('referencia', detalle.referencia_cliente || '')
                        const fechaCompletado = detalle.updated_at ? new Date(detalle.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                        params.append('fecha', fechaCompletado)
                        window.open(`/api/empresas/${detalle.empresa_id}/pdf?${params.toString()}`, '_blank')
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Deutsch
                    </button>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t">
                <span>Creado: {detalle.created_at ? new Date(detalle.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                {detalle.updated_at && detalle.updated_at !== detalle.created_at && (
                  <span>Actualizado: {new Date(detalle.updated_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>

              {/* Preview estructura API si es tipo API */}
              {detalle._showApi && (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <p className="text-xs text-emerald-400 font-semibold mb-2">Estructura JSON que recibirá el cliente vía API:</p>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify({
                    success: true,
                    data: {
                      tax_id: detalle.cuit,
                      company_name: detalle.razon_social || null,
                      score: null,
                      risk_level: null,
                      rating: null,
                      source: 'api_request'
                    }
                  }, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Solicitud */}
      {showNuevaSolicitud && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowNuevaSolicitud(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nueva Solicitud</h3>
                  <p className="text-sm text-gray-500">
                    {modalStep === 1 ? 'Paso 1: Seleccionar cliente' : 'Paso 2: Buscar empresa'}
                  </p>
                </div>
                <button onClick={() => setShowNuevaSolicitud(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-2 rounded-full ${modalStep >= 1 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${modalStep >= 2 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              </div>

              {/* Step 1: Seleccionar Cliente */}
              {modalStep === 1 && (
                <div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, abono, empresa..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {loadingClientes ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                      {clientesFiltrados.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 text-sm">No hay clientes disponibles</p>
                      ) : (
                        clientesFiltrados.slice(0, 20).map(cliente => (
                          <label
                            key={cliente.id}
                            className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${clienteSeleccionado?.id === cliente.id ? 'bg-indigo-50' : ''}`}
                          >
                            <input
                              type="radio"
                              name="cliente"
                              checked={clienteSeleccionado?.id === cliente.id}
                              onChange={() => setClienteSeleccionado(cliente)}
                              className="text-indigo-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                  {cliente.numero_abono || cliente.id_interno || `#${cliente.id}`}
                                </span>
                                <span className="font-medium text-gray-900 truncate">
                                  {cliente.nombre_completo}
                                  {cliente.proveedor_nombre && <span className="text-gray-500 font-normal"> ({cliente.proveedor_nombre})</span>}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setModalStep(2)}
                      disabled={!clienteSeleccionado}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Buscar Empresa */}
              {modalStep === 2 && (
                <div>
                  {/* Info del cliente seleccionado con X para cambiar */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 relative">
                    <button
                      onClick={() => { setClienteSeleccionado(null); setModalStep(1) }}
                      className="absolute top-2 right-2 p-1 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Cambiar cliente"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-indigo-600 font-medium">Cliente seleccionado:</p>
                    <p className="text-sm font-semibold text-indigo-900 pr-6">
                      {clienteSeleccionado?.numero_abono || clienteSeleccionado?.id_interno} - {clienteSeleccionado?.nombre_completo}
                    </p>
                    {clienteSeleccionado?.razon_social_cliente && (
                      <p className="text-xs text-indigo-700">{clienteSeleccionado.razon_social_cliente}</p>
                    )}
                  </div>

                  {/* Buscador estilo SearchView */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    {/* Input de búsqueda */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Búsqueda por empresas, CUIT/RNC/RUT, nombre de la empresa o actividad comercial."
                        value={empresaSearch}
                        onChange={(e) => setEmpresaSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarEmpresa()}
                        className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors"
                      />
                      {empresaSearch && !searchingEmpresa && (
                        <button
                          onClick={() => { setEmpresaSearch(''); setEmpresasEncontradas([]) }}
                          className="absolute right-3 top-3 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {searchingEmpresa && (
                        <Loader2 className="absolute right-3 top-3 h-5 w-5 text-red-500 animate-spin" />
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <button
                        onClick={() => { setModalSearchType('all'); setModalCountryFilter('all') }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          modalSearchType === 'all' && modalCountryFilter === 'all'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <Filter className="inline h-3.5 w-3.5 mr-1" />
                        Todos
                      </button>
                      <button
                        onClick={() => setModalSearchType('cuit')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          modalSearchType === 'cuit'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        CUIT/RNC
                      </button>
                      <button
                        onClick={() => setModalSearchType('nombre')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          modalSearchType === 'nombre'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        Nombre
                      </button>
                      
                      {/* Country Filter Dropdown */}
                      <div className="relative" ref={countryDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setModalCountryOpen(!modalCountryOpen)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                            modalCountryFilter !== 'all'
                              ? 'bg-red-600 text-white shadow-md'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {modalCountryFilter !== 'all' && COUNTRY_ISO[modalCountryFilter] ? (
                            <img src={`https://flagcdn.com/20x15/${COUNTRY_ISO[modalCountryFilter]}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover" />
                          ) : (
                            <Globe className="h-3.5 w-3.5" />
                          )}
                          {modalCountryFilter !== 'all' ? modalCountryFilter : 'Por Países'}
                          {modalCountryFilter !== 'all' ? (
                            <span
                              onClick={(e) => { e.stopPropagation(); setModalCountryFilter('all'); setModalCountryOpen(false); setEmpresasEncontradas([]) }}
                              className="ml-0.5 p-0.5 rounded hover:bg-red-700 transition-colors cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          ) : (
                            <ChevronDown className={`h-3 w-3 transition-transform ${modalCountryOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                        {modalCountryOpen && (
                          <div className="absolute z-50 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                            <div className="max-h-56 overflow-y-auto">
                              {(paisesEmpresas.length > 0 ? paisesEmpresas : PAISES_DISPONIBLES).map(pais => {
                                const code = COUNTRY_ISO[pais]
                                return (
                                  <button
                                    key={pais}
                                    onClick={() => { setModalCountryFilter(pais); setModalCountryOpen(false) }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-red-50 transition-colors ${modalCountryFilter === pais ? 'bg-red-50 font-semibold text-red-700' : 'text-gray-700'}`}
                                  >
                                    {code ? (
                                      <img src={`https://flagcdn.com/20x15/${code}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover" />
                                    ) : (
                                      <Globe className="h-3.5 w-3.5 text-gray-400" />
                                    )}
                                    {pais}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Limpiar filtros */}
                      {(modalSearchType !== 'all' || modalCountryFilter !== 'all' || empresaSearch) && (
                        <button
                          onClick={() => {
                            setModalSearchType('all')
                            setModalCountryFilter('all')
                            setEmpresaSearch('')
                            setEmpresasEncontradas([])
                            setEmpresaData({ razon_social: '', cuit: '', pais: 'Argentina', tipo_identificacion: 'CUIT' })
                            setEmpresaExistente(false)
                          }}
                          className="ml-auto px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resultados de búsqueda */}
                  {empresasEncontradas.length > 0 && (
                    <div className="mb-4">
                      {empresasEncontradas.length >= 50 && (
                        <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          Mostrando primeras 50 empresas. Usa el buscador para filtrar.
                        </p>
                      )}
                      <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto">
                        {empresasEncontradas.map((emp, idx) => {
                          const empPais = resolvePaisNombre(emp.pais, emp.codigo_pais)
                          const code = COUNTRY_ISO[empPais]
                          return (
                            <button
                              key={idx}
                              onClick={() => seleccionarEmpresa(emp)}
                              className="w-full text-left p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex items-center gap-3"
                            >
                              {code && (
                                <img src={`https://flagcdn.com/24x18/${code}.png`} alt="" className="w-6 h-4 rounded-sm object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{emp.razon_social}</p>
                                <p className="text-xs text-gray-500">{emp.cuit} • {empPais}</p>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${emp.source === 'empresa' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {emp.source === 'empresa' ? 'Empresa' : 'Solicitud'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Datos de la empresa seleccionada o a crear */}
                  {empresaData.razon_social && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 font-medium">Empresa a investigar:</p>
                        {empresaExistente && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Existente en BD</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Razón Social</label>
                          <input
                            type="text"
                            value={empresaData.razon_social}
                            onChange={(e) => !empresaExistente && setEmpresaData(prev => ({ ...prev, razon_social: e.target.value }))}
                            disabled={empresaExistente}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm mt-1 ${empresaExistente ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' : 'border-gray-200'}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">CUIT/RUT/NIT</label>
                          <input
                            type="text"
                            value={empresaData.cuit}
                            onChange={(e) => !empresaExistente && setEmpresaData(prev => ({ ...prev, cuit: e.target.value }))}
                            disabled={empresaExistente}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm mt-1 ${empresaExistente ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' : 'border-gray-200'}`}
                            placeholder={empresaExistente ? '' : 'Opcional'}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">País</label>
                          <select
                            value={empresaData.pais}
                            onChange={(e) => !empresaExistente && setEmpresaData(prev => ({ ...prev, pais: e.target.value }))}
                            disabled={empresaExistente}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm mt-1 ${empresaExistente ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' : 'border-gray-200'}`}
                          >
                            <option value="Argentina">Argentina</option>
                            <option value="Uruguay">Uruguay</option>
                            <option value="Chile">Chile</option>
                            <option value="Colombia">Colombia</option>
                            <option value="Perú">Perú</option>
                            <option value="México">México</option>
                            <option value="Rep. Dominicana">Rep. Dominicana</option>
                            <option value="Honduras">Honduras</option>
                            <option value="Costa Rica">Costa Rica</option>
                            <option value="Guatemala">Guatemala</option>
                            <option value="España">España</option>
                            <option value="Antigua & Barbuda">Antigua & Barbuda</option>
                          </select>
                        </div>
                        {/* Selector de Prioridad */}
                        <div>
                          <label className="text-xs text-gray-500">Prioridad</label>
                          <select
                            value={prioridadSeleccionada}
                            onChange={(e) => setPrioridadSeleccionada(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1"
                          >
                            <option value="normal">Normal</option>
                            <option value="72h">72 Horas</option>
                            <option value="urgente">Urgente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={abrirConfirmacion}
                      disabled={creandoSolicitud || !empresaData.razon_social}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Crear Solicitud
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Solicitud */}
      {showConfirmacion && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setShowConfirmacion(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirmar Solicitud</h3>
                  <p className="text-sm text-gray-500">Revisá los datos antes de continuar</p>
                </div>
              </div>

              {/* Datos de la solicitud */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Cliente:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {clienteSeleccionado?.numero_abono || clienteSeleccionado?.id_interno} - {clienteSeleccionado?.nombre_completo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Empresa:</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={empresaData.razon_social}>
                    {empresaData.razon_social}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">CUIT/ID:</span>
                  <span className="text-sm font-mono text-gray-700">{empresaData.cuit || 'No especificado'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">País:</span>
                  <span className="text-sm text-gray-700">{empresaData.pais}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-gray-500 font-medium">Prioridad:</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    prioridadSeleccionada === 'urgente' ? 'bg-red-100 text-red-700' :
                    prioridadSeleccionada === '72h' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {prioridadSeleccionada === 'urgente' ? '🔴 URGENTE' : 
                     prioridadSeleccionada === '72h' ? '🟠 72 HORAS' : 
                     '🔵 NORMAL'}
                  </span>
                </div>
              </div>

              {/* Advertencia de prioridad */}
              {prioridadSeleccionada !== 'normal' && (
                <div className={`p-3 rounded-lg mb-4 ${
                  prioridadSeleccionada === 'urgente' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <p className={`text-xs ${prioridadSeleccionada === 'urgente' ? 'text-red-700' : 'text-orange-700'}`}>
                    ⚠️ Esta solicitud tiene prioridad <strong>{prioridadSeleccionada === 'urgente' ? 'URGENTE' : '72 HORAS'}</strong>. 
                    Se aplicarán los costos correspondientes.
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmacion(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={crearNuevaSolicitud}
                  disabled={creandoSolicitud}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creandoSolicitud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acción (Cancelar/Devolver/Reabrir) */}
      {modalAccion && solicitudAccion && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => { setModalAccion(null); setSolicitudAccion(null); setMotivoAccion('') }} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                {modalAccion === 'cancelar' && (
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                )}
                {modalAccion === 'devolver' && (
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ArrowLeft className="h-6 w-6 text-orange-600" />
                  </div>
                )}
                {modalAccion === 'reabrir' && (
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <RotateCw className="h-6 w-6 text-blue-600" />
                  </div>
                )}
                {modalAccion === 'aceptar' && (
                  <div className="p-3 bg-green-100 rounded-xl">
                    <ArrowRight className="h-6 w-6 text-green-600" />
                  </div>
                )}
                {modalAccion === 'completar' && (
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                )}
                {modalAccion === 'continuar' && (
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {modalAccion === 'cancelar' && 'Cancelar Solicitud'}
                    {modalAccion === 'devolver' && 'Devolver Solicitud'}
                    {modalAccion === 'reabrir' && 'Reabrir Solicitud'}
                    {modalAccion === 'aceptar' && 'Aceptar Solicitud'}
                    {modalAccion === 'completar' && 'Completar Solicitud'}
                    {modalAccion === 'continuar' && 'Continuar Informe'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {modalAccion === 'cancelar' && 'Esta acción moverá la solicitud al historial'}
                    {modalAccion === 'devolver' && 'La solicitud volverá al estado pendiente'}
                    {modalAccion === 'reabrir' && 'La solicitud se pondrá como pendiente nuevamente'}
                    {modalAccion === 'aceptar' && 'La solicitud pasará a estado En Proceso'}
                    {modalAccion === 'completar' && 'La solicitud se marcará como completada'}
                    {modalAccion === 'continuar' && 'Serás redirigido al editor del informe para esta empresa'}
                  </p>
                </div>
                <button onClick={() => { setModalAccion(null); setSolicitudAccion(null); setMotivoAccion('') }} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Info de la solicitud */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{solicitudAccion.razon_social}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-400">ID:</span> #{solicitudAccion.id}
                  </div>
                  <div>
                    <span className="text-gray-400">CUIT:</span> {solicitudAccion.cuit || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-400">Estado:</span> {ESTADO_CONFIG[solicitudAccion.estado]?.label}
                  </div>
                  <div>
                    <span className="text-gray-400">Tipo:</span> {solicitudAccion.tipo_informe || 'Completo'}
                  </div>
                </div>
              </div>

              {/* Motivo (opcional para cancelar/devolver, oculto para reabrir) */}
              {(modalAccion === 'cancelar' || modalAccion === 'devolver') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo {modalAccion === 'cancelar' ? '(recomendado)' : '(opcional)'}
                  </label>
                  <textarea
                    value={motivoAccion}
                    onChange={(e) => setMotivoAccion(e.target.value)}
                    placeholder={
                      modalAccion === 'cancelar' 
                        ? 'Ej: Solicitud duplicada, cliente canceló el pedido...' 
                        : 'Ej: Falta información, requiere revisión...'
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    rows={3}
                  />
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setModalAccion(null); setSolicitudAccion(null); setMotivoAccion('') }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarAccionModal}
                  disabled={procesandoAccion}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 ${
                    modalAccion === 'cancelar' ? 'bg-red-600 hover:bg-red-700' :
                    modalAccion === 'devolver' ? 'bg-orange-600 hover:bg-orange-700' :
                    modalAccion === 'aceptar' ? 'bg-green-600 hover:bg-green-700' :
                    modalAccion === 'completar' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    modalAccion === 'continuar' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {procesandoAccion ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {modalAccion === 'cancelar' && <X className="h-4 w-4" />}
                      {modalAccion === 'devolver' && <ArrowLeft className="h-4 w-4" />}
                      {modalAccion === 'reabrir' && <RotateCw className="h-4 w-4" />}
                      {modalAccion === 'aceptar' && <ArrowRight className="h-4 w-4" />}
                      {modalAccion === 'completar' && <Check className="h-4 w-4" />}
                      {modalAccion === 'continuar' && <FileText className="h-4 w-4" />}
                    </>
                  )}
                  {modalAccion === 'cancelar' && 'Confirmar Cancelación'}
                  {modalAccion === 'devolver' && 'Confirmar Devolución'}
                  {modalAccion === 'reabrir' && 'Confirmar Reapertura'}
                  {modalAccion === 'aceptar' && 'Confirmar Aceptación'}
                  {modalAccion === 'completar' && 'Confirmar Completar'}
                  {modalAccion === 'continuar' && 'Ir al Informe'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
