import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Eye, Edit2, Loader2, History, Download, ChevronDown, Globe, BarChart3, CheckCircle2, Star, Shield, ExternalLink, Send, AlertTriangle, Building2, MapPin, Briefcase, CreditCard, MapPinned, ShieldCheck, X, FileText, Zap, Clock, Code2, ShoppingCart, Package, AlertCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import RealTimeCheck from './RealTimeCheck'

const COUNTRY_ISO = {
  'Argentina': 'ar', 'Uruguay': 'uy', 'Brasil': 'br', 'Chile': 'cl',
  'Colombia': 'co', 'Peru': 'pe', 'Perú': 'pe', 'Rep. Dominicana': 'do', 'Honduras': 'hn',
  'Republica Dominicana': 'do', 'República Dominicana': 'do',
  'Mexico': 'mx', 'México': 'mx', 'Costa Rica': 'cr', 'Alemania': 'de', 'España': 'es',
  'Ecuador': 'ec', 'Paraguay': 'py', 'Bolivia': 'bo', 'Venezuela': 've',
  'Panama': 'pa', 'Panamá': 'pa', 'Guatemala': 'gt', 'El Salvador': 'sv', 'Nicaragua': 'ni',
  'Jamaica': 'jm', 'Saint Lucia': 'lc', 'Barbados': 'bb', 'Bahamas': 'bs', 'Trinidad y Tobago': 'tt',
  'Union Europea': 'eu', 'Internacional': null, 'Desconocido': null,
}

function SearchView({ onSelectEmpresa, refreshKey }) {
    const { t, i18n } = useTranslation()
    const cleanDisplayRazonSocial = (value) => {
      const text = String(value || '').trim()
      if (!text) return ''
      return text
        .replace(/\s+(?:R\.?\s*N\.?\s*C\.?|R\.?\s*U\.?\s*C\.?|C\.?\s*U\.?\s*I\.?\s*T\.?|C(?:[EÉ]D(?:ULA)?)?\.?\s*JUR[IÍ]DICA|C\.?\s*J\.?)(?:\s*(?:NRO\.?|NO\.?|Nº|N°|N))?\.?\s*$/i, '')
        .trim()
    }

  const { hasPermission, isAdmin, user } = useAuth()
  // Cliente (cliente_admin, cliente_usuario o cliente_presentacion) solo puede solicitar informes, no ver directamente
  const isClientUser = user?.rol === 'usuario' || user?.rol === 'cliente_admin' || user?.rol === 'cliente_usuario' || user?.rol === 'cliente_presentacion'
  const isClienteAdmin = user?.rol === 'cliente_admin' // Solo cliente_admin puede comprar packs
  const canSeeBalanceGeneralBadge = ['admin', 'analista'].includes((user?.rol || '').toLowerCase())
  const canAccessScoringModule = isAdmin && hasPermission('scoring')
  const canUseAfipFilter = hasPermission('buscar_afip')
  const canSeeAfipData = hasPermission('ver_afip')
  const canSeeScoring = isAdmin && hasPermission('ver_scoring')
  const canUseScoringFilter = canSeeScoring && hasPermission('buscar_scoring')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('all') // 'all', 'cuit', 'nombre'
  const [results, setResults] = useState([])
  const [allEmpresas, setAllEmpresas] = useState([])
  const [loading, setLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [countryFilter, setCountryFilter] = useState('all')
  const [afipFilter, setAfipFilter] = useState('all')
  const [scoringFilter, setScoringFilter] = useState('all')
  const [totalResults, setTotalResults] = useState(0)
  const [openPdfDropdown, setOpenPdfDropdown] = useState(null) // ID de empresa con dropdown abierto
  const [openInformeDropdown, setOpenInformeDropdown] = useState(null)
  const [solicitudForm, setSolicitudForm] = useState(null) // {key, tipo, label, empresa data...}
  const [solicitudEmail, setSolicitudEmail] = useState('')
  const [solicitudNotas, setSolicitudNotas] = useState('')
  const [solicitudPrioridad, setSolicitudPrioridad] = useState('normal')
  const [solicitudReferencia, setSolicitudReferencia] = useState('')  // Referencia del cliente
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)
  const [externalResult, setExternalResult] = useState(null)
  const [externalSearching, setExternalSearching] = useState(false)
  const [solicitando, setSolicitando] = useState(false)
  const [solicitudesResults, setSolicitudesResults] = useState([])
  const [solicitudesTotal, setSolicitudesTotal] = useState(0)
  const [solicitudesSearching, setSolicitudesSearching] = useState(false)
  const [monitorMap, setMonitorMap] = useState({}) // cuit -> {id, alertas_activas}
  const [expandedChequeo, setExpandedChequeo] = useState(null) // cuit del chequeo expandido
  const [tiposInforme, setTiposInforme] = useState([]) // Tipos de informe dinámicos
  const [clientBalance, setClientBalance] = useState({}) // Balance de créditos por tipo {completo: 5, reducido: 3, ...}
  const [packsDisponibles, setPacksDisponibles] = useState({}) // Tipos con packs disponibles {completo: true, api: false, ...}
  const [sinSaldoModal, setSinSaldoModal] = useState(null) // {report_type, tipo_nombre, packs_sugeridos}
  const [solicitudElapsed, setSolicitudElapsed] = useState(0) // Timer para modal de solicitud
  const [solicitudResultado, setSolicitudResultado] = useState(null) // {success, message, error}
  const dropdownRef = useRef(null)
  const auditTimerRef = useRef(null)
  const solicitudesTimerRef = useRef(null)
  const solicitudStartRef = useRef(null)
  const solicitudesAbortRef = useRef(null) // AbortController para cancelar búsquedas pendientes

  // Mapeo de iconos de Lucide
  const ICON_MAP = { FileText, Zap, Clock, History, Code2 }
  
  // Cargar tipos de informe al montar
  useEffect(() => {
    const loadTiposInforme = async () => {
      try {
        const res = await axios.get('/api/portal/report-types')
        if (res.data.success && res.data.tipos?.length > 0) {
          // Usar traducciones del frontend en lugar de labels del backend
          setTiposInforme(res.data.tipos.map(tipo => ({
            tipo: tipo.tipo,
            label: t(`reportTypes.${tipo.tipo}.label`, tipo.label), // fallback al label del backend
            desc: t(`reportTypes.${tipo.tipo}.desc`, tipo.desc),
            icon: ICON_MAP[tipo.icon] || FileText,
            color: tipo.color || 'text-gray-600',
            es_api: tipo.es_api
          })))
        }
      } catch (err) {
        // Fallback a tipos por defecto si falla la API - usa traducciones
        setTiposInforme([
          { tipo: 'reducido', label: t('reportTypes.reducido.label'), desc: t('reportTypes.reducido.desc'), icon: FileText, color: 'text-blue-600' },
          { tipo: 'completo', label: t('reportTypes.completo.label'), desc: t('reportTypes.completo.desc'), icon: Zap, color: 'text-indigo-600' },
          { tipo: 'historico', label: t('reportTypes.historico.label'), desc: t('reportTypes.historico.desc'), icon: Clock, color: 'text-purple-600' },
          { tipo: 'actualizado', label: t('reportTypes.actualizado.label'), desc: t('reportTypes.actualizado.desc'), icon: History, color: 'text-orange-600' },
          { tipo: 'api', label: t('reportTypes.api.label'), desc: t('reportTypes.api.desc'), icon: Code2, color: 'text-emerald-600' },
        ])
      }
    }
    loadTiposInforme()
    
    // Cargar balance y packs del cliente si es cliente
    if (isClientUser) {
      // Balance
      axios.get('/api/portal/reports/balance')
        .then(res => {
          if (res.data.success && res.data.balance) {
            const bal = {}
            Object.entries(res.data.balance).forEach(([tipo, data]) => {
              bal[tipo] = data.balance || 0
            })
            setClientBalance(bal)
          }
        })
        .catch(() => {})
      
      // Packs disponibles por tipo
      axios.get('/api/portal/reports/packages')
        .then(res => {
          if (res.data.success && res.data.by_type) {
            const disponibles = {}
            Object.entries(res.data.by_type).forEach(([tipo, packs]) => {
              disponibles[tipo] = packs && packs.length > 0
            })
            setPacksDisponibles(disponibles)
          }
        })
        .catch(() => {})
    }
  }, [isClientUser, i18n.language, t])

  // Timer para modal de solicitud en progreso
  useEffect(() => {
    if (!enviandoSolicitud) {
      setSolicitudElapsed(0)
      return
    }
    solicitudStartRef.current = Date.now()
    const interval = setInterval(() => {
      setSolicitudElapsed(Math.floor((Date.now() - solicitudStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [enviandoSolicitud])

  const inferDisplayedTaxType = (empresa) => {
    const tipo = (empresa?.tipo_identificacion || '').toUpperCase()
    const digits = (empresa?.cuit || '').replace(/\D/g, '')

    if (tipo !== 'CUIT') return tipo
    if (digits.length === 12) return 'RUT'
    if (digits.length === 11) return 'CUIT'
    if (digits.length === 9 || digits.length === 10) return 'NIT'
    return 'ID'
  }

  const resolvePais = (empresa) => {
    // 1. Si tiene país guardado explícitamente, usarlo
    if (empresa?.pais) {
      return empresa.pais
    }

    const codigoPais = (empresa?.codigo_pais || '').toUpperCase()
    if (codigoPais === 'CL') return 'Chile'
    if (codigoPais === 'UY') return 'Uruguay'
    if (codigoPais === 'AR') return 'Argentina'
    if (codigoPais === 'CO') return 'Colombia'
    if (codigoPais === 'PE') return 'Peru'
    if (codigoPais === 'DO') return 'Rep. Dominicana'
    if (codigoPais === 'HN') return 'Honduras'
    if (codigoPais === 'MX') return 'Mexico'
    if (codigoPais === 'CR') return 'Costa Rica'
    if (codigoPais === 'GT') return 'Guatemala'
    if (codigoPais === 'BR') return 'Brasil'
    
    const tipo = inferDisplayedTaxType(empresa)
    const cuitDigits = (empresa?.cuit || '').replace(/\D/g, '')

    const contentText = [
      empresa?.domicilio,
      empresa?.domicilio_legal,
      empresa?.domicilio_operativo,
      empresa?.direccion,
      empresa?.ciudad,
      empresa?.provincia,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (contentText.includes('uruguay') || contentText.includes('montevideo') || contentText.includes('republica oriental')) {
      return 'Uruguay'
    }
    if (contentText.includes('peru') || contentText.includes('lima') || contentText.includes('republica del peru')) {
      return 'Peru'
    }

    // Heuristica: algunos registros de UY llegan con tipo "CUIT" y 12 digitos.
    if (tipo === 'CUIT' && cuitDigits.length === 12) return 'Uruguay'

    const tipoToPais = {
      CUIT: 'Argentina',
      RUT: 'Uruguay',
      RNC: 'Rep. Dominicana',
      NIT: 'Colombia',
      RUC: 'Peru',
      RTN: 'Honduras',
      RFC: 'Mexico',
      'CEDULA JURIDICA': 'Costa Rica',
      VAT: 'Union Europea',
      'TAXPAYER ID': 'Internacional',
      ID: 'Internacional',
    }

    return tipoToPais[tipo] || null
  }

  const resolveTaxIdLabel = (empresa) => {
    const pais = resolvePais(empresa)
    if (pais === 'Uruguay') return 'RUT'
    return inferDisplayedTaxType(empresa) || 'ID'
  }

  const isUruguayRutValidated = (empresa) => {
    const pais = resolvePais(empresa)
    if (pais !== 'Uruguay') return false

    const digits = (empresa?.cuit || '').replace(/\D/g, '')
    if (digits.length === 9) {
      return /^\d{9}$/.test(digits)
    }

    if (digits.length !== 12 || !/^\d{12}$/.test(digits)) {
      return false
    }

    const controlDigit = Number.parseInt(digits.slice(11), 10)
    const rest = digits.slice(0, 11)
    let total = 0
    let factor = 2

    for (let index = 10; index >= 0; index -= 1) {
      total += factor * Number.parseInt(rest[index], 10)
      factor = factor === 9 ? 2 : factor + 1
    }

    let validatorDigit = 11 - (total % 11)
    if (validatorDigit === 11) validatorDigit = 0
    else if (validatorDigit === 10) validatorDigit = 1

    return validatorDigit === controlDigit
  }

  const isArgentinaCuitValidated = (empresa) => {
    if (inferDisplayedTaxType(empresa) !== 'CUIT') return false
    if (resolvePais(empresa) !== 'Argentina') return false

    const digits = (empresa?.cuit || '').replace(/\D/g, '')
    if (!/^\d{11}$/.test(digits)) return false

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const total = multipliers.reduce((sum, multiplier, index) => {
      return sum + Number.parseInt(digits[index], 10) * multiplier
    }, 0)

    const remainder = 11 - (total % 11)
    const expectedDigit = remainder === 11 ? 0 : (remainder === 10 ? 9 : remainder)
    if (Number.parseInt(digits[10], 10) === expectedDigit) return true

    const allowedPrefixes = new Set(['20', '23', '24', '27', '30', '33', '34'])
    return allowedPrefixes.has(digits.slice(0, 2))
  }

  const getArgentinaAfipValidation = (empresa) => {
    if (resolvePais(empresa) !== 'Argentina') return null
    const validation = empresa?.afip_validation
    if (!validation?.has_validation) return null
    return validation
  }

  const hasScoring = (empresa) => {
    return Boolean(empresa?.scoring && empresa.scoring.score_total !== undefined && empresa.scoring.score_total !== null)
  }

  const availableCountries = useMemo(() => {
    const unique = new Set()
    allEmpresas.forEach((empresa) => {
      const pais = resolvePais(empresa)
      if (pais) unique.add(pais)
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'))
  }, [allEmpresas])

  const argentinaStats = useMemo(() => {
    const argentinas = allEmpresas.filter((empresa) => resolvePais(empresa) === 'Argentina')
    const afipValidadas = argentinas.filter((empresa) => getArgentinaAfipValidation(empresa)?.is_successful).length
    const conScoring = argentinas.filter((empresa) => hasScoring(empresa)).length

    return {
      total: argentinas.length,
      afipValidadas,
      pendientesAfip: argentinas.length - afipValidadas,
      conScoring,
      sinScoring: argentinas.length - conScoring,
    }
  }, [allEmpresas])

  const filteredArgentinaStats = useMemo(() => {
    const argentinas = results.filter((empresa) => resolvePais(empresa) === 'Argentina')
    const afipValidadas = argentinas.filter((empresa) => getArgentinaAfipValidation(empresa)?.is_successful).length
    const conScoring = argentinas.filter((empresa) => hasScoring(empresa)).length

    return {
      total: argentinas.length,
      afipValidadas,
      pendientesAfip: argentinas.length - afipValidadas,
      conScoring,
      sinScoring: argentinas.length - conScoring,
    }
  }, [results])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenPdfDropdown(null)
        setOpenInformeDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar todas las empresas al montar y al volver de otra vista
  // También limpiar filtros cuando refreshKey cambia (al hacer click en Buscar del sidebar)
  useEffect(() => {
    // Limpiar todos los filtros
    setSearchTerm('')
    setSearchType('all')
    setCountryFilter('all')
    setAfipFilter('all')
    setScoringFilter('all')
    setExternalResult(null)
    // Recargar empresas
    loadEmpresas()
  }, [refreshKey])

  // Ref para debounce de búsqueda principal
  const searchTimerRef = useRef(null)

  // Buscar en tiempo real con debounce
  useEffect(() => {
    // Limpiar timer anterior
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    // Si no hay término y filtro es "all", limpiar resultados inmediatamente
    if (searchTerm.trim().length === 0 && countryFilter === 'all') {
      setResults([])
      setTotalResults(0)
      setIsSearching(false)
      return
    }

    // Mostrar indicador de búsqueda
    setIsSearching(true)

    // Debounce de 300ms para evitar búsquedas excesivas
    searchTimerRef.current = setTimeout(() => {
      performSearch(searchTerm)
    }, 300)

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [searchTerm, searchType, allEmpresas, countryFilter, afipFilter, scoringFilter, canUseAfipFilter, canUseScoringFilter])

  // Buscar en solicitudes_investigacion SOLO cuando:
  // - No hay resultados locales suficientes (< 3)
  // - Y es una búsqueda válida (ID >= 7 dígitos o nombre >= 3 chars)
  useEffect(() => {
    const trimmed = (searchTerm || '').trim()
    const digits = trimmed.replace(/\D/g, '')
    const isIdSearch = digits.length >= 7
    const isNameSearch = trimmed.length >= 3 && digits.length < 7

    // Si hay suficientes resultados locales, no buscar en solicitudes
    if (results.length >= 3) {
      setSolicitudesResults([])
      setSolicitudesTotal(0)
      return
    }

    // Si no hay búsqueda válida, limpiar
    if (!isIdSearch && !isNameSearch) {
      setSolicitudesResults([])
      setSolicitudesTotal(0)
      return
    }
    if (!trimmed) {
      setSolicitudesResults([])
      setSolicitudesTotal(0)
      return
    }
    if (solicitudesTimerRef.current) clearTimeout(solicitudesTimerRef.current)
    // Aumentar debounce a 600ms para evitar búsquedas excesivas
    solicitudesTimerRef.current = setTimeout(() => {
      searchSolicitudes(searchTerm, countryFilter)
    }, 600)
    return () => { if (solicitudesTimerRef.current) clearTimeout(solicitudesTimerRef.current) }
  }, [searchTerm, countryFilter, results.length])

  const searchSolicitudes = async (term, pais) => {
    // Cancelar búsqueda anterior si existe
    if (solicitudesAbortRef.current) {
      solicitudesAbortRef.current.abort()
    }
    solicitudesAbortRef.current = new AbortController()
    
    setSolicitudesSearching(true)
    try {
      const params = new URLSearchParams()
      if (term) params.set('q', term)
      if (pais !== 'all') params.set('pais', pais)
      params.set('limit', '20')
      const res = await axios.get(`/api/solicitudes/buscar?${params}`, {
        signal: solicitudesAbortRef.current.signal
      })
      if (res.data.success) {
        setSolicitudesResults(res.data.resultados || [])
        setSolicitudesTotal(res.data.total || 0)
      }
    } catch (err) {
      // Ignorar errores de cancelación
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        // Otro error - ignorar silenciosamente
      }
    }
    finally { setSolicitudesSearching(false) }
  }

  // Auditoría de búsqueda con debounce (registra después de 1.5s sin teclear)
  const auditSearch = useCallback((term, type, count) => {
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current)
    if (!term.trim() && countryFilter === 'all') return
    auditTimerRef.current = setTimeout(() => {
      const filtros = [
        countryFilter !== 'all' ? `país=${countryFilter}` : '',
        afipFilter !== 'all' ? `afip=${afipFilter}` : '',
        scoringFilter !== 'all' ? `scoring=${scoringFilter}` : '',
      ].filter(Boolean).join(', ')
      axios.post('/api/audit/buscar', {
        termino: term.trim(),
        tipo: type,
        filtros: filtros || 'ninguno',
        resultados: count,
      }).catch(() => {})
    }, 1500)
  }, [countryFilter, afipFilter, scoringFilter])

  // Limpiar resultado externo cuando cambia la búsqueda
  useEffect(() => {
    setExternalResult(null)
    setExternalSearching(false)
  }, [searchTerm])

  // Auto-buscar en fuentes externas cuando no hay resultados internos y parece CUIT (debounce 600ms)
  useEffect(() => {
    if (!searchTerm || isSearching || results.length > 0) return
    if (solicitudesSearching || solicitudesResults.length > 0) return
    const digits = searchTerm.replace(/\D/g, '')
    if (digits.length < 7) return
    if (!hasPermission('buscar_externo')) return
    if (externalResult) return

    const timer = setTimeout(() => {
      handleExternalSearch()
    }, 600)
    return () => clearTimeout(timer)
  }, [results, isSearching, searchTerm, externalSearching, solicitudesSearching, solicitudesResults.length])

  // Si aparecen resultados en solicitudes, ocultar tarjeta externa para evitar duplicados visuales.
  useEffect(() => {
    if (solicitudesResults.length > 0 && externalResult) {
      setExternalResult(null)
      setExternalSearching(false)
    }
  }, [solicitudesResults.length, externalResult])

  const handleExternalSearch = async () => {
    if (!searchTerm.trim()) return
    setExternalSearching(true)
    setExternalResult(null)
    try {
      const res = await axios.get(`/api/buscar-externo/${encodeURIComponent(searchTerm.trim())}`)
      if (res.data.success) {
        setExternalResult(res.data.resultado)
      } else {
        toast.error(res.data.error || 'Error en búsqueda externa')
      }
    } catch (err) {
      toast.error('Error al consultar fuentes públicas')
    } finally {
      setExternalSearching(false)
    }
  }

  const handleSolicitarInvestigacion = async (notas, emailSolicitante, prioridad, tipoInforme = 'completo') => {
    if (!externalResult) return
    setSolicitando(true)
    try {
      const bcra = externalResult.bcra
      let situacionBcra = null
      if (bcra?.deudas?.disponible) {
        situacionBcra = `Situación: ${bcra.deudas.peor_situacion || '?'}, Deuda: ${bcra.deudas.monto_total_deuda || 0}`
      }
      const res = await axios.post('/api/solicitudes', {
        cuit: externalResult.cuit,
        razon_social: externalResult.razon_social,
        actividad_principal: externalResult.actividad_principal,
        domicilio: externalResult.domicilio,
        estado_afip: externalResult.estado_afip,
        situacion_bcra: situacionBcra,
        datos_externos: {
          fuentes: externalResult.fuentes,
          bcra: externalResult.bcra,
          tipo_contribuyente: externalResult.tipo_contribuyente,
          ingresos_brutos: externalResult.ingresos_brutos,
          fecha_contrato_social: externalResult.fecha_contrato_social,
        },
        notas: notas || null,
        email_solicitante: emailSolicitante || null,
        prioridad: prioridad || 'normal',
        tipo_solicitud: 'informe',
        tipo_informe: tipoInforme,
      })
      if (res.data.success) {
        toast.success('Solicitud de investigación creada correctamente')
        setExternalResult(prev => ({ ...prev, solicitud_pendiente: { id: res.data.id, estado: 'pendiente' } }))
      } else {
        toast.error(res.data.error || 'Error al crear solicitud')
      }
    } catch (err) {
      if (err.response?.status !== 403) {
        const msg = err.response?.data?.error || 'Error al crear solicitud'
        toast.error(msg)
      }
    } finally {
      setSolicitando(false)
    }
  }

  const loadEmpresas = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/empresas')
      if (response.data.success) {
        setAllEmpresas(response.data.empresas || [])
      }
    } catch (err) {
      console.error('Error cargando empresas:', err)
      toast.error('Error al cargar registros')
    } finally {
      setLoading(false)
    }
  }

  const performSearch = (term) => {
    const searchTerm_lower = term.toLowerCase().trim()
    const searchClean = searchTerm_lower.replace(/[-\s]/g, '')

    let filtered = allEmpresas.filter(empresa => {
      const cuit = empresa.cuit?.toLowerCase() || ''
      const nombre = empresa.razon_social?.toLowerCase() || ''
      const actividad = empresa.actividad_principal?.toLowerCase() || ''
      const paisTexto = resolvePais(empresa) || ''
      const pais = paisTexto.toLowerCase()
      const countryMatch = countryFilter === 'all' || paisTexto === countryFilter
      const afipValidation = getArgentinaAfipValidation(empresa)
      const companyHasScoring = hasScoring(empresa)
      const afipMatch = !canUseAfipFilter || paisTexto !== 'Argentina' || afipFilter === 'all'
        ? true
        : afipFilter === 'validated'
          ? Boolean(afipValidation?.is_successful)
          : !afipValidation?.is_successful
      const scoringMatch = !canUseScoringFilter || paisTexto !== 'Argentina' || scoringFilter === 'all'
        ? true
        : scoringFilter === 'with_scoring'
          ? companyHasScoring
          : !companyHasScoring

      if (!countryMatch || !afipMatch || !scoringMatch) {
        return false
      }

      // Remover caracteres especiales del CUIT para búsqueda flexible
      const cuitClean = cuit.replace(/[-\s]/g, '')

      // Si no hay término de búsqueda, aplicar solo filtro de país.
      if (!searchTerm_lower) {
        return true
      }

      // 'pais' se trata como 'all' para búsqueda de texto
      const effectiveSearchType = searchType === 'pais' ? 'all' : searchType

      switch (effectiveSearchType) {
        case 'cuit':
          return cuitClean.includes(searchClean)
        case 'nombre':
          return nombre.includes(searchTerm_lower) || actividad.includes(searchTerm_lower) || pais.includes(searchTerm_lower)
        case 'all':
        default:
          return (
            cuitClean.includes(searchClean) ||
            nombre.includes(searchTerm_lower) ||
            actividad.includes(searchTerm_lower) ||
            pais.includes(searchTerm_lower)
          )
      }
    })

    setTotalResults(filtered.length)

    // Limitar a 20 resultados (eficiencia)
    setResults(filtered.slice(0, 20))
    setIsSearching(false)

    // Verificar monitoreo para usuario cliente
    if (isClientUser && filtered.length > 0) {
      const cuits = filtered.slice(0, 20).map(e => e.cuit).filter(Boolean)
      if (cuits.length) {
        axios.post('/api/portal/monitoreo/check-cuits', { cuits }).then(r => {
          if (r.data.success) setMonitorMap(r.data.monitoreados)
        }).catch(() => {})
      }
    }

    // Registrar búsqueda en auditoría (debounced)
    auditSearch(term, searchType, filtered.length)
  }

  const handleToggleMonitor = async (empresa) => {
    const cuit = empresa.cuit
    if (monitorMap[cuit]) {
      try {
        await axios.post('/api/portal/monitoreo/dejar-cuit', { cuit })
        setMonitorMap(prev => { const n = { ...prev }; delete n[cuit]; return n })
        toast.success(t('search.removedFromMonitoring'))
      } catch { toast.error(t('search.errorStopMonitoring')) }
    } else {
      try {
        const res = await axios.post('/api/portal/monitoreo/seguir', {
          cuit, razon_social: empresa.razon_social,
          tipo_identificacion: empresa.tipo_identificacion,
          empresa_id: empresa.id || null,  // Puede ser null si viene de solicitudes
        })
        if (res.data.success) {
          setMonitorMap(prev => ({ ...prev, [cuit]: { id: res.data.id, alertas_activas: true } }))
          toast.success(t('search.addedToMonitoring'))
        }
      } catch { toast.error(t('search.errorMonitoring')) }
    }
  }

  const formatCuit = (cuit) => {
    if (!cuit) return ''
    const clean = cuit.replace(/\D/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`
    }
    return cuit
  }

  const handleSelectTipoInforme = async (key, tipo, label, empresaData) => {
    setOpenInformeDropdown(null)
    
    // Si es cliente, validar disponibilidad
    const tipoInfo = tiposInforme.find(t => t.tipo === tipo)
    const esApi = tipoInfo?.es_api || tipo === 'api'
    
    if (isClientUser) {
      const balance = clientBalance[tipo] || 0
      const hayPack = packsDisponibles[tipo] || false
      
      // Si no hay pack disponible y no tiene créditos, es no disponible
      if (!hayPack && balance === 0) {
        toast.error(`${label} no está disponible actualmente`)
        return
      }
      
      // Si hay pack pero no tiene créditos, mostrar modal de compra
      if (hayPack && balance === 0) {
        try {
          const res = await axios.get('/api/portal/reports/packages')
          const packs = res.data.success ? (res.data.by_type?.[tipo] || []) : []
          setSinSaldoModal({
            report_type: tipo,
            tipo_nombre: label,
            packs_sugeridos: packs.slice(0, 3)
          })
          // Guardar la empresa seleccionada para después de comprar
          setSolicitudForm({ key, tipo, label, ...empresaData })
          setSolicitudEmail('')
          setSolicitudNotas('')
          setSolicitudPrioridad('normal')
          setSolicitudReferencia('')
        } catch {
          toast.error('Error al cargar packs disponibles')
        }
        return
      }
    }
    
    setSolicitudForm({ key, tipo, label, ...empresaData })
    setSolicitudEmail('')
    setSolicitudNotas('')
    setSolicitudPrioridad('normal')
    setSolicitudReferencia('')
  }

  // Recargar balance del cliente
  const reloadClientBalance = async () => {
    if (!isClientUser) return
    try {
      const res = await axios.get('/api/portal/reports/balance')
      if (res.data.success && res.data.balance) {
        const bal = {}
        Object.entries(res.data.balance).forEach(([tipo, data]) => {
          bal[tipo] = data.balance || 0
        })
        setClientBalance(bal)
      }
    } catch {}
  }

  // Función removida - ahora redirige a tienda de packs para usar pasarela de pago

  const handleConfirmarSolicitud = async () => {
    if (!solicitudForm) return
    setEnviandoSolicitud(true)
    
    const tipoInfo = tiposInforme.find(t => t.tipo === solicitudForm.tipo)
    const esApi = tipoInfo?.es_api || solicitudForm.tipo === 'api'
    let prepagado = false
    let usageId = null
    
    try {
      // Si es cliente y NO es tipo API, intentar consumir del prepago primero
      if (isClientUser && !esApi) {
        try {
          const consumeRes = await axios.post('/api/portal/reports/generate', {
            report_type: solicitudForm.tipo,
            cuit: solicitudForm.cuit,
            pais: 'AR',
            razon_social: solicitudForm.razon_social
          })
          
          if (consumeRes.data.success) {
            prepagado = true
            usageId = consumeRes.data.usage_id
            // Actualizar balance local
            setClientBalance(prev => ({
              ...prev,
              [solicitudForm.tipo]: consumeRes.data.new_balance
            }))
            toast.success(`Crédito consumido (${consumeRes.data.new_balance} restantes)`)
          }
        } catch (consumeErr) {
          // Si es error de sin saldo, mostrar modal de compra
          if (consumeErr.response?.status === 400 && consumeErr.response?.data?.balance === 0) {
            const errData = consumeErr.response.data
            setSinSaldoModal({
              report_type: errData.report_type,
              tipo_nombre: errData.tipo_nombre || solicitudForm.label,
              packs_sugeridos: errData.packs_sugeridos || []
            })
            setEnviandoSolicitud(false)
            return
          }
          // Otro error: continuar con solicitud normal (sin prepago)
          console.log('Error prepago, creando solicitud normal:', consumeErr.message)
        }
      }
      
      // Crear solicitud (siempre, incluso si se consumió prepago)
      const res = await axios.post('/api/solicitudes', {
        cuit: solicitudForm.cuit,
        tipo_identificacion: solicitudForm.tipo_identificacion,
        razon_social: solicitudForm.razon_social,
        actividad_principal: solicitudForm.actividad_principal,
        domicilio: solicitudForm.domicilio,
        notas: `${prepagado ? '[PREPAGO] ' : ''}${solicitudNotas || ''}`.trim() || null,
        email_solicitante: solicitudEmail || null,
        prioridad: prepagado ? 'alta' : solicitudPrioridad,
        tipo_solicitud: esApi ? 'api' : 'informe',
        tipo_informe: solicitudForm.tipo,  // 'completo', 'reducido', 'historico', etc.
        prepagado: prepagado,
        usage_id: usageId,
        referencia_cliente: solicitudReferencia || null
      })
      if (res.data.success) {
        setSolicitudResultado({ success: true, message: `Solicitud de ${solicitudForm.label.toLowerCase()} creada correctamente` })
        // Refrescar solicitudes
        const digits = (searchTerm || '').replace(/\D/g, '')
        if (countryFilter !== 'all' || digits.length >= 7) {
          searchSolicitudes(searchTerm, countryFilter)
        }
      } else {
        // Extraer error_code y parámetros para traducción
        setSolicitudResultado({ 
          success: false, 
          error: res.data.error || 'Error al crear solicitud',
          error_code: res.data.error_code,
          report_type: res.data.report_type,
          days: res.data.days,
          days_remaining: res.data.days_remaining
        })
      }
    } catch (err) {
      const data = err.response?.data || {}
      setSolicitudResultado({ 
        success: false, 
        error: data.error || 'Error al crear solicitud',
        error_code: data.error_code,
        report_type: data.report_type,
        days: data.days,
        days_remaining: data.days_remaining
      })
    } finally {
      setEnviandoSolicitud(false)
    }
  }

  const handleViewDetails = (empresa) => {
    onSelectEmpresa(empresa.id, 'view', empresa.cuit)
  }

  const handleEdit = (empresa) => {
    onSelectEmpresa(empresa.id, 'edit', empresa.cuit)
  }

  const handleHistorial = (empresa) => {
    onSelectEmpresa(empresa.id, 'historial', empresa.cuit)
  }

  const handleScoring = (empresa) => {
    onSelectEmpresa(empresa.id, 'scoring', empresa.cuit)
  }

  const handleDownloadPDF = async (empresa, lang = 'es') => {
    setOpenPdfDropdown(null) // Cerrar dropdown
    try {
      const langLabel = lang === 'en' ? 'inglés' : lang === 'de' ? 'alemán' : 'español'
      toast.loading(`Generando PDF en ${langLabel}...`, { id: 'pdf-download' })
      
      const response = await axios.get(`/api/empresas/${empresa.id}/pdf?lang=${lang}`, {
        responseType: 'blob'
      })
      
      // Crear URL y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Nombre del archivo desde headers o usar nombre por defecto
      const contentDisposition = response.headers['content-disposition']
      let filename = `Informe_${empresa.razon_social || 'empresa'}.pdf`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF descargado correctamente', { id: 'pdf-download' })
    } catch (err) {
      console.error('Error descargando PDF:', err)
      if (err.response?.status !== 403) toast.error('Error al generar el PDF', { id: 'pdf-download' })
      else toast.dismiss('pdf-download')
    }
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSearchType('all')
    setCountryFilter('all')
    setAfipFilter('all')
    setScoringFilter('all')
    setResults([])
    setTotalResults(0)
    setSolicitudesResults([])
    setSolicitudesTotal(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Modal de solicitud en progreso o resultado */}
      {(enviandoSolicitud || solicitudResultado) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            {/* Estado: Procesando */}
            {enviandoSolicitud && !solicitudResultado && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      <circle 
                        cx="40" cy="40" r="36" fill="none" stroke="#3b82f6" strokeWidth="6"
                        strokeDasharray={`${Math.min(100, (solicitudElapsed / 30) * 100) * 2.26} 226`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">{solicitudElapsed}s</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('search.requestingReport')}</h3>
                <p className="text-gray-600 mb-4">
                  {solicitudForm?.razon_social || solicitudForm?.cuit}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (solicitudElapsed / 15) * 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  {solicitudForm?.label}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {t('common.doNotClose')}
                </p>
              </>
            )}
            
            {/* Estado: Éxito */}
            {solicitudResultado?.success && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">{t('request.successTitle')}</h3>
                <p className="text-gray-600 mb-2">
                  {solicitudForm?.razon_social || solicitudForm?.cuit}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  {t('request.successDesc')}
                </p>
                <button
                  onClick={() => { 
                    // Cancelar búsquedas pendientes
                    if (solicitudesTimerRef.current) clearTimeout(solicitudesTimerRef.current);
                    if (solicitudesAbortRef.current) solicitudesAbortRef.current.abort();
                    // Limpiar estados
                    setSolicitudResultado(null); 
                    setSolicitudForm(null); 
                    setSearchTerm('');
                    setSearchType('all');
                    setCountryFilter('all');
                    setAfipFilter('all');
                    setScoringFilter('all');
                    setResults([]);
                    setTotalResults(0);
                    setSolicitudesResults([]);
                    setSolicitudesTotal(0);
                    setExternalResult(null);
                    setExpandedChequeo(null);
                    setSolicitudesSearching(false);
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  {t('common.close')}
                </button>
              </>
            )}
            
            {/* Estado: Error */}
            {solicitudResultado && !solicitudResultado.success && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">{t('request.errorTitle')}</h3>
                <p className="text-gray-600 mb-2">
                  {solicitudForm?.razon_social || solicitudForm?.cuit}
                </p>
                <p className="text-sm text-red-600 mb-6 bg-red-50 p-3 rounded-lg">
                  {solicitudResultado.error_code 
                    ? t(`request.errors.${solicitudResultado.error_code}`, {
                        reportType: solicitudResultado.report_type || 'informe',
                        days: solicitudResultado.days,
                        daysRemaining: solicitudResultado.days_remaining
                      })
                    : solicitudResultado.error}
                </p>
                <button
                  onClick={() => { 
                    // Cancelar búsquedas pendientes
                    if (solicitudesTimerRef.current) clearTimeout(solicitudesTimerRef.current);
                    if (solicitudesAbortRef.current) solicitudesAbortRef.current.abort();
                    // Limpiar estados
                    setSolicitudResultado(null); 
                    setSolicitudForm(null); 
                    setSearchTerm('');
                    setSearchType('all');
                    setCountryFilter('all');
                    setAfipFilter('all');
                    setScoringFilter('all');
                    setResults([]);
                    setTotalResults(0);
                    setSolicitudesResults([]);
                    setSolicitudesTotal(0);
                    setExternalResult(null);
                    setExpandedChequeo(null);
                    setSolicitudesSearching(false);
                  }}
                  className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  {t('common.close')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
            {t('search.title')}
          </h1>
          <p className="text-sm sm:text-lg text-gray-600">
            {t('search.placeholder')}
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
          {/* Search Box */}
          <div className="relative mb-4 sm:mb-6">
            <Search className="absolute left-3 sm:left-4 top-3 sm:top-4 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-12 py-3 sm:py-4 border-2 border-gray-200 rounded-xl text-base sm:text-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
            {/* Botón X para limpiar búsqueda */}
            {searchTerm && !isSearching && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 sm:right-4 top-3 sm:top-4 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title={t('common.clear')}
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-4 top-3 sm:top-4 h-5 w-5 text-blue-500 animate-spin" />
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
            <button
              onClick={() => { setSearchType('all'); setCountryFilter('all') }}
              className={`min-w-[70px] sm:min-w-[90px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                searchType === 'all' && countryFilter === 'all'
                  ? 'bg-inforysk-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t('search.filters.all')}
            </button>
            <button
              onClick={() => setSearchType('cuit')}
              className={`min-w-[70px] sm:min-w-[90px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                searchType === 'cuit'
                  ? 'bg-inforysk-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('search.filters.byCuit')}
            </button>
            <button
              onClick={() => setSearchType('nombre')}
              className={`min-w-[70px] sm:min-w-[90px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                searchType === 'nombre'
                  ? 'bg-inforysk-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('search.filters.byName')}
            </button>
            <CountryFilterButton
              active={countryFilter !== 'all'}
              value={countryFilter}
              onChange={(pais) => { setSearchType('all'); setCountryFilter(pais) }}
              onClear={() => { setCountryFilter('all') }}
              countries={availableCountries}
            />

            {/* Contador */}
            {(searchTerm || countryFilter !== 'all') && (
              <div className="w-full sm:w-auto sm:ml-auto flex items-center text-sm text-gray-600 font-medium mt-2 sm:mt-0">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <span className="bg-inforysk-red-100 text-inforysk-red-700 px-3 py-1 rounded-full">
                      {(() => {
                        const empresaCuits = new Set(results.map(e => (e.cuit || '').replace(/[-. ]/g, '')))
                        // Contar solicitudes únicas (que no estén en empresas) - para todos los usuarios, no solo clientes
                        const uniqueSol = solicitudesResults.filter(s => !empresaCuits.has((s.cuit || '').replace(/[-. ]/g, ''))).length
                        // Usar el mayor entre totalResults y results.length para evitar discrepancias
                        const baseCount = Math.max(totalResults, results.length)
                        const total = baseCount + uniqueSol
                        return t('search.resultsCount', { count: total })
                      })()}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Filtros adicionales (AFIP / Scoring) cuando hay país seleccionado */}
          <div className="mt-4 sm:mt-5 flex items-center gap-2 flex-wrap">
            {countryFilter === 'Argentina' && canUseAfipFilter && (
              <select
                value={afipFilter}
                onChange={(e) => setAfipFilter(e.target.value)}
                className="px-3 py-2 border border-sky-300 rounded-lg bg-sky-50 text-sm text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">AFIP: todas</option>
                <option value="validated">AFIP validadas</option>
                <option value="pending">AFIP no validadas</option>
              </select>
            )}
            {countryFilter === 'Argentina' && canUseScoringFilter && (
              <select
                value={scoringFilter}
                onChange={(e) => setScoringFilter(e.target.value)}
                className="px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-50 text-sm text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Scoring: todos</option>
                <option value="with_scoring">Con scoring</option>
                <option value="without_scoring">Sin scoring</option>
              </select>
            )}
            {(searchTerm || countryFilter !== 'all' || searchType !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="ml-auto px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('search.clearFilters')}
              </button>
            )}
          </div>

          {countryFilter === 'Argentina' && canUseAfipFilter && canUseScoringFilter && (
            <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wide text-sky-600">AFIP validadas</p>
                <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-sky-700">{(searchTerm || afipFilter !== 'all' || scoringFilter !== 'all') ? filteredArgentinaStats.afipValidadas : argentinaStats.afipValidadas}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Con scoring</p>
                <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-emerald-700">{(searchTerm || afipFilter !== 'all' || scoringFilter !== 'all') ? filteredArgentinaStats.conScoring : argentinaStats.conScoring}</p>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wide text-orange-600">Sin scoring</p>
                <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-orange-700">{(searchTerm || afipFilter !== 'all' || scoringFilter !== 'all') ? filteredArgentinaStats.sinScoring : argentinaStats.sinScoring}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wide text-amber-600">Pendientes AFIP</p>
                <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-amber-700">{(searchTerm || afipFilter !== 'all' || scoringFilter !== 'all') ? filteredArgentinaStats.pendientesAfip : argentinaStats.pendientesAfip}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2.5 sm:py-3 col-span-2 sm:col-span-1">
                <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-600">Total Argentina</p>
                <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-slate-700">{(searchTerm || afipFilter !== 'all' || scoringFilter !== 'all') ? filteredArgentinaStats.total : argentinaStats.total}</p>
              </div>
            </div>
          )}
        </div>

        {/* Estado inicial */}
        {!searchTerm && countryFilter === 'all' && !loading && (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl p-6 sm:p-12 border-2 border-dashed border-gray-300 max-w-2xl mx-auto">
              <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-700 mb-2">
                {t('search.startSearch')}
              </h2>
              <p className="text-gray-500 mb-6">
                {t('search.startSearchHint')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
                <div className="p-3 bg-inforysk-navy-50 rounded-lg">
                  <div className="font-semibold text-inforysk-navy-700 text-sm mb-1">{t('search.quickSearch')}</div>
                  <p className="text-xs text-gray-600">{t('search.quickSearchDesc')}</p>
                </div>
                <div className="p-3 bg-inforysk-red-50 rounded-lg">
                  <div className="font-semibold text-inforysk-red-700 text-sm mb-1">{t('search.filtersTitle')}</div>
                  <p className="text-xs text-gray-600">{t('search.filtersDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !searchTerm && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Sin resultados */}
        {(searchTerm || countryFilter !== 'all') && results.length === 0 && !isSearching && (
          <>
            {/* Buscando en fuentes externas — mostrar loader (solo admin/analista) */}
            {!isClientUser && externalSearching && (
              <div className="text-center py-16">
                <div className="bg-white rounded-2xl p-6 sm:p-12 border-2 border-gray-200 max-w-md mx-auto">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-gray-700 mb-1">Consultando información...</h2>
                  <p className="text-sm text-gray-400">Esto puede tomar unos segundos</p>
                </div>
              </div>
            )}

            {/* Resultado externo encontrado — mostrar como si fuera nuestro (solo admin/analista) */}
            {!isClientUser && !externalSearching && externalResult && solicitudesResults.length === 0 && (
              <div className="max-w-2xl mx-auto py-6">
                <ExternalSearchResult
                  result={externalResult}
                  onSolicitar={handleSolicitarInvestigacion}
                  solicitando={solicitando}
                />
              </div>
            )}

            {/* Sin resultados en ningún lado */}
            {(isClientUser || (!externalSearching && !externalResult)) && solicitudesResults.length === 0 && !solicitudesSearching && (
              <div className="text-center py-16">
                <div className="bg-white rounded-2xl p-6 sm:p-12 border-2 border-gray-200 max-w-2xl mx-auto">
                  <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-base sm:text-2xl font-semibold text-gray-700 mb-2">
                    {(() => {
                      const digits = searchTerm.replace(/\D/g, '')
                      if (digits.length >= 7) {
                        const label = countryFilter === 'Rep. Dominicana' ? 'RNC'
                          : countryFilter === 'Peru' ? 'RUC'
                          : countryFilter === 'Uruguay' ? 'RUT'
                          : countryFilter === 'Colombia' ? 'NIT'
                          : digits.length === 11 ? 'CUIT' : digits.length === 12 ? 'RUT' : digits.length === 9 ? 'RNC' : 'ID fiscal'
                        return `No existe información del ${label} ${searchTerm.trim()} consultado`
                      }
                      return searchTerm.trim()
                        ? `No se encontraron resultados para "${searchTerm.trim()}"`
                        : 'No se encontraron resultados'
                    })()}
                  </h2>
                  <p className="text-gray-500">
                    Intenta con otro CUIT/RNC/RUT/ID o razón social
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <div className="grid gap-4">
            {results.map((empresa) => {
              const pais = resolvePais(empresa)
              const taxIdLabel = resolveTaxIdLabel(empresa)
              const rutUruguayValidado = isUruguayRutValidated(empresa)
              const cuitArgentinoValidado = isArgentinaCuitValidated(empresa)
              const afipValidation = getArgentinaAfipValidation(empresa)
              const nombreLimpio = cleanDisplayRazonSocial(empresa.razon_social)
              const hasBalanceGeneral = canSeeBalanceGeneralBadge && Boolean(empresa.has_balance_general)
              // Usar codigo_pais guardado o buscar en mapeo
              const paisIso = empresa?.codigo_pais?.toLowerCase() || (pais ? COUNTRY_ISO[pais] : null)

              // Antigüedad — basado en fecha_informe
              const antiguedad = empresa.fecha_informe ? (() => {
                const fecha = new Date(empresa.fecha_informe)
                const hoy = new Date()
                let anios = hoy.getFullYear() - fecha.getFullYear()
                let meses = hoy.getMonth() - fecha.getMonth()
                let dias = hoy.getDate() - fecha.getDate()
                if (dias < 0) { meses--; dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate() }
                if (meses < 0) { anios--; meses += 12 }
                if (anios > 0 && meses > 0) return `${anios} año${anios > 1 ? 's' : ''} ${meses} mes${meses > 1 ? 'es' : ''}`
                if (anios > 0) return `${anios} año${anios > 1 ? 's' : ''}`
                if (meses > 0) return `${meses} mes${meses > 1 ? 'es' : ''}`
                return `${Math.max(dias, 0)} día${dias !== 1 ? 's' : ''}`
              })() : null

              // Score / Semáforo
              const score = empresa.scoring?.score_total
              const rating = empresa.scoring?.rating
              const semaforo = score !== undefined && score !== null
                ? score >= 70 ? { color: 'bg-green-500', label: t('search.risk.low'), textColor: 'text-green-700', bgLight: 'bg-green-50 border-green-200' }
                : score >= 40 ? { color: 'bg-amber-400', label: t('search.risk.medium'), textColor: 'text-amber-700', bgLight: 'bg-amber-50 border-amber-200' }
                : { color: 'bg-red-500', label: t('search.risk.high'), textColor: 'text-red-700', bgLight: 'bg-red-50 border-red-200' }
                : null

              return (
              <div
                key={empresa.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="p-4 sm:p-6">
                  {/* Header: Razón Social + Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {paisIso && <img src={`https://flagcdn.com/20x15/${paisIso}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover" />}
                        {pais && <span className="text-xs text-gray-500">{pais}</span>}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {nombreLimpio || t('search.company.noName')}
                      </h3>
                    </div>
                    {/* Semáforo de riesgo */}
                    {semaforo && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${semaforo.bgLight} ${semaforo.textColor}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${semaforo.color}`} />
                        {semaforo.label}
                      </div>
                    )}
                  </div>

                  {/* Badges de validación */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {empresa.es_buen_contribuyente && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold" title={t('search.company.goodTaxpayer')}>
                        <CheckCircle2 className="h-3 w-3" /> {t('search.company.goodTaxpayer')}
                      </span>
                    )}
                    {empresa.es_agente_retencion && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold" title={t('search.company.retentionAgent')}>
                        {t('search.company.retentionAgent')}
                      </span>
                    )}
                    {rutUruguayValidado && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        <Star className="h-3 w-3 fill-current" /> {t('search.company.rutValidated')}
                      </span>
                    )}
                    {canSeeAfipData && afipValidation?.is_successful && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
                        <Shield className="h-3 w-3" /> {t('search.company.validatedAfip')}
                      </span>
                    )}
                    {cuitArgentinoValidado && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> {taxIdLabel} {t('search.company.verified')}
                      </span>
                    )}
                    {score !== undefined && score !== null && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <BarChart3 className="h-3 w-3" /> {t('search.hasScore')}
                      </span>
                    )}
                    {hasBalanceGeneral && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Balance General
                      </span>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3">
                      <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">{taxIdLabel}</div>
                      <div className="text-xs sm:text-sm font-mono font-bold text-blue-700 truncate">{formatCuit(empresa.cuit)}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2.5 sm:p-3">
                      <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">{t('search.company.activity')}</div>
                      <div className="text-[10px] sm:text-xs font-semibold text-green-700 line-clamp-2">{empresa.actividad_principal || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                      <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">{t('search.company.address')}</div>
                      <div className="text-[10px] sm:text-xs font-semibold text-gray-700 line-clamp-2">{empresa.domicilio || '—'}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3">
                      <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">{t('search.company.seniority')}</div>
                      <div className="text-[10px] sm:text-xs font-semibold text-purple-700">{antiguedad || '—'}</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-2.5 sm:p-3 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t('search.company.lastUpdate')}</div>
                      <div className="text-xs font-semibold text-indigo-700">
                        {empresa.updated_at ? new Date(empresa.updated_at).toLocaleDateString() : empresa.created_at ? new Date(empresa.created_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  {isClientUser ? (
                    <>
                    {solicitudForm?.key === `emp-${empresa.id}` ? (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{t('search.requestType')} {solicitudForm.label}</p>
                            <p className="text-xs text-gray-500">{t('search.completeInfoToSend')}</p>
                          </div>
                          <button onClick={() => setSolicitudForm(null)} className="p-1 hover:bg-gray-200 rounded-lg"><X className="h-4 w-4 text-gray-500" /></button>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.contactEmailOptional')}</label>
                          <input type="email" value={solicitudEmail} onChange={e => setSolicitudEmail(e.target.value)} placeholder="tu@empresa.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.referenceOptional') || 'Referencia (opcional)'}</label>
                          <input type="text" value={solicitudReferencia} onChange={e => setSolicitudReferencia(e.target.value)} placeholder={t('search.referencePlaceholder') || 'Tu referencia interna'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.additionalNotesOptional')}</label>
                          <textarea value={solicitudNotas} onChange={e => setSolicitudNotas(e.target.value)} placeholder={t('search.additionalNotesPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" rows={2} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.priority')}</label>
                          <div className="flex gap-2">
                            {[
                              { val: 'baja', labelKey: 'search.priorityLow', color: 'border-gray-300 text-gray-600 bg-gray-50', active: 'border-gray-500 bg-gray-100 ring-1 ring-gray-400' },
                              { val: 'normal', labelKey: 'search.priorityNormal', color: 'border-blue-200 text-blue-700 bg-blue-50', active: 'border-blue-500 bg-blue-100 ring-1 ring-blue-400' },
                              { val: 'alta', labelKey: 'search.priorityHigh', color: 'border-orange-200 text-orange-700 bg-orange-50', active: 'border-orange-500 bg-orange-100 ring-1 ring-orange-400' },
                              { val: 'urgente', labelKey: 'search.priorityUrgent', color: 'border-red-200 text-red-700 bg-red-50', active: 'border-red-500 bg-red-100 ring-1 ring-red-400' },
                            ].map(p => (
                              <button key={p.val} type="button" onClick={() => setSolicitudPrioridad(p.val)}
                                className={`flex-1 px-2 py-1.5 border rounded-lg text-xs font-medium transition-all ${solicitudPrioridad === p.val ? p.active : p.color + ' hover:opacity-80'}`}>
                                {t(p.labelKey)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleConfirmarSolicitud} disabled={enviandoSolicitud} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50">
                            {enviandoSolicitud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {t('search.confirmRequest')}
                          </button>
                          <button onClick={() => setSolicitudForm(null)} className="px-4 py-2.5 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium">{t('search.cancel')}</button>
                        </div>
                      </div>
                    ) : (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">{t('search.needFullReport')}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{t('search.requestDetailedInvestigation')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleMonitor(empresa)}
                            className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                              monitorMap[empresa.cuit]
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                            }`}
                            title={monitorMap[empresa.cuit] ? t('search.stopFollowing') : t('search.followCompany')}
                          >
                            <Star className={`h-4 w-4 ${monitorMap[empresa.cuit] ? 'fill-amber-500' : ''}`} />
                            <span className="hidden sm:inline">{monitorMap[empresa.cuit] ? t('search.following') : t('search.follow')}</span>
                          </button>
                        <div className="relative" ref={openInformeDropdown === empresa.id ? dropdownRef : null}>
                          <button
                            onClick={() => setOpenInformeDropdown(openInformeDropdown === empresa.id ? null : empresa.id)}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap shadow-sm"
                          >
                            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {t('search.requestReport')}
                            <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform ${openInformeDropdown === empresa.id ? 'rotate-180' : ''}`} />
                          </button>
                          {openInformeDropdown === empresa.id && (
                            <>
                              {/* Mobile: Modal centrado */}
                              <div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpenInformeDropdown(null)} />
                              <div className="sm:hidden fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                  <h3 className="font-semibold text-gray-900">{t('search.reportType')}</h3>
                                  <button onClick={() => setOpenInformeDropdown(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <X size={18} className="text-gray-500" />
                                  </button>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto">
                                  {tiposInforme.map((item) => {
                                    const balance = clientBalance[item.tipo] || 0
                                    const hayPack = packsDisponibles[item.tipo] || false
                                    const noDisponible = isClientUser && !hayPack && balance === 0
                                    const sinCreditos = isClientUser && hayPack && balance === 0
                                    const deshabilitado = noDisponible
                                    
                                    return (
                                    <button
                                      key={item.tipo}
                                      onClick={() => !deshabilitado && handleSelectTipoInforme(`emp-${empresa.id}`, item.tipo, item.label, {
                                        cuit: empresa.cuit,
                                        tipo_identificacion: empresa.tipo_identificacion,
                                        razon_social: empresa.razon_social,
                                        actividad_principal: empresa.actividad_principal,
                                        domicilio: empresa.domicilio,
                                      })}
                                      disabled={deshabilitado}
                                      className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 ${deshabilitado ? 'opacity-40 cursor-not-allowed' : sinCreditos ? 'opacity-70' : ''}`}
                                    >
                                      <item.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.color}`} />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                                          {isClientUser && (
                                            noDisponible ? (
                                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                                No disponible
                                              </span>
                                            ) : balance > 0 ? (
                                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                                {balance} créditos
                                              </span>
                                            ) : (
                                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                                Sin créditos
                                              </span>
                                            )
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500">{item.desc}</div>
                                      </div>
                                    </button>
                                    )
                                  })}
                                </div>
                              </div>
                              {/* Desktop: Dropdown normal */}
                              <div className="hidden sm:block absolute right-0 bottom-full mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                {tiposInforme.map((item) => {
                                  const balance = clientBalance[item.tipo] || 0
                                  const hayPack = packsDisponibles[item.tipo] || false
                                  const noDisponible = isClientUser && !hayPack && balance === 0
                                  const sinCreditos = isClientUser && hayPack && balance === 0
                                  const deshabilitado = noDisponible
                                  
                                  return (
                                  <button
                                    key={item.tipo}
                                    onClick={() => !deshabilitado && handleSelectTipoInforme(`emp-${empresa.id}`, item.tipo, item.label, {
                                      cuit: empresa.cuit,
                                      tipo_identificacion: empresa.tipo_identificacion,
                                      razon_social: empresa.razon_social,
                                      actividad_principal: empresa.actividad_principal,
                                      domicilio: empresa.domicilio,
                                    })}
                                    disabled={deshabilitado}
                                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 ${deshabilitado ? 'opacity-40 cursor-not-allowed' : sinCreditos ? 'opacity-70' : ''}`}
                                  >
                                    <item.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.color}`} />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                                        {isClientUser && (
                                          noDisponible ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                              No disponible
                                            </span>
                                          ) : balance > 0 ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                              {balance}
                                            </span>
                                          ) : (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                              Sin créditos
                                            </span>
                                          )
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">{item.desc}</div>
                                    </div>
                                  </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                        </div>
                      </div>
                    </div>
                    )}
                    </>
                  ) : (
                  <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
                    <button
                      onClick={() => handleViewDetails(empresa)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver</span>
                    </button>
                    {hasPermission('editar') && (
                    <button
                      onClick={() => handleEdit(empresa)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Editar</span>
                    </button>
                    )}
                    {hasPermission('descargar_pdf') && (
                    <div className="flex-1 relative" ref={openPdfDropdown === empresa.id ? dropdownRef : null}>
                      <button
                        onClick={() => setOpenPdfDropdown(openPdfDropdown === empresa.id ? null : empresa.id)}
                        className="w-full flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm"
                        title="Descargar informe PDF"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      
                      {openPdfDropdown === empresa.id && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
                          <button
                            onClick={() => handleDownloadPDF(empresa, 'es')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm"
                          >
                            <span className="text-base">ES</span>
                            Español
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(empresa, 'en')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-t"
                          >
                            <span className="text-base">EN</span>
                            English
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(empresa, 'de')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-t"
                          >
                            <span className="text-base">DE</span>
                            Deutsch
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                    {hasPermission('historial') && (
                    <button
                      onClick={() => handleHistorial(empresa)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      <History className="h-4 w-4" />
                      <span className="hidden sm:inline">Historial</span><span className="sm:hidden">Hist.</span> {empresa.version > 1 && `(v${empresa.version})`}
                    </button>
                    )}
                    {canAccessScoringModule && (
                    <button
                      onClick={() => handleScoring(empresa)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Scoring</span><span className="sm:hidden">Score</span>
                    </button>
                    )}
                  </div>
                  )}

                  {/* Chequeo en tiempo real */}
                  <div className="mt-3">
                    {expandedChequeo !== empresa.cuit ? (
                      <button
                        onClick={() => setExpandedChequeo(empresa.cuit)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all text-sm font-semibold"
                      >
                        <Shield className="h-4 w-4" />
                        {t('search.realTimeCheck')}
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                      </button>
                    ) : (
                      <RealTimeCheck cuit={empresa.cuit} />
                    )}
                  </div>

                  {/* Última actualización */}
                  {(empresa.updated_at || empresa.created_at) && (
                    <div className="text-xs text-gray-500 mt-3">
                      {t('search.lastUpdateLabel')}: {new Date(empresa.updated_at || empresa.created_at).toLocaleString(undefined, { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
              )
            })}

            {/* Info si hay más resultados limitados */}
            {results.length === 20 && totalResults > 20 && (
              <div className="text-center py-4 text-gray-600 text-sm">
                {t('search.showingResults', { shown: 20, total: totalResults })}
              </div>
            )}
          </div>
        )}

        {/* Resultados de solicitudes_investigacion — misma apariencia que empresas */}
        {(solicitudesResults.length > 0 || solicitudesSearching) && (() => {
          // Filtrar solicitudes cuyo CUIT ya aparece en resultados de empresas (evitar duplicados)
          const empresaCuits = new Set(results.map(e => (e.cuit || '').replace(/[-.\s]/g, '')))
          
          // Mapeo tipo_identificacion → país
          const TIPO_TO_PAIS = { CUIT: 'Argentina', RUC: 'Peru', RUT: 'Uruguay', RNC: 'Rep. Dominicana', NIT: 'Colombia', RTN: 'Honduras', 'CEDULA JURIDICA': 'Costa Rica', CNPJ: 'Brasil', RFC: 'Mexico', HRB: 'Alemania', DPI: 'Guatemala' }

          const codigoToPais = {
            AR: 'Argentina',
            CL: 'Chile',
            UY: 'Uruguay',
            CO: 'Colombia',
            PE: 'Peru',
            DO: 'Rep. Dominicana',
            HN: 'Honduras',
            MX: 'Mexico',
            CR: 'Costa Rica',
            GT: 'Guatemala',
            BR: 'Brasil',
            DE: 'Alemania',
          }

          const resolveSolicitudPais = (sol) => {
            if (sol?.pais) return sol.pais
            const code = (sol?.codigo_pais || '').toUpperCase()
            if (code && codigoToPais[code]) return codigoToPais[code]
            return TIPO_TO_PAIS[(sol?.tipo_identificacion || 'ID').toUpperCase()] || null
          }
          
          const filteredSolicitudes = solicitudesResults.filter(sol => {
            const solCuit = (sol.cuit || '').replace(/[-.\s]/g, '')
            if (empresaCuits.has(solCuit)) return false // Evitar duplicados
            
            // Filtrar por país si hay filtro activo
            if (countryFilter !== 'all') {
              const solPaisReal = resolveSolicitudPais(sol)
              if (solPaisReal !== countryFilter) return false
            }
            return true
          })
          if (filteredSolicitudes.length === 0 && !solicitudesSearching) return null
          return (
          <div className={results.length > 0 ? 'mt-6' : ''}>
            {solicitudesSearching && filteredSolicitudes.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            )}
            <div className="grid gap-4">
              {filteredSolicitudes.map((sol) => {
                const nombreLimpio = cleanDisplayRazonSocial(sol.razon_social)

                // Resolver país real priorizando pais/codigo_pais explícitos.
                const solPais = resolveSolicitudPais(sol)
                const iso = solPais ? COUNTRY_ISO[solPais] : null

                // Solicitudes no tienen fecha_informe
                const antiguedad = null

                return (
                  <div key={`sol-${sol.id}`} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="p-4 sm:p-6">
                      {/* Header: Razón Social + País */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {iso && <img src={`https://flagcdn.com/20x15/${iso}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover" />}
                            {solPais && <span className="text-xs text-gray-500">{solPais}</span>}
                            {/* Badge Buen Contribuyente */}
                            {sol.es_buen_contribuyente && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full" title="Buen Contribuyente SUNAT">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Buen Contribuyente
                              </span>
                            )}
                            {sol.es_agente_retencion && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full" title="Agente de Retención">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" /></svg>
                                Agente Retención
                              </span>
                            )}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">
                            {nombreLimpio || 'Sin razón social'}
                          </h3>
                        </div>
                      </div>

                      {/* Info Grid — 5 columnas como empresas */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{tipoId}</div>
                          <div className="text-sm font-mono font-bold text-blue-700">{sol.cuit}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t('search.company.activity')}</div>
                          <div className="text-xs font-semibold text-green-700 line-clamp-2">{sol.actividad_principal || '—'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t('search.company.address')}</div>
                          <div className="text-xs font-semibold text-gray-700 line-clamp-2">{sol.domicilio || '—'}</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t('search.company.seniority')}</div>
                          <div className="text-xs font-semibold text-purple-700">{antiguedad || '—'}</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t('search.company.lastUpdate')}</div>
                          <div className="text-xs font-semibold text-indigo-700">
                            {sol.updated_at ? new Date(sol.updated_at).toLocaleDateString() : sol.created_at ? new Date(sol.created_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Banner Solicitar Informe — mismo estilo que empresas */}
                      {(sol.estado === 'precarga' || sol.estado === 'consulta') && (
                        <>
                        {solicitudForm?.key === `sol-${sol.id}` ? (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{t('search.requestType')} {solicitudForm.label}</p>
                                <p className="text-xs text-gray-500">{t('search.completeInfoToSend')}</p>
                              </div>
                              <button onClick={() => setSolicitudForm(null)} className="p-1 hover:bg-gray-200 rounded-lg"><X className="h-4 w-4 text-gray-500" /></button>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.contactEmailOptional')}</label>
                              <input type="email" value={solicitudEmail} onChange={e => setSolicitudEmail(e.target.value)} placeholder="tu@empresa.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.referenceOptional') || 'Referencia (opcional)'}</label>
                              <input type="text" value={solicitudReferencia} onChange={e => setSolicitudReferencia(e.target.value)} placeholder={t('search.referencePlaceholder') || 'Tu referencia interna'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.additionalNotesOptional')}</label>
                              <textarea value={solicitudNotas} onChange={e => setSolicitudNotas(e.target.value)} placeholder={t('search.additionalNotesPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" rows={2} />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleConfirmarSolicitud} disabled={enviandoSolicitud} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50">
                                {enviandoSolicitud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {t('search.confirmRequest')}
                              </button>
                              <button onClick={() => setSolicitudForm(null)} className="px-4 py-2.5 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium">{t('search.cancel')}</button>
                            </div>
                          </div>
                        ) : (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900">{t('search.needFullReport')}</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{t('search.requestDetailedInvestigation')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleMonitor({ cuit: sol.cuit, razon_social: sol.razon_social, tipo_identificacion: sol.tipo_identificacion, id: null })}
                                className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                                  monitorMap[sol.cuit]
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                                }`}
                                title={monitorMap[sol.cuit] ? t('search.stopFollowing') : t('search.followCompany')}
                              >
                                <Star className={`h-4 w-4 ${monitorMap[sol.cuit] ? 'fill-amber-500' : ''}`} />
                                <span className="hidden sm:inline">{monitorMap[sol.cuit] ? t('search.following') : t('search.follow')}</span>
                              </button>
                            <div className="relative" ref={openInformeDropdown === `sol-${sol.id}` ? dropdownRef : null}>
                              <button
                                onClick={() => setOpenInformeDropdown(openInformeDropdown === `sol-${sol.id}` ? null : `sol-${sol.id}`)}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {t('search.requestReport')}
                                <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform ${openInformeDropdown === `sol-${sol.id}` ? 'rotate-180' : ''}`} />
                              </button>
                              {openInformeDropdown === `sol-${sol.id}` && (
                                <>
                                  {/* Mobile: Modal centrado */}
                                  <div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpenInformeDropdown(null)} />
                                  <div className="sm:hidden fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                      <h3 className="font-semibold text-gray-900">{t('search.reportType')}</h3>
                                      <button onClick={() => setOpenInformeDropdown(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                                        <X size={18} className="text-gray-500" />
                                      </button>
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto">
                                      {tiposInforme.map((item) => {
                                        const balance = clientBalance[item.tipo] || 0
                                        const hayPack = packsDisponibles[item.tipo] || false
                                        const noDisponible = isClientUser && !hayPack && balance === 0
                                        const sinCreditos = isClientUser && hayPack && balance === 0
                                        const deshabilitado = noDisponible
                                        
                                        return (
                                        <button
                                          key={item.tipo}
                                          onClick={() => !deshabilitado && handleSelectTipoInforme(`sol-${sol.id}`, item.tipo, item.label, {
                                            cuit: sol.cuit,
                                            tipo_identificacion: sol.tipo_identificacion,
                                            razon_social: sol.razon_social,
                                            actividad_principal: sol.actividad_principal,
                                            domicilio: sol.domicilio,
                                          })}
                                          disabled={deshabilitado}
                                          className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 ${deshabilitado ? 'opacity-40 cursor-not-allowed' : sinCreditos ? 'opacity-70' : ''}`}
                                        >
                                          <item.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.color}`} />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                                              {isClientUser && (
                                                noDisponible ? (
                                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                                    No disponible
                                                  </span>
                                                ) : balance > 0 ? (
                                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                                    {balance} créditos
                                                  </span>
                                                ) : (
                                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                                    Sin créditos
                                                  </span>
                                                )
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500">{item.desc}</div>
                                          </div>
                                        </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  {/* Desktop: Dropdown normal */}
                                  <div className="hidden sm:block absolute right-0 bottom-full mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                    {tiposInforme.map((item) => {
                                      const balance = clientBalance[item.tipo] || 0
                                      const hayPack = packsDisponibles[item.tipo] || false
                                      const noDisponible = isClientUser && !hayPack && balance === 0
                                      const sinCreditos = isClientUser && hayPack && balance === 0
                                      const deshabilitado = noDisponible
                                      
                                      return (
                                      <button
                                        key={item.tipo}
                                        onClick={() => !deshabilitado && handleSelectTipoInforme(`sol-${sol.id}`, item.tipo, item.label, {
                                          cuit: sol.cuit,
                                          tipo_identificacion: sol.tipo_identificacion,
                                          razon_social: sol.razon_social,
                                          actividad_principal: sol.actividad_principal,
                                          domicilio: sol.domicilio,
                                        })}
                                        disabled={deshabilitado}
                                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 ${deshabilitado ? 'opacity-40 cursor-not-allowed' : sinCreditos ? 'opacity-70' : ''}`}
                                      >
                                        <item.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.color}`} />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                                            {isClientUser && (
                                              noDisponible ? (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                                  No disponible
                                                </span>
                                              ) : balance > 0 ? (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                                  {balance}
                                                </span>
                                              ) : (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                                  Sin créditos
                                                </span>
                                              )
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-500">{item.desc}</div>
                                        </div>
                                      </button>
                                      )
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                            </div>
                          </div>
                        </div>
                        )}
                        </>
                      )}

                      {sol.estado === 'pendiente' && (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">Solicitud en proceso</p>
                            <p className="text-xs text-amber-600">Tu solicitud está siendo procesada por nuestro equipo.</p>
                          </div>
                        </div>
                      )}

                      {sol.estado === 'completada' && (
                        <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-green-800">Informe disponible</p>
                              <p className="text-xs text-green-600">{isClientUser ? 'Puedes ver y descargar el informe desde Pedidos.' : 'El informe fue completado exitosamente.'}</p>
                            </div>
                          </div>
                          {!isClientUser && (
                            <button
                              onClick={() => onSelectEmpresa(null, 'view', sol.cuit)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                            >
                              <Eye className="h-4 w-4" /> {t('search.viewReport')}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Chequeo en tiempo real */}
                      <div className="mt-3">
                        {expandedChequeo !== sol.cuit ? (
                          <button
                            onClick={() => setExpandedChequeo(sol.cuit)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all text-sm font-semibold"
                          >
                            <Shield className="h-4 w-4" />
                            {t('search.realTimeCheck')}
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                          </button>
                        ) : (
                          <RealTimeCheck cuit={sol.cuit} />
                        )}
                      </div>

                      {/* Última actualización */}
                      {(sol.updated_at || sol.created_at) && (
                        <div className="text-xs text-gray-500 mt-3">
                          {t('search.lastUpdateLabel')}: {new Date(sol.updated_at || sol.created_at).toLocaleString(undefined, { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {solicitudesTotal > filteredSolicitudes.length && (
                <div className="text-center py-3 text-gray-500 text-sm">
                  {t('search.showingResults', { shown: filteredSolicitudes.length, total: solicitudesTotal })}
                </div>
              )}
            </div>
          </div>
          )
        })()}

        {/* Modal Sin Saldo - Comprar Pack */}
        {sinSaldoModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{t('search.noBalance')}</h3>
                    <p className="text-sm text-gray-600">
                      {t('search.noCreditsFor')} <span className="font-semibold">{sinSaldoModal.tipo_nombre}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isClienteAdmin ? (
                  <p className="text-sm text-gray-600 text-center py-4">
                    {sinSaldoModal.packs_sugeridos?.length > 0 ? (
                      <>
                        {t('search.packsAvailable', { count: sinSaldoModal.packs_sugeridos.length })}
                        <br />{t('search.goToPackStore')}
                      </>
                    ) : (
                      <>
                        {t('search.noPacksAvailable')}
                        <br />{t('search.contactSystemAdmin')}
                      </>
                    )}
                  </p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-3">
                      {t('search.teamNoCredits')}
                    </p>
                    <p className="text-sm text-amber-600 font-medium">
                      {t('search.contactCompanyAdmin')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setSinSaldoModal(null)
                    setSolicitudForm(null)
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition font-medium"
                >
                  {isClienteAdmin ? t('search.cancel') : t('search.close')}
                </button>
                {isClienteAdmin && (
                  <button
                    onClick={() => {
                      setSinSaldoModal(null)
                      setSolicitudForm(null)
                      // Navegar a la tienda de packs del portal
                      window.location.hash = '#informes?tienda=1'
                    }}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    {t('search.packStore')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente de resultado de consulta ──
function ExternalSearchResult({ result, onSolicitar, solicitando }) {
  const { t } = useTranslation()
  const [notas, setNotas] = useState('')
  const [emailSolicitante, setEmailSolicitante] = useState('')
  const [prioridadExt, setPrioridadExt] = useState('normal')
  const [tipoInformeExt, setTipoInformeExt] = useState('completo')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  if (!result) return null

  const hasDatos = result.razon_social || result.actividad_principal
  const bcraDeudas = result.bcra?.deudas
  const bcraCheques = result.bcra?.cheques

  const getSituacionColor = (sit) => {
    if (!sit) return 'text-gray-500'
    const n = parseInt(sit)
    if (n === 1) return 'text-green-600'
    if (n === 2) return 'text-yellow-600'
    if (n >= 3) return 'text-red-600'
    return 'text-gray-600'
  }

  // Si ya existe en BD, no mostrar nada (no debería llegar aquí)
  if (result.existe_en_bd) return null

  if (!hasDatos) {
    const digits = (result.cuit || '').replace(/\D/g, '')
    const idLabel = result.tipo_identificacion || (digits.length === 11 ? 'CUIT' : digits.length === 12 ? 'RUT' : digits.length === 9 ? 'RNC' : 'ID fiscal')
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-2xl p-6 sm:p-12 border-2 border-gray-200 max-w-2xl mx-auto">
          <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-base sm:text-2xl font-semibold text-gray-700 mb-2">
            No existe información del {idLabel} {result.cuit} consultado
          </h2>
          <p className="text-gray-500">
            No se encontraron datos en fuentes públicas para este identificador
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tarjeta principal — estilo idéntico a resultados normales */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Header con razón social */}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              {result.razon_social && (
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{result.razon_social}</h3>
              )}
              <p className="text-sm text-gray-500 font-mono">
                {(() => {
                  const tipoId = result.tipo_identificacion || (result.cuit?.length === 12 ? 'RUT' : result.cuit?.length === 9 ? 'RNC' : 'CUIT')
                  const formatted = tipoId === 'CUIT' && result.cuit?.length === 11
                    ? `${result.cuit.slice(0,2)}-${result.cuit.slice(2,10)}-${result.cuit.slice(10)}`
                    : result.cuit
                  return `${tipoId}: ${formatted}`
                })()}
              </p>
            </div>
            {result.estado_afip && (() => {
              const estado = result.estado_afip.toUpperCase()
              const isActive = result.estado_activo
              const isWarning = !isActive && (estado.includes('VENCID') || estado.includes('SUSPEND') || estado.includes('NO HAB'))
              const colorClass = isActive
                ? 'bg-green-100 text-green-700'
                : isWarning
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              const dotClass = isActive ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  {result.estado_afip}
                </span>
              )
            })()}
          </div>

          {/* Datos de la empresa */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {result.actividad_principal && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Actividad</p>
                  <p className="text-sm text-gray-700">{result.actividad_principal}</p>
                </div>
              </div>
            )}
            {result.domicilio && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Domicilio</p>
                  <p className="text-sm text-gray-700">{result.domicilio}</p>
                </div>
              </div>
            )}
            {result.tipo_contribuyente && (
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Tipo</p>
                  <p className="text-sm text-gray-700">{result.tipo_contribuyente}</p>
                </div>
              </div>
            )}
            {result.condicion && (
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Condición Domicilio</p>
                  <p className={`text-sm font-medium ${result.condicion === 'HABIDO' ? 'text-green-600' : 'text-red-600'}`}>{result.condicion}</p>
                </div>
              </div>
            )}
            {result.departamento && result.departamento !== '-' && (
              <div className="flex items-start gap-2">
                <MapPinned className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Departamento</p>
                  <p className="text-sm text-gray-700">{result.departamento}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BCRA */}
        {bcraDeudas?.disponible && (
          <div className="border-t bg-gray-50 px-5 sm:px-6 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Situación Crediticia</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-gray-400">Situación</p>
                <p className={`text-sm font-bold ${getSituacionColor(bcraDeudas.peor_situacion)}`}>
                  {bcraDeudas.peor_situacion || 'Sin datos'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Entidades</p>
                <p className="text-sm font-medium text-gray-700">{bcraDeudas.cantidad_entidades || 0}</p>
              </div>
              {bcraDeudas.monto_total_deuda > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400">Deuda Total</p>
                  <p className="text-sm font-medium text-gray-700">
                    ${Number(bcraDeudas.monto_total_deuda).toLocaleString('es-AR')}
                  </p>
                </div>
              )}
            </div>
            {bcraCheques?.tiene_cheques_rechazados && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" />
                Cheques rechazados registrados
              </div>
            )}
          </div>
        )}

        {/* CTA — Solicitar informe completo */}
        {!result.solicitud_pendiente && (
          <div className="border-t bg-blue-50 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-0.5">
                  {t('search.needFullReport')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('search.requestDetailedInvestigation')}
                </p>
              </div>
              <div className="flex-shrink-0 w-full sm:w-auto">
                {!mostrarFormulario ? (
                  <button
                    onClick={() => setMostrarFormulario(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap w-full sm:w-auto justify-center"
                  >
                    <Send className="h-4 w-4" />
                    {t('search.requestReport')}
                  </button>
                ) : null}
              </div>
            </div>
            {mostrarFormulario && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.contactEmailOptional')}</label>
                  <input
                    type="email"
                    value={emailSolicitante}
                    onChange={(e) => setEmailSolicitante(e.target.value)}
                    placeholder="cliente@empresa.com"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  />
                </div>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder={t('search.additionalNotesPlaceholder')}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  rows={2}
                />
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('search.priority')}</label>
                  <div className="flex gap-2">
                    {[
                      { val: 'baja', labelKey: 'search.priorityLow', color: 'border-gray-300 text-gray-600 bg-gray-50', active: 'border-gray-500 bg-gray-100 ring-1 ring-gray-400' },
                      { val: 'normal', labelKey: 'search.priorityNormal', color: 'border-blue-200 text-blue-700 bg-blue-50', active: 'border-blue-500 bg-blue-100 ring-1 ring-blue-400' },
                      { val: 'alta', labelKey: 'search.priorityHigh', color: 'border-orange-200 text-orange-700 bg-orange-50', active: 'border-orange-500 bg-orange-100 ring-1 ring-orange-400' },
                      { val: 'urgente', labelKey: 'search.priorityUrgent', color: 'border-red-200 text-red-700 bg-red-50', active: 'border-red-500 bg-red-100 ring-1 ring-red-400' },
                    ].map(p => (
                      <button key={p.val} type="button" onClick={() => setPrioridadExt(p.val)}
                        className={`flex-1 px-2 py-1.5 border rounded-lg text-xs font-medium transition-all ${prioridadExt === p.val ? p.active : p.color + ' hover:opacity-80'}`}>
                        {t(p.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('request.title')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { val: 'reducido', labelKey: 'reportTypes.reducido.label', color: 'border-blue-200 text-blue-700 bg-blue-50', active: 'border-blue-500 bg-blue-100 ring-1 ring-blue-400' },
                      { val: 'completo', labelKey: 'reportTypes.completo.label', color: 'border-indigo-200 text-indigo-700 bg-indigo-50', active: 'border-indigo-500 bg-indigo-100 ring-1 ring-indigo-400' },
                      { val: 'historico', labelKey: 'reportTypes.historico.label', color: 'border-purple-200 text-purple-700 bg-purple-50', active: 'border-purple-500 bg-purple-100 ring-1 ring-purple-400' },
                      { val: 'actualizado', labelKey: 'reportTypes.actualizado.label', color: 'border-orange-200 text-orange-700 bg-orange-50', active: 'border-orange-500 bg-orange-100 ring-1 ring-orange-400' },
                    ].map(tipo => (
                      <button key={tipo.val} type="button" onClick={() => setTipoInformeExt(tipo.val)}
                        className={`flex-1 min-w-[80px] px-2 py-1.5 border rounded-lg text-xs font-medium transition-all ${tipoInformeExt === tipo.val ? tipo.active : tipo.color + ' hover:opacity-80'}`}>
                        {t(tipo.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onSolicitar(notas, emailSolicitante, prioridadExt, tipoInformeExt); }}
                    disabled={solicitando}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {solicitando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('search.confirmRequest')}
                  </button>
                  <button
                    onClick={() => setMostrarFormulario(false)}
                    className="px-4 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    {t('search.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ya tiene solicitud */}
        {result.solicitud_pendiente && (
          <div className="border-t bg-green-50 px-5 sm:px-6 py-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              {t('search.reportRequested')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Country Filter Button (tab con dropdown de banderas) ── */
function CountryFilterButton({ active, value, onChange, onClear, countries }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = value !== 'all'
  const iso = selected ? COUNTRY_ISO[value] : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`min-w-[70px] sm:min-w-[90px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
          active && selected
            ? 'bg-inforysk-red-600 text-white shadow-md'
            : active
              ? 'bg-inforysk-red-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {selected && iso ? (
          <img src={`https://flagcdn.com/20x15/${iso}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
        {selected ? (value === 'Desconocido' ? 'Internacional' : value) : t('search.byCountry')}
        {selected ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false) }}
            className="ml-0.5 p-0.5 rounded hover:bg-inforysk-red-700 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {countries.map(pais => {
              const code = COUNTRY_ISO[pais]
              const displayName = pais === 'Desconocido' ? 'Internacional' : pais
              return (
                <button
                  key={pais}
                  onClick={() => { onChange(pais); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-inforysk-red-50 transition-colors ${value === pais ? 'bg-inforysk-red-50 font-semibold text-inforysk-red-700' : 'text-gray-700'}`}
                >
                  {code ? (
                    <img src={`https://flagcdn.com/24x18/${code}.png`} alt="" className="w-6 h-4 rounded-sm object-cover" />
                  ) : (
                    <Globe className="h-4 w-4 text-gray-400" />
                  )}
                  {displayName}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchView
