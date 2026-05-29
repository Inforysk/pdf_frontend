import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Star, Bell, BellOff, Eye, Trash2, Loader2, ChevronLeft, ChevronRight, RefreshCw, Shield, AlertTriangle, CheckCircle2, XCircle, TrendingDown, TrendingUp, X, Clock, Filter, Activity, CreditCard } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const TIPO_TO_PAIS = {
  CUIT: 'Argentina', RUC: 'Peru', RUT: 'Uruguay', RNC: 'Rep. Dominicana',
  NIT: 'Colombia', RTN: 'Honduras', 'CEDULA JURIDICA': 'Costa Rica',
  CNPJ: 'Brasil', RFC: 'Mexico', HRB: 'Alemania', DPI: 'Guatemala',
}
const COUNTRY_ISO = {
  'Argentina': 'ar', 'Uruguay': 'uy', 'Brasil': 'br', 'Chile': 'cl',
  'Peru': 'pe', 'Colombia': 'co', 'Mexico': 'mx', 'Rep. Dominicana': 'do',
  'Honduras': 'hn', 'Costa Rica': 'cr', 'Guatemala': 'gt', 'Alemania': 'de',
  'Jamaica': 'jm', 'Saint Lucia': 'lc', 'Barbados': 'bb', 'Bahamas': 'bs', 'Trinidad y Tobago': 'tt',
}

const ESTADO_CONFIG = {
  estable: { key: 'stable', bg: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', icon: CheckCircle2 },
  en_riesgo: { key: 'atRisk', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: AlertTriangle },
  critico: { key: 'critical', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: XCircle },
  sin_datos: { key: 'noData', bg: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400', icon: Clock },
}

const SEVERIDAD_COLOR = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

// Mapeo de títulos de eventos a claves de traducción (sin emojis)
const EVENT_TITLE_MAP = {
  'Score disminuyó': 'scoreDecreased',
  'Score subió': 'scoreIncreased',
  'Primer scoring calculado': 'firstScoring',
  'Alerta crítica': 'criticalAlert',
  'Cambio detectado': 'changeDetected',
  'Empresa actualizada': 'companyUpdated',
}

// Función para limpiar emojis de un texto
function stripEmojis(text) {
  if (!text) return ''
  return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📉|📈|📊|🚨|🔄|✅/gu, '').trim()
}

// Función para traducir eventos del timeline
function translateEventTitle(titulo, t) {
  if (!titulo) return ''
  const cleanTitle = stripEmojis(titulo)
  const key = EVENT_TITLE_MAP[cleanTitle]
  if (key) {
    return t(`monitoring.events.${key}`)
  }
  return titulo // Fallback al texto original
}

function translateEventDescription(descripcion, empresa, t) {
  if (!descripcion) return null
  
  // Patrones conocidos de descripciones
  if (descripcion.includes('El score ha cambiado')) {
    return t('monitoring.events.scoreChangedDesc')
  }
  if (descripcion.includes('Score inicial de')) {
    const match = descripcion.match(/Score inicial de (\d+) puntos/)
    if (match) {
      return t('monitoring.events.initialScoreDesc', { score: match[1] })
    }
  }
  
  return descripcion // Fallback al texto original
}

function getScoreColor(score) {
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-300'
  if (score >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-300'
  if (score >= 40) return 'bg-orange-50 text-orange-700 border-orange-300'
  return 'bg-red-50 text-red-700 border-red-300'
}

// Componente de Tendencia
function TendenciaIndicator({ scoreActual, scoreInicial }) {
  const { t } = useTranslation()
  // Si no hay score actual o inicial, mostrar pendiente
  if (scoreActual == null || scoreInicial == null) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        {t('monitoring.noData')}
      </span>
    )
  }
  
  const actual = parseFloat(scoreActual)
  const inicial = parseFloat(scoreInicial)
  const diff = actual - inicial
  
  // Sin cambios significativos (±1 punto, consistente con alertas)
  if (Math.abs(diff) < 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
        {t('monitoring.noChanges')}
      </span>
    )
  }
  
  // Subió
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
        <TrendingUp className="h-3.5 w-3.5" />
        {t('monitoring.wentUp')}
      </span>
    )
  }
  
  // Bajó
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      <TrendingDown className="h-3.5 w-3.5" />
      {t('monitoring.wentDown')}
    </span>
  )
}

export default function MonitoreoView() {
  const { t } = useTranslation()
  const [empresas, setEmpresas] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [conAlertas, setConAlertas] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  // Modal de confirmación de alertas
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [costoMonitoreo, setCostoMonitoreo] = useState(1)
  const [activandoAlertas, setActivandoAlertas] = useState(false)
  
  // Modal de confirmación para eliminar monitoreo
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [empresaToDelete, setEmpresaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Cargar costo de monitoreo al inicio
  useEffect(() => {
    axios.get('/api/portal/monitoreo/costo-alertas')
      .then(r => { if (r.data.success) setCostoMonitoreo(r.data.costo) })
      .catch(() => {})
  }, [])

  const loadEmpresas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('per_page', perPage)
      if (estadoFilter) params.set('estado', estadoFilter)
      if (searchTerm.trim()) params.set('q', searchTerm.trim())
      if (conAlertas) params.set('con_alertas', '1')
      const res = await axios.get(`/api/portal/monitoreo?${params}`)
      if (res.data.success) {
        setEmpresas(res.data.empresas || [])
        setTotal(res.data.total || 0)
        setTotalPages(res.data.total_pages || 1)
        setStats(res.data.stats || {})
      }
    } catch { toast.error(t('common.errorLoading')) }
    finally { setLoading(false) }
  }, [page, perPage, estadoFilter, searchTerm, conAlertas])

  useEffect(() => { loadEmpresas() }, [loadEmpresas])

  const handleToggleAlertas = async (emp) => {
    try {
      console.log('Toggle alertas para empresa:', emp.id, 'detailData:', detailData?.id)
      const res = await axios.put(`/api/portal/monitoreo/${emp.id}/toggle-alertas`)
      console.log('Respuesta toggle:', res.data)
      if (res.data.success) {
        setEmpresas(prev => prev.map(e => e.id === emp.id ? { ...e, alertas_activas: res.data.alertas_activas } : e))
        // También actualizar detailData si es la misma empresa
        if (detailData && detailData.id === emp.id) {
          console.log('Actualizando detailData con alertas_activas:', res.data.alertas_activas)
          setDetailData(prev => ({ ...prev, alertas_activas: res.data.alertas_activas }))
        }
        toast.success(res.data.alertas_activas ? t('monitoring.alertsActivated') : t('monitoring.alertsDeactivated'))
      }
    } catch { toast.error(t('common.error')) }
  }

  const handleDejarMonitorear = (emp) => {
    setEmpresaToDelete(emp)
    setShowDeleteModal(true)
  }

  const confirmDeleteMonitoreo = async () => {
    if (!empresaToDelete) return
    setDeleting(true)
    try {
      await axios.delete(`/api/portal/monitoreo/${empresaToDelete.id}`)
      setEmpresas(prev => prev.filter(e => e.id !== empresaToDelete.id))
      setTotal(prev => prev - 1)
      toast.success(t('monitoring.companyRemoved'))
      setShowDeleteModal(false)
      setEmpresaToDelete(null)
    } catch { toast.error(t('common.errorDeleting')) }
    finally { setDeleting(false) }
  }

  const cancelDeleteMonitoreo = () => {
    setShowDeleteModal(false)
    setEmpresaToDelete(null)
  }

  const openDetail = async (emp) => {
    setDetailId(emp.id)
    setDetailLoading(true)
    try {
      const res = await axios.get(`/api/portal/monitoreo/${emp.id}/detalle`)
      if (res.data.success) {
        setDetailData(res.data.empresa)
        // Si se marcaron alertas como leídas, actualizar el badge del sidebar
        if (res.data.empresa.alertas_marcadas_leidas > 0) {
          window.dispatchEvent(new CustomEvent('monitoreo-alertas-leidas'))
        }
        // Actualizar el estado de la empresa en la lista
        setEmpresas(prev => prev.map(e => 
          e.id === emp.id ? { 
            ...e, 
            alertas_sin_leer: Math.max(0, (e.alertas_sin_leer || 0) - (res.data.empresa.alertas_marcadas_leidas || 0)),
            alertas_activas: res.data.empresa.alertas_activas  // Actualizar estado de alertas
          } : e
        ))
      }
    } catch { toast.error(t('common.errorLoading')) }
    finally { setDetailLoading(false) }
  }

  // Cierre del panel de detalle - muestra modal si alertas están desactivadas
  const handleCloseDetail = () => {
    if (detailData && !detailData.alertas_activas) {
      setShowConfirmModal(true)
    } else {
      setDetailId(null)
      setDetailData(null)
    }
  }

  // Cerrar sin activar alertas
  const handleCloseWithoutAlerts = () => {
    setShowConfirmModal(false)
    setDetailId(null)
    setDetailData(null)
  }

  // Activar alertas con cobro de crédito
  const handleActivarAlertas = async () => {
    if (!detailData) return
    setActivandoAlertas(true)
    try {
      const res = await axios.post(`/api/portal/monitoreo/${detailData.id}/activar-alertas`)
      if (res.data.success) {
        toast.success(t('monitoring.alertsActivated'))
        setEmpresas(prev => prev.map(e => e.id === detailData.id ? { ...e, alertas_activas: true } : e))
        setDetailData(prev => ({ ...prev, alertas_activas: true }))
        setShowConfirmModal(false)
        setDetailId(null)
        setDetailData(null)
      } else {
        toast.error(res.data.error || t('common.error'))
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.error'))
    } finally {
      setActivandoAlertas(false)
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('monitoring.title')}</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('monitoring.subtitle')}</p>
        </div>
        <button onClick={loadEmpresas} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold w-full sm:w-auto">
          <RefreshCw className="h-4 w-4" /> {t('orders.refresh')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{t('monitoring.monitoredCompanies')}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.estables || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{t('monitoring.stable')}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.en_riesgo || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{t('monitoring.atRisk')}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.criticos || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{t('monitoring.critical')}</div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.alertas_mes || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{t('monitoring.alerts')}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
              placeholder={t('orders.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1) }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">{t('monitoring.allStates')}</option>
            <option value="estable">{t('monitoring.stable')}</option>
            <option value="en_riesgo">{t('monitoring.atRisk')}</option>
            <option value="critico">{t('monitoring.critical')}</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={conAlertas} onChange={e => { setConAlertas(e.target.checked); setPage(1) }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700 whitespace-nowrap">{t('monitoring.withAlerts')}</span>
          </label>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : empresas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('monitoring.noCompanies')}</h3>
          <p className="text-sm text-gray-500">{t('monitoring.noCompaniesHint')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.company')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('monitoring.scoreChange')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.status')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('monitoring.alerts')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.date')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empresas.map(emp => {
                  const pais = TIPO_TO_PAIS[emp.tipo_identificacion] || null
                  const iso = pais ? COUNTRY_ISO[pais] : null
                  const cfg = ESTADO_CONFIG[emp.estado_riesgo] || ESTADO_CONFIG.estable

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {iso && <img src={`https://flagcdn.com/20x15/${iso}.png`} alt="" className="w-5 h-3.5 rounded-sm" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate max-w-[250px]">{emp.razon_social || '—'}</p>
                            <p className="text-xs font-mono text-blue-600">{emp.cuit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <TendenciaIndicator scoreActual={emp.score_actual} scoreInicial={emp.score_inicial} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {t(`monitoring.${cfg.key}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {emp.alertas_sin_leer > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              <Bell className="h-3 w-3" /> {emp.alertas_sin_leer}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{t('monitoring.noData')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-gray-500">{formatDate(emp.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openDetail(emp)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title={t('monitoring.viewDetails')}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleToggleAlertas(emp)} className={`p-2 rounded-lg ${emp.alertas_activas ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-gray-100 text-gray-400'}`}
                            title={emp.alertas_activas ? t('monitoring.disableAlerts') : t('monitoring.enableAlerts')}>
                            {emp.alertas_activas ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                          </button>
                          <button onClick={() => handleDejarMonitorear(emp)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600" title={t('monitoring.stopMonitoring')}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden divide-y divide-gray-100">
            {empresas.map(emp => {
              const pais = TIPO_TO_PAIS[emp.tipo_identificacion] || null
              const iso = pais ? COUNTRY_ISO[pais] : null
              const cfg = ESTADO_CONFIG[emp.estado_riesgo] || ESTADO_CONFIG.estable

              return (
                <div key={emp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {iso && <img src={`https://flagcdn.com/16x12/${iso}.png`} alt="" className="w-4 h-3 rounded-sm flex-shrink-0" />}
                        <span className="text-xs font-mono text-blue-700 font-semibold">{emp.cuit}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-2">{emp.razon_social || '—'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border flex-shrink-0 ${cfg.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {t(`monitoring.${cfg.key}`)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="whitespace-nowrap">Desde {formatDate(emp.created_at)}</span>
                    <TendenciaIndicator scoreActual={emp.score_actual} scoreInicial={emp.score_inicial} />
                    {emp.alertas_sin_leer > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                        <Bell className="h-3 w-3" /> {emp.alertas_sin_leer}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDetail(emp)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                      <Eye className="h-3.5 w-3.5" /> {t('monitoring.viewDetails')}
                    </button>
                    <button onClick={() => handleToggleAlertas(emp)} className={`px-3 py-2.5 rounded-lg text-xs font-medium ${emp.alertas_activas ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {emp.alertas_activas ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => handleDejarMonitorear(emp)} className="px-3 py-2.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">{total} empresa{total !== 1 ? 's' : ''} — Página {page} de {totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel de detalle slide-in */}
      {detailId && (() => {
        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={handleCloseDetail}>
              <div className="w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <h3 className="text-lg font-bold text-gray-900">{t('monitoring.detailTitle')}</h3>
                  <button onClick={handleCloseDetail} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
                </div>

                {detailLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
                ) : detailData ? (
                  <div className="p-6 space-y-6">
                    {/* Info empresa */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {(() => { const p = TIPO_TO_PAIS[detailData.tipo_identificacion]; const i = p ? COUNTRY_ISO[p] : null; return i ? <img src={`https://flagcdn.com/20x15/${i}.png`} alt="" className="w-5 h-3.5 rounded-sm" /> : null })()}
                        <span className="text-xs font-mono text-blue-600">{detailData.cuit}</span>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">{detailData.razon_social || '—'}</h4>
                      <p className="text-xs text-gray-500 mt-1">{t('monitoring.monitoredSince', { date: formatDate(detailData.created_at) })}</p>
                    </div>

                    {/* Score comparativo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">{t('monitoring.trend')}</p>
                        <div className="py-2">
                          <TendenciaIndicator scoreActual={detailData.score_actual} scoreInicial={detailData.score_inicial} />
                        </div>
                        {detailData.score_actual != null && detailData.score_snapshot != null && (
                          <p className="text-[10px] text-gray-400 mt-2">
                            {t('monitoring.requestNewReportHint')}
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">{t('monitoring.initialScore')}</p>
                        {detailData.score_snapshot != null ? (
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-2xl font-bold border ${getScoreColor(parseFloat(detailData.score_snapshot))}`}>
                            {Math.round(parseFloat(detailData.score_snapshot))}
                          </span>
                        ) : <span className="text-gray-400 text-lg">—</span>}
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center gap-3">
                      {(() => {
                        const cfg = ESTADO_CONFIG[detailData.estado_riesgo] || ESTADO_CONFIG.estable
                        const Icon = cfg.icon
                        return (
                          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${cfg.bg}`}>
                            <Icon className="h-5 w-5" />
                            <span className="text-sm font-semibold">{t(`monitoring.${cfg.key}`)}</span>
                          </div>
                        )
                      })()}
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleAlertas(detailData)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${detailData.alertas_activas ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {detailData.alertas_activas ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                          {detailData.alertas_activas ? t('monitoring.alertsOn') : t('monitoring.alertsOff')}
                        </button>
                      </div>
                    </div>

                    {/* Config */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs text-gray-500 uppercase font-semibold">{t('monitoring.configuration')}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('monitoring.alertFrequency')}</span>
                        <span className="font-semibold text-gray-900 capitalize">{t(`monitoring.${detailData.frecuencia_alerta || 'daily'}`)}</span>
                      </div>
                      {detailData.email_alerta && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Email</span>
                          <span className="font-semibold text-gray-900">{detailData.email_alerta}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('monitoring.lastCheck')}</span>
                        <span className="font-semibold text-gray-900">{formatDateTime(detailData.ultimo_chequeo)}</span>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-3">{t('monitoring.eventsTimeline')}</p>
                      {detailData.timeline && detailData.timeline.length > 0 ? (
                        <div className="space-y-3">
                          {detailData.timeline.map(ev => (
                            <div key={ev.id} className={`rounded-xl p-3 border ${ev.leida ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SEVERIDAD_COLOR[ev.severidad] || SEVERIDAD_COLOR.info}`}>
                                      {t(`monitoring.severity.${ev.severidad || 'info'}`)}
                                    </span>
                                    <span className="text-xs text-gray-500">{formatDateTime(ev.created_at)}</span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900">{translateEventTitle(ev.titulo, t)}</p>
                                  {ev.descripcion && <p className="text-xs text-gray-600 mt-1">{translateEventDescription(ev.descripcion, detailData.razon_social, t)}</p>}
                                </div>
                                {!ev.leida && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{t('monitoring.noEventsTitle')}</p>
                          <p className="text-xs mt-1">{t('monitoring.noEventsDesc')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )
      })()}

      {/* Modal de confirmación para activar alertas */}
      {showConfirmModal && detailData && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={handleCloseWithoutAlerts}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {t('monitoring.activateAlertsTitle')}
              </h3>
              
              {/* Info de la empresa */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900">{detailData.razon_social || t('monitoring.noName')}</p>
                <p className="text-xs text-gray-500 font-mono">{detailData.tipo_identificacion}: {detailData.cuit}</p>
              </div>
              
              <p className="text-sm text-gray-600 text-center mb-4">
                {t('monitoring.activateAlertsDesc')}
              </p>
              
              {/* Costo */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{t('monitoring.serviceCost')}</p>
                    <p className="text-xs text-amber-700">
                      {t('monitoring.serviceCostDesc', { cost: costoMonitoreo })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseWithoutAlerts}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  {t('monitoring.continueWithoutAlerts')}
                </button>
                <button
                  onClick={handleActivarAlertas}
                  disabled={activandoAlertas}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {activandoAlertas ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Bell className="h-5 w-5" />
                      {t('monitoring.activateAlerts')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar monitoreo */}
      {showDeleteModal && empresaToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={cancelDeleteMonitoreo}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {t('monitoring.confirmDeleteTitle')}
              </h3>
              
              {/* Info de la empresa */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const pais = TIPO_TO_PAIS[empresaToDelete.tipo_identificacion]
                    const iso = pais ? COUNTRY_ISO[pais] : null
                    return iso ? <img src={`https://flagcdn.com/20x15/${iso}.png`} alt="" className="w-5 h-3.5 rounded-sm" /> : null
                  })()}
                  <span className="text-xs font-mono text-blue-600">{empresaToDelete.cuit}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{empresaToDelete.razon_social || t('monitoring.noName')}</p>
              </div>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                {t('monitoring.confirmDeleteDesc')}
              </p>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteMonitoreo}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  {t('monitoring.cancel')}
                </button>
                <button
                  onClick={confirmDeleteMonitoreo}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      {t('monitoring.confirmDelete')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
