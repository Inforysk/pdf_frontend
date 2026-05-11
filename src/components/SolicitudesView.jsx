import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, ExternalLink, Clock, CheckCircle2, ChevronDown, Building2, MapPin, Briefcase, Shield, Send, Eye, X, Globe, Database, Filter, RotateCcw, Play, FileText, Ban, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileDown } from 'lucide-react'
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
  baja: { label: 'Baja', color: 'text-gray-500' },
  normal: { label: 'Normal', color: 'text-blue-600' },
  alta: { label: 'Alta', color: 'text-orange-600' },
  urgente: { label: 'Urgente', color: 'text-red-600 font-bold' },
}

const PER_PAGE = 5

export default function SolicitudesView({ isAdmin, onIniciarInforme }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [paisFilter, setPaisFilter] = useState('all')
  const [stats, setStats] = useState({})
  const [paises, setPaises] = useState({})
  const [detalle, setDetalle] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 })
  const [downloading, setDownloading] = useState(null)
  const searchTimerRef = useRef(null)
  const statsLoaded = useRef(false)

  const inferPaisDisplay = (sol) => {
    const tipo = (sol.tipo_identificacion || '').toUpperCase()
    if (tipo === 'RNC') return 'Rep. Dominicana'
    if (tipo === 'RUC') return 'Perú'
    if (tipo === 'RUT') return 'Uruguay'
    if (tipo === 'CUIT') return 'Argentina'
    if (tipo === 'NIT') return 'Colombia'
    if (tipo === 'RTN') return 'Honduras'
    if (tipo === 'CEDULA JURIDICA') return 'Costa Rica'
    if (tipo === 'DPI') return 'Guatemala'
    const digits = (sol.cuit || '').replace(/\D/g, '')
    if (digits.length === 12) return 'Uruguay'
    if (digits.length === 9) return 'Rep. Dominicana'
    return 'Argentina'
  }

  // Key para forzar recargas
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  const reloadStats = async () => {
    try {
      const res = await axios.get('/api/solicitudes/stats')
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
        params.set('page', page)
        params.set('per_page', PER_PAGE)

        const requests = [axios.get(`/api/solicitudes?${params}`)]
        if (!statsLoaded.current) {
          requests.push(axios.get('/api/solicitudes/stats'))
        }

        const responses = await Promise.all(requests)

        if (responses[0].data.success) {
          setSolicitudes(responses[0].data.solicitudes)
          setPagination(responses[0].data.pagination || { total: 0, total_pages: 1 })
        }
        if (responses[1]?.data?.success) {
          setStats(responses[1].data.stats)
          setPaises(responses[1].data.paises || {})
          statsLoaded.current = true
        }
      } catch {
        toast.error('Error al cargar solicitudes')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filtroEstado, paisFilter, busqueda, page, reloadKey])

  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      const res = await axios.put(`/api/solicitudes/${id}`, { estado: nuevoEstado })
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

  const actualizarPrioridad = async (id, prioridad) => {
    try {
      await axios.put(`/api/solicitudes/${id}`, { prioridad })
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
      const res = await axios.get(`/api/solicitudes/export?${params}`, { responseType: 'blob' })
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

  // Total para "Todas" usa la paginación (total real), stats para cada estado individual
  const totalStats = (stats.pendiente || 0) + (stats.en_proceso || 0) + (stats.completada || 0)
  // Usar pagination.total si no hay filtro de estado, sino sumar stats
  const totalTodas = !filtroEstado ? (pagination.total || totalStats) : totalStats
  const paisesDisponibles = Object.entries(paises).sort((a, b) => b[1] - a[1])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Solicitudes de Investigación</h2>
          <p className="text-sm text-gray-500">{totalTodas.toLocaleString()} solicitudes en total</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:inline"><Download className="h-3 w-3 inline mr-1" />Exportar:</span>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {[
          { key: '', label: 'Todas', count: totalTodas, bg: 'bg-gray-50 border-gray-200' },
          { key: 'pendiente', label: 'Pendientes', count: stats.pendiente || 0, bg: 'bg-yellow-50 border-yellow-200' },
          { key: 'en_proceso', label: 'En Proceso', count: stats.en_proceso || 0, bg: 'bg-blue-50 border-blue-200' },
          { key: 'completada', label: 'Completadas', count: stats.completada || 0, bg: 'bg-green-50 border-green-200' },
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
        <p className="text-xs text-gray-400 self-center">
          {pagination.total.toLocaleString()} resultado{pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Lista */}
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
        <div className="space-y-3">
          {solicitudes.map(sol => {
            const estadoCfg = ESTADO_CONFIG[sol.estado] || ESTADO_CONFIG.pendiente
            const prioridadCfg = PRIORIDAD_CONFIG[sol.prioridad] || PRIORIDAD_CONFIG.normal
            const EstadoIcon = estadoCfg.icon
            const pais = inferPaisDisplay(sol)
            const esApi = sol.tipo_solicitud === 'api' || (sol.notas || '').toLowerCase().includes('solicitar api')

            return (
              <div key={sol.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">#{sol.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${estadoCfg.color}`}>
                          <EstadoIcon className="h-3 w-3" />
                          {estadoCfg.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${esApi ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                          {esApi ? '⚡ API' : '📄 Informe'}
                        </span>
                        <span className={`text-xs ${prioridadCfg.color}`}>
                          {prioridadCfg.label}
                        </span>
                        {/* Scoring badge si existe */}
                        {sol.scoring_rating && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                            sol.scoring_rating.startsWith('A') ? 'bg-green-50 text-green-700 border-green-200' :
                            sol.scoring_rating.startsWith('B') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            sol.scoring_rating.startsWith('C') ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`} title={`Score: ${sol.scoring_final || sol.scoring_score}`}>
                            <Shield className="h-3 w-3" />
                            {sol.scoring_rating}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {sol.razon_social || 'Sin razón social'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {sol.tipo_identificacion || 'CUIT'}: {sol.cuit}
                        {sol.actividad_principal && ` — ${sol.actividad_principal}`}
                        {pais && <span className="ml-2 text-xs text-gray-400">· {pais}</span>}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs text-gray-400">
                        <span className="truncate">Solicitado por: {sol.solicitante_nombre || '?'}</span>
                        <span>{sol.created_at ? new Date(sol.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => setDetalle(sol)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Pendiente → Aceptar (→en_proceso) y Cancelar */}
                      {isAdmin && sol.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => actualizarEstado(sol.id, 'en_proceso')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Aceptar y poner en proceso"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Aceptar
                          </button>
                          <button
                            onClick={() => actualizarEstado(sol.id, 'cancelada')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            title="Cancelar solicitud"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancelar
                          </button>
                        </>
                      )}

                      {/* En Proceso → según tipo: Informe o API */}
                      {isAdmin && sol.estado === 'en_proceso' && (
                        <>
                          {esApi ? (
                            <button
                              onClick={() => setDetalle({ ...sol, _showApi: true })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              title="Ver estructura API que recibirá el cliente"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ver API
                            </button>
                          ) : (
                            onIniciarInforme && (
                              <button
                                onClick={() => onIniciarInforme(sol)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                title="Continuar con el informe"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Continuar Informe
                              </button>
                            )
                          )}
                          <button
                            onClick={() => actualizarEstado(sol.id, 'completada')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completar
                          </button>
                          <button
                            onClick={() => actualizarEstado(sol.id, 'pendiente')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                            title="Devolver a pendiente"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Devolver
                          </button>
                        </>
                      )}

                      {/* Completada o Cancelada → Reabrir */}
                      {isAdmin && (sol.estado === 'completada' || sol.estado === 'cancelada') && (
                        <button
                          onClick={() => actualizarEstado(sol.id, 'pendiente')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Reabrir solicitud"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reabrir
                        </button>
                      )}

                      {/* Selector de prioridad */}
                      {isAdmin && (sol.estado === 'pendiente' || sol.estado === 'en_proceso') && (
                        <select
                          value={sol.prioridad || 'normal'}
                          onChange={(e) => actualizarPrioridad(sol.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                        >
                          <option value="baja">Baja</option>
                          <option value="normal">Normal</option>
                          <option value="alta">Alta</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
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
              <h3 className="font-semibold text-gray-900">Solicitud #{detalle.id}</h3>
              <button onClick={() => setDetalle(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Tipo de solicitud */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  (detalle.tipo_solicitud === 'api' || (detalle.notas || '').toLowerCase().includes('solicitar api'))
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {(detalle.tipo_solicitud === 'api' || (detalle.notas || '').toLowerCase().includes('solicitar api')) ? '⚡ Solicitud API' : '📄 Solicitud Informe'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ESTADO_CONFIG[detalle.estado]?.color || ''}`}>
                  {ESTADO_CONFIG[detalle.estado]?.label || detalle.estado}
                </span>
              </div>

              {detalle.razon_social && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Razón Social</p>
                    <p className="font-semibold text-gray-900">{detalle.razon_social}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">CUIT/ID</p>
                  <p className="font-medium">{detalle.cuit}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Estado AFIP</p>
                  <p className="font-medium">{detalle.estado_afip || '-'}</p>
                </div>
                {detalle.situacion_bcra && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Situación BCRA</p>
                    <p className="font-medium">{detalle.situacion_bcra}</p>
                  </div>
                )}
                {detalle.actividad_principal && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Actividad</p>
                    <p>{detalle.actividad_principal}</p>
                  </div>
                )}
                {detalle.domicilio && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Domicilio</p>
                    <p>{detalle.domicilio}</p>
                  </div>
                )}
              </div>
              {detalle.notas && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{detalle.notas}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t">
                <span>Solicitado por: {detalle.solicitante_nombre || '?'}</span>
                <span>{detalle.created_at ? new Date(detalle.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
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
                      activity: detalle.actividad_principal || null,
                      address: detalle.domicilio || null,
                      tax_status: detalle.estado_afip || null,
                      score: null,
                      risk_level: null,
                      rating: null,
                      source: 'api_request'
                    }
                  }, null, 2)}</pre>
                </div>
              )}

              {/* Preview estructura API si es tipo API */}
              {detalle._showApi && (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <p className="text-xs text-emerald-400 font-semibold mb-2">Estructura JSON que recibirá el cliente vía API:</p>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify({
                    success: true,
                    data: {
                      tax_id: detalle.cuit,
                      company_name: detalle.razon_social || null,
                      activity: detalle.actividad_principal || null,
                      address: detalle.domicilio || null,
                      tax_status: detalle.estado_afip || null,
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
    </div>
  )
}
