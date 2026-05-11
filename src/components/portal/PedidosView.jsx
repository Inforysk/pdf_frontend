import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, FileText, Loader2, ChevronLeft, ChevronRight, Download, Eye, Clock, CheckCircle2, AlertTriangle, Filter, Zap, Code2, RefreshCw, ChevronDown, Star } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const TIPO_TO_PAIS = {
  CUIT: 'AR', RUC: 'PE', RUT: 'UY', RNC: 'DO',
  NIT: 'CO', RTN: 'HN', 'CEDULA JURIDICA': 'CR',
  CNPJ: 'BR', RFC: 'MX', HRB: 'DE', DPI: 'GT',
}

const COUNTRY_ISO = {
  'AR': 'ar', 'UY': 'uy', 'BR': 'br', 'CL': 'cl',
  'CO': 'co', 'PE': 'pe', 'DO': 'do', 'HN': 'hn',
  'MX': 'mx', 'CR': 'cr', 'DE': 'de', 'GT': 'gt',
}

const ESTADO_CONFIG = {
  pendiente: { key: 'pending', bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  en_proceso: { key: 'inProgress', bg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  completada: { key: 'completed', bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  cancelada: { key: 'cancelled', bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const extractTipoInforme = (notas) => {
  if (!notas) return null
  const match = notas.match(/Tipo:\s*(Informe \w+|Solicitar API)/i)
  return match ? match[1] : null
}

// Mapeo de tipos de informe a claves de traducción (códigos del campo tipo_informe + legacy de notas)
const REPORT_TYPE_MAP = {
  // Códigos nuevos (del campo tipo_informe)
  'completo': 'fullReport',
  'reducido': 'basicReport',
  'historico': 'historicReport',
  'actualizado': 'updatedReport',
  'api': 'apiRequest',
  // Legacy (extraídos de notas antiguas)
  'Informe completo': 'fullReport',
  'Informe básico': 'basicReport',
  'Informe simple': 'simpleReport',
  'Solicitar API': 'apiRequest',
}

// Función para traducir tipo de informe
function translateReportType(tipo, t) {
  if (!tipo) return null
  const key = REPORT_TYPE_MAP[tipo]
  if (key) {
    return t(`orders.reportTypes.${key}`)
  }
  return tipo // Fallback al texto original
}

export default function PedidosView({ onViewEmpresa }) {
  const { t } = useTranslation()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [detailOpen, setDetailOpen] = useState(null) // id of open detail
  const [openPdfDrop, setOpenPdfDrop] = useState(null)
  const [pdfDropPos, setPdfDropPos] = useState({ top: 0, left: 0 })

  const handlePdfDropToggle = (pedidoId, e) => {
    if (openPdfDrop === pedidoId) {
      setOpenPdfDrop(null)
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setPdfDropPos({ top: rect.bottom + 4, left: rect.right - 160 })
      setOpenPdfDrop(pedidoId)
    }
  }

  const handleDownloadPDF = async (pedido, lang = 'es') => {
    setOpenPdfDrop(null)
    try {
      toast.loading('Generando PDF...', { id: 'pdf-gen' })
      const res = await axios.get(`/api/empresas/${pedido.empresa_id}/pdf?lang=${lang}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${(pedido.razon_social || pedido.cuit).replace(/[^a-zA-Z0-9]/g, '_')}_${lang}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado', { id: 'pdf-gen' })
    } catch (err) {
      if (err.response?.status !== 403) toast.error('Error al generar PDF', { id: 'pdf-gen' })
      else toast.dismiss('pdf-gen')
    }
  }

  const loadPedidos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('per_page', perPage)
      if (estadoFilter) params.set('estado', estadoFilter)
      if (searchTerm.trim()) params.set('q', searchTerm.trim())
      const res = await axios.get(`/api/portal/pedidos?${params}`)
      if (res.data.success) {
        setPedidos(res.data.pedidos || [])
        setTotal(res.data.total || 0)
        setTotalPages(res.data.total_pages || 1)
      }
    } catch {
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, estadoFilter, searchTerm])

  useEffect(() => {
    loadPedidos()
  }, [loadPedidos])

  // Verificar monitoreo de CUITs después de cargar pedidos
  const [monitorMap, setMonitorMap] = useState({})
  useEffect(() => {
    if (pedidos.length > 0) {
      const cuits = [...new Set(pedidos.map(p => p.cuit).filter(Boolean))]
      if (cuits.length) {
        axios.post('/api/portal/monitoreo/check-cuits', { cuits })
          .then(r => { if (r.data.success) setMonitorMap(r.data.monitoreados) })
          .catch(() => {})
      }
    }
  }, [pedidos])

  const handleToggleMonitor = async (pedido) => {
    const cuit = pedido.cuit
    if (monitorMap[cuit]) {
      try {
        await axios.post('/api/portal/monitoreo/dejar-cuit', { cuit })
        setMonitorMap(prev => { const n = { ...prev }; delete n[cuit]; return n })
        toast.success('Empresa removida del monitoreo')
      } catch { toast.error('Error') }
    } else {
      try {
        const res = await axios.post('/api/portal/monitoreo/seguir', {
          cuit, razon_social: pedido.razon_social,
          tipo_identificacion: pedido.tipo_identificacion,
          empresa_id: pedido.empresa_id,
        })
        if (res.data.success) {
          setMonitorMap(prev => ({ ...prev, [cuit]: { id: res.data.id, alertas_activas: true } }))
          toast.success('Empresa agregada al monitoreo')
        }
      } catch { toast.error('Error') }
    }
  }

  useEffect(() => {
    setPage(1)
  }, [searchTerm, estadoFilter, perPage])

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{t('orders.subtitle')}</p>
        </div>
        <button
          onClick={loadPedidos}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          {t('orders.refresh')}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{t('orders.total')}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-amber-600">{pedidos.filter(p => p.estado === 'pendiente').length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{t('orders.pending')}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{pedidos.filter(p => p.estado === 'en_proceso').length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{t('orders.inProgress')}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-green-600">{pedidos.filter(p => p.estado === 'completada').length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{t('orders.completed')}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-red-600">{pedidos.filter(p => p.estado === 'cancelada').length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{t('orders.cancelled')}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">{t('orders.allStatuses')}</option>
              <option value="pendiente">{t('orders.status.pending')}</option>
              <option value="en_proceso">{t('orders.status.inProgress')}</option>
              <option value="completada">{t('orders.status.completed')}</option>
              <option value="cancelada">{t('orders.status.cancelled')}</option>
            </select>
            <select
              value={perPage}
              onChange={e => setPerPage(Number(e.target.value))}
              className="w-16 sm:w-auto px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('orders.noOrders')}</h3>
          <p className="text-sm text-gray-500">{t('orders.noOrdersHint')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.date')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.fiscalId')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.company')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.type')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.score')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.status')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orders.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pedidos.map((pedido) => {
                  const pais = TIPO_TO_PAIS[pedido.tipo_identificacion] || null
                  const iso = pais ? COUNTRY_ISO[pais] : null
                  const estadoCfg = ESTADO_CONFIG[pedido.estado] || { key: pedido.estado, bg: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' }
                  // Usar tipo_informe del campo dedicado, fallback a extraer de notas para compatibilidad
                  const tipoInforme = pedido.tipo_informe || extractTipoInforme(pedido.notas)
                  const paisNombre = pais ? t(`countries.${pais}`) : null

                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(pedido.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {iso && <img src={`https://flagcdn.com/16x12/${iso}.png`} alt="" className="w-4 h-3 rounded-sm" />}
                          <span className="text-sm font-mono font-semibold text-blue-700">{pedido.cuit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[250px]">{pedido.razon_social || '—'}</p>
                        {paisNombre && <p className="text-xs text-gray-500">{paisNombre}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {tipoInforme ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                            {translateReportType(tipoInforme, t)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {pedido.score !== undefined && pedido.score !== null ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border ${getScoreColor(pedido.score)}`}>
                            {Math.round(pedido.score)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoCfg.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                          {t(`orders.status.${estadoCfg.key}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleToggleMonitor(pedido)}
                            className={`p-1.5 rounded-lg transition-colors ${monitorMap[pedido.cuit] ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'}`}
                            title={monitorMap[pedido.cuit] ? t('monitoring.stopMonitoring') : t('monitoring.follow')}
                          >
                            <Star className={`h-4 w-4 ${monitorMap[pedido.cuit] ? 'fill-amber-400' : ''}`} />
                          </button>
                          {pedido.estado === 'completada' && pedido.empresa_id ? (
                            <>
                              <button
                                onClick={() => setDetailOpen(detailOpen === pedido.id ? null : pedido.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" /> {t('common.view')}
                              </button>
                              <div className="relative">
                                <button
                                  onClick={(e) => handlePdfDropToggle(pedido.id, e)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                                >
                                  <Download className="h-3.5 w-3.5" /> PDF <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => setDetailOpen(detailOpen === pedido.id ? null : pedido.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                              <FileText className="h-3.5 w-3.5" /> {t('common.details')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {pedidos.map((pedido) => {
              const pais = TIPO_TO_PAIS[pedido.tipo_identificacion] || null
              const iso = pais ? COUNTRY_ISO[pais] : null
              const estadoCfg = ESTADO_CONFIG[pedido.estado] || { key: pedido.estado, bg: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' }
              const tipoInforme = pedido.tipo_informe || extractTipoInforme(pedido.notas)

              return (
                <div key={pedido.id} className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        {iso && <img src={`https://flagcdn.com/16x12/${iso}.png`} alt="" className="w-4 h-3 rounded-sm flex-shrink-0" />}
                        <span className="text-[11px] sm:text-xs font-mono text-blue-700 font-semibold truncate">{pedido.cuit}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2">{pedido.razon_social || '—'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold whitespace-nowrap flex-shrink-0 ${estadoCfg.bg}`}>
                      <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${estadoCfg.dot}`} />
                      {t(`orders.status.${estadoCfg.key}`)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                    <span>{formatDate(pedido.created_at)}</span>
                    {tipoInforme && <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[9px] sm:text-[10px]">{translateReportType(tipoInforme, t)}</span>}
                    {pedido.score != null && (
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full font-bold border text-[9px] sm:text-[10px] ${getScoreColor(pedido.score)}`}>
                        {Math.round(pedido.score)}
                      </span>
                    )}
                  </div>
                  {pedido.estado === 'completada' && pedido.empresa_id ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDetailOpen(detailOpen === pedido.id ? null : pedido.id)}
                        className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-blue-600 text-white rounded-lg text-[11px] sm:text-xs font-medium hover:bg-blue-700"
                      >
                        <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" /> 
                        <span>{t('orders.viewDetails')}</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(pedido, 'es')}
                        className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-green-600 text-white rounded-lg text-[11px] sm:text-xs font-medium hover:bg-green-700"
                      >
                        <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" /> 
                        <span>PDF</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDetailOpen(detailOpen === pedido.id ? null : pedido.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-[11px] sm:text-xs font-medium hover:bg-gray-200"
                    >
                      <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t('orders.viewDetails')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                {t('orders.pagination', { total, page, totalPages })}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel de detalle */}
      {detailOpen && (() => {
        const p = pedidos.find(x => x.id === detailOpen)
        if (!p) return null
        const pais = TIPO_TO_PAIS[p.tipo_identificacion] || null
        const estadoCfg = ESTADO_CONFIG[p.estado] || { key: p.estado, bg: 'bg-gray-100 text-gray-700' }
        const tipoInforme = p.tipo_informe || extractTipoInforme(p.notas)
        const paisNombre = pais ? t(`countries.${pais}`) : null

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setDetailOpen(null)}>
            <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">{t('orders.detail')}</h2>
                  <button onClick={() => setDetailOpen(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.columns.company')}</p>
                    <p className="text-base font-bold text-gray-900">{p.razon_social || '—'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.columns.fiscalId')}</p>
                      <p className="text-sm font-mono font-semibold text-blue-700">{p.cuit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.country')}</p>
                      <p className="text-sm text-gray-700">{paisNombre || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.reportType')}</p>
                      <p className="text-sm text-gray-700">{translateReportType(tipoInforme, t) || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.columns.status')}</p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoCfg.bg}`}>
                        {t(`orders.status.${estadoCfg.key}`)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.requestDate')}</p>
                      <p className="text-sm text-gray-700">{formatDate(p.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.lastUpdate')}</p>
                      <p className="text-sm text-gray-700">{formatDate(p.updated_at)}</p>
                    </div>
                  </div>

                  {p.domicilio && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.address')}</p>
                      <p className="text-sm text-gray-700">{p.domicilio}</p>
                      {/* Google Maps embed */}
                      <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                        <iframe
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(p.domicilio)}&output=embed&z=15`}
                          width="100%"
                          height="180"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Ubicación"
                        />
                      </div>
                    </div>
                  )}

                  {p.score != null && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.columns.score')}</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${p.score >= 70 ? 'text-green-600' : p.score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {Math.round(p.score)}
                        </span>
                        {p.rating && <span className="text-sm text-gray-500">— {p.rating}</span>}
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.score >= 70 ? 'bg-green-500' : p.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, p.score)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {p.email_solicitante && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.contactEmail')}</p>
                      <p className="text-sm text-gray-700">{p.email_solicitante}</p>
                    </div>
                  )}

                  {p.notas && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('orders.detailLabels.notes')}</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{p.notas}</p>
                    </div>
                  )}
                </div>

                {p.estado === 'completada' && p.empresa_id && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold">{t('orders.downloadReport')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadPDF(p, 'es')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                      >
                        <Download className="h-4 w-4" /> {t('orders.spanish')}
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(p, 'en')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                      >
                        <Download className="h-4 w-4" /> {t('orders.english')}
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(p, 'de')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
                      >
                        <Download className="h-4 w-4" /> {t('orders.german')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* PDF language dropdown - rendered as fixed overlay to avoid overflow clipping */}
      {openPdfDrop && (() => {
        const pedido = pedidos.find(p => p.id === openPdfDrop)
        if (!pedido) return null
        return (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOpenPdfDrop(null)} />
            <div className="fixed z-[80] w-44 bg-white rounded-lg shadow-2xl border border-gray-200 py-1" style={{ top: pdfDropPos.top, left: pdfDropPos.left }}>
              <button onClick={() => handleDownloadPDF(pedido, 'es')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-left">
                <span className="text-xs font-bold text-gray-400 w-5">ES</span> <span className="text-gray-700">{t('orders.spanish')}</span>
              </button>
              <button onClick={() => handleDownloadPDF(pedido, 'en')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-left">
                <span className="text-xs font-bold text-gray-400 w-5">EN</span> <span className="text-gray-700">{t('orders.english')}</span>
              </button>
              <button onClick={() => handleDownloadPDF(pedido, 'de')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-left">
                <span className="text-xs font-bold text-gray-400 w-5">DE</span> <span className="text-gray-700">{t('orders.german')}</span>
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}
