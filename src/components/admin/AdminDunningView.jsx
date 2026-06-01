import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  AlertTriangle, RefreshCw, Search, Filter, DollarSign, Users,
  CheckCircle, AlertCircle, XCircle, Clock, Eye, PlayCircle,
  ChevronLeft, ChevronRight, Loader2, TrendingUp, Calendar,
  CreditCard, Ban, Activity, RotateCcw
} from 'lucide-react'

const ESTADO_CONFIG = {
  activo: { 
    label: 'Activo', 
    icon: CheckCircle, 
    color: 'text-green-600 bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700'
  },
  en_riesgo: { 
    label: 'En Riesgo', 
    icon: AlertTriangle, 
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700'
  },
  suspendido: { 
    label: 'Suspendido', 
    icon: XCircle, 
    color: 'text-red-600 bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700'
  }
}

export default function AdminDunningView() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ activo: 0, en_riesgo: 0, suspendido: 0 })
  const [globalStats, setGlobalStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [selectedEmpresa, setSelectedEmpresa] = useState(null)
  const [detailsData, setDetailsData] = useState(null)
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(null)
  const [showRegisterPaymentModal, setShowRegisterPaymentModal] = useState(null)
  const [runningRules, setRunningRules] = useState(false)

  useEffect(() => {
    loadData()
    loadGlobalStats()
  }, [page, estadoFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('per_page', 20)
      if (estadoFilter) params.append('estado', estadoFilter)
      
      const res = await axios.get(`/api/admin/dunning?${params}`)
      if (res.data.success) {
        setItems(res.data.items || [])
        setStats(res.data.stats || { activo: 0, en_riesgo: 0, suspendido: 0 })
        setPagination(res.data.pagination || { total: 0, pages: 1 })
      }
    } catch (err) {
      toast.error('Error cargando datos de dunning')
    }
    setLoading(false)
  }

  const loadGlobalStats = async () => {
    try {
      const res = await axios.get('/api/admin/dunning/stats')
      if (res.data.success) {
        setGlobalStats(res.data.stats)
      }
    } catch (err) { /* ignore */ }
  }

  const loadDetails = async (empresaId) => {
    try {
      const res = await axios.get(`/api/admin/dunning/${empresaId}/details`)
      if (res.data.success) {
        setDetailsData(res.data)
        setSelectedEmpresa(empresaId)
      }
    } catch (err) {
      toast.error('Error cargando detalles')
    }
  }

  const runDunningRules = async () => {
    if (!confirm('¿Ejecutar reglas de dunning ahora?')) return
    setRunningRules(true)
    try {
      const res = await axios.post('/api/admin/dunning/run-rules')
      if (res.data.success) {
        toast.success(res.data.message)
        loadData()
        loadGlobalStats()
      }
    } catch (err) {
      toast.error('Error ejecutando reglas')
    }
    setRunningRules(false)
  }

  const filteredItems = items.filter(item =>
    item.empresa_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    item.empresa_cuit?.toLowerCase().includes(search.toLowerCase())
  )

  const formatMonto = (monto, currency = 'USD') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(monto || 0)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Pagos</h1>
            <p className="text-sm text-gray-500">Dunning y estados de cuenta</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:flex gap-2 w-full sm:w-auto">
          <button
            onClick={runDunningRules}
            disabled={runningRules}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {runningRules ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Ejecutar Reglas
          </button>
          <button
            onClick={() => { loadData(); loadGlobalStats() }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all min-w-0 ${
            estadoFilter === null ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => { setEstadoFilter(null); setPage(1) }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold leading-none">{stats.activo + stats.en_riesgo + stats.suspendido}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">Total Clientes</p>
            </div>
          </div>
        </div>
        
        {Object.entries(ESTADO_CONFIG).map(([estado, config]) => {
          const Icon = config.icon
          return (
            <div
              key={estado}
              className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all min-w-0 ${
                estadoFilter === estado ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => { setEstadoFilter(estado); setPage(1) }}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${config.color.split(' ')[1]}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color.split(' ')[0]}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold leading-none">{stats[estado] || 0}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">{config.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Global Stats Row */}
      {globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-red-600 leading-tight">Monto Pendiente</p>
                <p className="text-lg sm:text-xl font-bold text-red-700 break-words">{formatMonto(globalStats.monto_pendiente)}</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 shrink-0" />
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-amber-600 leading-tight">Cuentas con Fallos</p>
                <p className="text-lg sm:text-xl font-bold text-amber-700">{globalStats.cuentas_con_fallos}</p>
              </div>
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 shrink-0" />
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 leading-tight">Fallos (30 dias)</p>
                <p className="text-lg sm:text-xl font-bold text-gray-700">{globalStats.fallos_mes}</p>
              </div>
              <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 shrink-0" />
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-green-600 leading-tight">Recuperaciones</p>
                <p className="text-lg sm:text-xl font-bold text-green-700">{globalStats.recuperaciones_mes}</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Search & Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-none sm:max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o CUIT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {estadoFilter && (
            <button
              onClick={() => { setEstadoFilter(null); setPage(1) }}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
            >
              Filtro: {ESTADO_CONFIG[estadoFilter]?.label}
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay cuentas con el filtro seleccionado
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const estadoConfig = ESTADO_CONFIG[item.estado_pago || 'activo']
                const EstadoIcon = estadoConfig.icon
                return (
                  <div key={item.empresa_id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 break-words">{item.empresa_nombre}</p>
                        <p className="text-xs text-gray-500 break-all">{item.empresa_cuit}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${estadoConfig.badge}`}>
                        <EstadoIcon className="w-3 h-3" />
                        {estadoConfig.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 mb-1">Intentos</p>
                        {item.intentos_fallidos > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-medium">
                            <XCircle className="w-3 h-3" />
                            {item.intentos_fallidos}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Pendiente</p>
                        {item.monto_pendiente > 0 ? (
                          <span className="font-medium text-red-600 break-words">
                            {formatMonto(item.monto_pendiente, item.currency_code)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Ultimo fallo</p>
                        {item.ultimo_intento_fallido ? (
                          <div>
                            <p className="text-gray-700">{formatDate(item.ultimo_intento_fallido)}</p>
                            {item.dias_desde_fallo !== null && (
                              <p className="text-[11px] text-gray-500">hace {item.dias_desde_fallo} dias</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Ultimo pago</p>
                        <p className="text-gray-700">{formatDate(item.ultimo_pago_exitoso)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => loadDetails(item.empresa_id)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <button
                        onClick={() => setShowChangeStatusModal(item)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        <Activity className="w-3.5 h-3.5" /> Estado
                      </button>
                      <button
                        onClick={() => setShowRegisterPaymentModal(item)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pago
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center">Intentos</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  <th className="px-4 py-3 text-center">Último Fallo</th>
                  <th className="px-4 py-3 text-center">Último Pago</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => {
                  const estadoConfig = ESTADO_CONFIG[item.estado_pago || 'activo']
                  return (
                    <tr key={item.empresa_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-800">{item.empresa_nombre}</p>
                          <p className="text-xs text-gray-500">{item.empresa_cuit}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.badge}`}>
                          <estadoConfig.icon className="w-3 h-3" />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.intentos_fallidos > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            {item.intentos_fallidos}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.monto_pendiente > 0 ? (
                          <span className="font-medium text-red-600">
                            {formatMonto(item.monto_pendiente, item.currency_code)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {item.ultimo_intento_fallido ? (
                          <div>
                            <p>{formatDate(item.ultimo_intento_fallido)}</p>
                            {item.dias_desde_fallo !== null && (
                              <p className="text-xs text-gray-500">hace {item.dias_desde_fallo} días</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(item.ultimo_pago_exitoso)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => loadDetails(item.empresa_id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setShowChangeStatusModal(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Cambiar estado"
                          >
                            <Activity className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => setShowRegisterPaymentModal(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Registrar pago"
                          >
                            <CreditCard className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              Mostrando {filteredItems.length} de {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">
                Página {page} de {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Panel */}
      {selectedEmpresa && detailsData && (
        <DetailsPanel
          data={detailsData}
          onClose={() => { setSelectedEmpresa(null); setDetailsData(null) }}
          onRefresh={() => loadDetails(selectedEmpresa)}
        />
      )}

      {/* Change Status Modal */}
      {showChangeStatusModal && (
        <ChangeStatusModal
          empresa={showChangeStatusModal}
          onClose={() => setShowChangeStatusModal(null)}
          onSuccess={() => { loadData(); loadGlobalStats(); setShowChangeStatusModal(null) }}
        />
      )}

      {/* Register Payment Modal */}
      {showRegisterPaymentModal && (
        <RegisterPaymentModal
          empresa={showRegisterPaymentModal}
          onClose={() => setShowRegisterPaymentModal(null)}
          onSuccess={() => { loadData(); loadGlobalStats(); setShowRegisterPaymentModal(null) }}
        />
      )}
    </div>
  )
}

// ── Details Panel Component ──
function DetailsPanel({ data, onClose, onRefresh }) {
  const { empresa, payment_status, payment_attempts, actions_log, facturas_pendientes } = data

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{empresa.nombre}</h2>
            <p className="text-sm text-gray-500">{empresa.identificacion}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Payment Status Summary */}
          {payment_status && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Estado</p>
                <p className="font-semibold capitalize">{payment_status.estado}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Intentos Fallidos</p>
                <p className="font-semibold">{payment_status.intentos_fallidos || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Monto Pendiente</p>
                <p className="font-semibold text-red-600">
                  {payment_status.currency_code} {payment_status.monto_pendiente || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Último Pago Exitoso</p>
                <p className="font-semibold text-sm">
                  {formatDate(payment_status.ultimo_pago_exitoso)}
                </p>
              </div>
            </div>
          )}

          {/* Payment Attempts */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Historial de Pagos
            </h3>
            {payment_attempts?.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-auto">
                {payment_attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      attempt.estado === 'success' ? 'bg-green-50 border-green-200' :
                      attempt.estado === 'failed' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {attempt.estado === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : attempt.estado === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          {attempt.currency_code} {attempt.monto}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attempt.tipo} · {attempt.metodo_pago || 'N/A'}
                        </p>
                        {attempt.error_message && (
                          <p className="text-xs text-red-600 mt-1">{attempt.error_message}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(attempt.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay intentos de pago registrados</p>
            )}
          </div>

          {/* Actions Log */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Log de Acciones
            </h3>
            {actions_log?.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-auto">
                {actions_log.map((action) => (
                  <div key={action.id} className="p-2 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{action.regla_nombre || action.accion}</span>
                      <span className="text-xs text-gray-500">{formatDate(action.created_at)}</span>
                    </div>
                    <p className="text-gray-600 text-xs">{action.detalles}</p>
                    {action.ejecutado_por_email && (
                      <p className="text-xs text-gray-400">por: {action.ejecutado_por_email}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay acciones registradas</p>
            )}
          </div>

          {/* Pending Invoices */}
          {facturas_pendientes?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Facturas Pendientes
              </h3>
              <div className="space-y-2">
                {facturas_pendientes.map((factura) => (
                  <div key={factura.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{factura.descripcion}</p>
                      <p className="text-xs text-gray-500">{formatDate(factura.created_at)}</p>
                    </div>
                    <p className="font-semibold text-amber-700">
                      {factura.currency_code} {factura.precio_total}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Change Status Modal ──
function ChangeStatusModal({ empresa, onClose, onSuccess }) {
  const [estado, setEstado] = useState(empresa.estado_pago || 'activo')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`/api/admin/dunning/${empresa.empresa_id}/change-status`, {
        estado,
        motivo
      })
      if (res.data.success) {
        toast.success(`Estado cambiado a ${estado}`)
        onSuccess()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error('Error cambiando estado')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Cambiar Estado de Pago</h2>
        <p className="text-sm text-gray-500 mb-4">{empresa.empresa_nombre}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nuevo Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="activo">Activo</option>
              <option value="en_riesgo">En Riesgo</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-2 border rounded-lg"
              rows={3}
              placeholder="Razón del cambio de estado..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Register Payment Modal ──
function RegisterPaymentModal({ empresa, onClose, onSuccess }) {
  const [monto, setMonto] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [estado, setEstado] = useState('success')
  const [metodo, setMetodo] = useState('manual')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!monto || parseFloat(monto) <= 0) {
      toast.error('Ingrese un monto válido')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`/api/admin/dunning/${empresa.empresa_id}/register-attempt`, {
        tipo: 'manual',
        monto: parseFloat(monto),
        currency_code: currency,
        estado,
        metodo_pago: metodo,
        error_message: estado === 'failed' ? errorMessage : ''
      })
      if (res.data.success) {
        toast.success('Pago registrado')
        onSuccess()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error('Error registrando pago')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Registrar Pago</h2>
        <p className="text-sm text-gray-500 mb-4">{empresa.empresa_nombre}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Monto</label>
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Resultado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="success">Exitoso</option>
                <option value="failed">Fallido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Método</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="manual">Manual</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="mercadopago">MercadoPago</option>
              </select>
            </div>
          </div>

          {estado === 'failed' && (
            <div>
              <label className="block text-sm font-medium mb-2">Mensaje de Error</label>
              <input
                type="text"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Razón del fallo..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                estado === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Registrando...' : `Registrar ${estado === 'success' ? 'Pago' : 'Fallo'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
