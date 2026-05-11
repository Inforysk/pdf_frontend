import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FileText, Search, Filter, Download, Plus, Eye, Edit2,
  DollarSign, CheckCircle, Clock, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Loader2, Calendar, Building2,
  TrendingUp, RefreshCw, X, BarChart3, Trash2, AlertTriangle
} from 'lucide-react'

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', icon: Clock, color: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  pagada: { label: 'Pagada', icon: CheckCircle, color: 'bg-green-100 text-green-700', badge: 'bg-green-100 text-green-700' },
  vencida: { label: 'Vencida', icon: AlertCircle, color: 'bg-red-100 text-red-700', badge: 'bg-red-100 text-red-700' },
  cancelada: { label: 'Cancelada', icon: XCircle, color: 'bg-gray-100 text-gray-500', badge: 'bg-gray-100 text-gray-500' }
}

export default function AdminFacturacionView() {
  const [facturas, setFacturas] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ empresas: [], periodos: [] })
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  
  // Filtros activos
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')
  const [periodoFilter, setPeriodoFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)
  
  // Modales
  const [showDetailModal, setShowDetailModal] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [globalStats, setGlobalStats] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Función para descargar PDF con autenticación
  const handleDownloadPdf = async (facturaId) => {
    setDownloadingPdf(facturaId)
    try {
      const response = await axios.get(`/api/admin/facturas/${facturaId}/pdf`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura_${String(facturaId).padStart(8, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast.error('Error al descargar el PDF')
    } finally {
      setDownloadingPdf(null)
    }
  }

  // Función para eliminar factura
  const deleteFactura = async (facturaId) => {
    setDeleting(true)
    try {
      const res = await axios.delete(`/api/admin/facturas/${facturaId}`)
      if (res.data.success) {
        toast.success('Factura eliminada correctamente')
        setShowDeleteModal(null)
        loadFacturas()
      } else {
        toast.error(res.data.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error eliminando factura:', error)
      toast.error('Error al eliminar la factura')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    loadFacturas()
  }, [page, estadoFilter, empresaFilter, periodoFilter, fechaDesde, fechaHasta])

  const loadFacturas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('per_page', 25)
      if (estadoFilter) params.append('estado', estadoFilter)
      if (empresaFilter) params.append('empresa_id', empresaFilter)
      if (periodoFilter) params.append('periodo', periodoFilter)
      if (fechaDesde) params.append('fecha_desde', fechaDesde)
      if (fechaHasta) params.append('fecha_hasta', fechaHasta)
      if (search) params.append('search', search)
      
      const res = await axios.get(`/api/admin/facturas?${params}`)
      if (res.data.success) {
        setFacturas(res.data.facturas || [])
        setStats(res.data.stats)
        setFilters(res.data.filters || { empresas: [], periodos: [] })
        setPagination(res.data.pagination)
      }
    } catch (err) {
      toast.error('Error cargando facturas')
    }
    setLoading(false)
  }

  const loadGlobalStats = async () => {
    try {
      const res = await axios.get('/api/admin/facturas/stats')
      if (res.data.success) {
        setGlobalStats(res.data.stats)
        setShowStatsModal(true)
      }
    } catch (err) {
      toast.error('Error cargando estadísticas')
    }
  }

  const loadDetail = async (facturaId) => {
    try {
      const res = await axios.get(`/api/admin/facturas/${facturaId}`)
      if (res.data.success) {
        setDetailData(res.data.factura)
        setShowDetailModal(facturaId)
      }
    } catch (err) {
      toast.error('Error cargando detalle')
    }
  }

  const changeStatus = async (facturaId, nuevoEstado) => {
    try {
      const res = await axios.post(`/api/admin/facturas/${facturaId}/change-status`, {
        estado: nuevoEstado
      })
      if (res.data.success) {
        toast.success(`Estado cambiado a ${nuevoEstado}`)
        loadFacturas()
        setShowDetailModal(null)
      }
    } catch (err) {
      toast.error('Error cambiando estado')
    }
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (estadoFilter) params.append('estado', estadoFilter)
      if (empresaFilter) params.append('empresa_id', empresaFilter)
      if (periodoFilter) params.append('periodo', periodoFilter)
      if (fechaDesde) params.append('fecha_desde', fechaDesde)
      if (fechaHasta) params.append('fecha_hasta', fechaHasta)
      
      const response = await axios.get(`/api/admin/facturas/export?${params}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `facturas_export_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Exportación completada')
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadFacturas()
  }

  const clearFilters = () => {
    setSearch('')
    setEstadoFilter('')
    setEmpresaFilter('')
    setPeriodoFilter('')
    setFechaDesde('')
    setFechaHasta('')
    setPage(1)
  }

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

  const hasActiveFilters = estadoFilter || empresaFilter || periodoFilter || fechaDesde || fechaHasta || search

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Facturación Global</h1>
            <p className="text-sm text-gray-500">Gestión de todas las facturas del sistema</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadGlobalStats}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <BarChart3 className="w-4 h-4" />
            Estadísticas
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva Factura
          </button>
          <button
            onClick={loadFacturas}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pagination.total}</p>
                <p className="text-sm text-gray-500">Total Facturas</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatMonto(stats.este_mes?.monto)}</p>
                <p className="text-sm text-gray-500">Este Mes</p>
              </div>
            </div>
          </div>
          
          {Object.entries(ESTADO_CONFIG).slice(0, 3).map(([estado, config]) => {
            const stat = stats.by_estado?.[estado] || { count: 0, monto: 0 }
            return (
              <div
                key={estado}
                className={`p-4 bg-white rounded-xl border shadow-sm cursor-pointer transition-all ${
                  estadoFilter === estado ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => { setEstadoFilter(estadoFilter === estado ? '' : estado); setPage(1) }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                    <config.icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.count}</p>
                    <p className="text-sm text-gray-500">{config.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Empresa, CUIT, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
            <select
              value={empresaFilter}
              onChange={(e) => { setEmpresaFilter(e.target.value); setPage(1) }}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Todas</option>
              {filters.empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Periodo</label>
            <select
              value={periodoFilter}
              onChange={(e) => { setPeriodoFilter(e.target.value); setPage(1) }}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Todos</option>
              {filters.periodos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPage(1) }}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPage(1) }}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : facturas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron facturas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Periodo</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {facturas.map((factura) => {
                  const estadoConfig = ESTADO_CONFIG[factura.estado] || ESTADO_CONFIG.pendiente
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">#{factura.id}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-800">{factura.empresa_nombre || '-'}</p>
                          <p className="text-xs text-gray-500">{factura.empresa_cuit}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{factura.periodo || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {factura.descripcion || factura.plan_nombre || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMonto(factura.precio_total, factura.currency_code)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.badge}`}>
                          <estadoConfig.icon className="w-3 h-3" />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(factura.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => loadDetail(factura.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(factura.id)}
                            disabled={downloadingPdf === factura.id}
                            className="p-1.5 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                            title="Descargar PDF"
                          >
                            {downloadingPdf === factura.id ? (
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(factura)}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                            title="Eliminar factura"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {facturas.length} de {pagination.total}
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

      {/* Detail Modal */}
      {showDetailModal && detailData && (
        <DetailModal
          factura={detailData}
          onClose={() => { setShowDetailModal(null); setDetailData(null) }}
          onChangeStatus={changeStatus}
          onDownloadPdf={handleDownloadPdf}
          downloadingPdf={downloadingPdf}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFacturaModal
          empresas={filters.empresas}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { loadFacturas(); setShowCreateModal(false) }}
        />
      )}

      {/* Stats Modal */}
      {showStatsModal && globalStats && (
        <StatsModal
          stats={globalStats}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Eliminar Factura</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Factura #:</span>
                  <span className="ml-2 font-medium">{showDeleteModal.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Empresa:</span>
                  <span className="ml-2 font-medium">{showDeleteModal.empresa_nombre || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Periodo:</span>
                  <span className="ml-2 font-medium">{showDeleteModal.periodo || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <span className="ml-2 font-medium">
                    ${parseFloat(showDeleteModal.precio_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              ¿Está seguro que desea eliminar esta factura? Esta acción eliminará permanentemente 
              la factura y todos sus datos asociados.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteFactura(showDeleteModal.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
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

// ── Detail Modal ──
function DetailModal({ factura, onClose, onChangeStatus, onDownloadPdf, downloadingPdf }) {
  const formatMonto = (monto, currency = 'USD') => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(monto || 0)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('es-AR')
  }

  const estadoConfig = ESTADO_CONFIG[factura.estado] || ESTADO_CONFIG.pendiente

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Factura #{factura.id}</h2>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.badge}`}>
              <estadoConfig.icon className="w-3 h-3" />
              {estadoConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownloadPdf(factura.id)}
              disabled={downloadingPdf === factura.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
            >
              {downloadingPdf === factura.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Empresa</p>
              <p className="font-semibold">{factura.empresa_nombre || '-'}</p>
              <p className="text-sm text-gray-500">{factura.empresa_cuit}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Usuario</p>
              <p className="font-semibold">{factura.usuario_nombre || '-'}</p>
              <p className="text-sm text-gray-500">{factura.usuario_email}</p>
            </div>
          </div>

          {/* Detalles financieros */}
          <div className="border rounded-lg divide-y">
            <div className="p-4 flex justify-between">
              <span className="text-gray-600">Periodo</span>
              <span className="font-medium">{factura.periodo || '-'}</span>
            </div>
            <div className="p-4 flex justify-between">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">{factura.plan_nombre || '-'}</span>
            </div>
            <div className="p-4 flex justify-between">
              <span className="text-gray-600">Descripción</span>
              <span className="font-medium">{factura.descripcion || '-'}</span>
            </div>
            {factura.creditos_usados > 0 && (
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">Créditos usados</span>
                <span className="font-medium">{factura.creditos_usados}</span>
              </div>
            )}
            {factura.precio_base > 0 && (
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">Precio base</span>
                <span>{formatMonto(factura.precio_base, factura.currency_code)}</span>
              </div>
            )}
            {factura.precio_excedente > 0 && (
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">Excedentes</span>
                <span>{formatMonto(factura.precio_excedente, factura.currency_code)}</span>
              </div>
            )}
            {factura.descuento_cupon > 0 && (
              <div className="p-4 flex justify-between text-green-600">
                <span>Descuento cupón {factura.cupon_code && `(${factura.cupon_code})`}</span>
                <span>-{formatMonto(factura.descuento_cupon, factura.currency_code)}</span>
              </div>
            )}
            <div className="p-4 flex justify-between bg-gray-50 font-semibold text-lg">
              <span>Total</span>
              <span>{formatMonto(factura.precio_total || factura.total, factura.currency_code)}</span>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Fecha creación</p>
              <p className="font-medium">{formatDate(factura.created_at)}</p>
            </div>
            {factura.pagada_at && (
              <div>
                <p className="text-gray-500">Fecha pago</p>
                <p className="font-medium text-green-600">{formatDate(factura.pagada_at)}</p>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-4 border-t">
            <span className="text-sm text-gray-500 self-center mr-auto">Cambiar estado:</span>
            {Object.entries(ESTADO_CONFIG).map(([estado, config]) => (
              <button
                key={estado}
                onClick={() => onChangeStatus(factura.id, estado)}
                disabled={factura.estado === estado}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  factura.estado === estado
                    ? `${config.badge} cursor-default`
                    : 'border hover:bg-gray-50'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create Factura Modal ──
function CreateFacturaModal({ empresas, onClose, onSuccess }) {
  const [empresaId, setEmpresaId] = useState('')
  const [planId, setPlanId] = useState('')
  const [planes, setPlanes] = useState([])
  const [descripcion, setDescripcion] = useState('')
  const [precioTotal, setPrecioTotal] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPlanes, setLoadingPlanes] = useState(true)
  const [tipoFactura, setTipoFactura] = useState('plan') // 'plan' o 'manual'

  // Calcular fecha vencimiento automáticamente (último día del mes)
  useEffect(() => {
    if (fechaDesde) {
      const date = new Date(fechaDesde)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      setFechaVencimiento(lastDay.toISOString().split('T')[0])
    }
  }, [fechaDesde])

  // Cargar planes al montar
  useEffect(() => {
    const loadPlanes = async () => {
      try {
        const res = await axios.get('/api/admin/planes')
        if (res.data.success) {
          setPlanes(res.data.planes || [])
        }
      } catch (err) {
        console.error('Error cargando planes:', err)
      }
      setLoadingPlanes(false)
    }
    loadPlanes()
  }, [])

  // Cuando selecciona un plan, autocompletar precio
  const handlePlanChange = (e) => {
    const selectedPlanId = e.target.value
    setPlanId(selectedPlanId)
    
    if (selectedPlanId) {
      const plan = planes.find(p => p.id === parseInt(selectedPlanId))
      if (plan) {
        setPrecioTotal(plan.precio_mensual.toString())
        setDescripcion(`Suscripción mensual - Plan ${plan.nombre}`)
      }
    } else {
      setPrecioTotal('')
      setDescripcion('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!empresaId || !precioTotal) {
      toast.error('Complete los campos requeridos')
      return
    }

    setLoading(true)
    try {
      const payload = {
        empresa_cliente_id: parseInt(empresaId),
        descripcion,
        precio_total: parseFloat(precioTotal),
        currency_code: currency,
        fecha_desde: fechaDesde || null,
        fecha_vencimiento: fechaVencimiento || null
      }
      
      // Si es factura por plan, incluir plan_id
      if (tipoFactura === 'plan' && planId) {
        payload.plan_id = parseInt(planId)
      }
      
      const res = await axios.post('/api/admin/facturas/create', payload)
      if (res.data.success) {
        toast.success('Factura creada')
        onSuccess()
      } else {
        toast.error(res.data.error || 'Error al crear factura')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al crear factura'
      toast.error(errorMsg)
    }
    setLoading(false)
  }

  // Generar fechas por defecto (primer y último día del mes actual)
  const getDefaultDates = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      desde: firstDay.toISOString().split('T')[0],
      hasta: lastDay.toISOString().split('T')[0]
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Nueva Factura</h2>

        {/* Tabs para tipo de factura */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setTipoFactura('plan'); setPrecioTotal(''); setDescripcion(''); setPlanId('') }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tipoFactura === 'plan' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Por Plan
          </button>
          <button
            type="button"
            onClick={() => { setTipoFactura('manual'); setPlanId(''); setPrecioTotal(''); setDescripcion('') }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tipoFactura === 'manual' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Manual
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Empresa *</label>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Seleccionar empresa</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          {tipoFactura === 'plan' && (
            <div>
              <label className="block text-sm font-medium mb-2">Plan *</label>
              {loadingPlanes ? (
                <div className="p-2 text-gray-500 text-sm">Cargando planes...</div>
              ) : (
                <select
                  value={planId}
                  onChange={handlePlanChange}
                  className="w-full p-2 border rounded-lg"
                  required={tipoFactura === 'plan'}
                >
                  <option value="">Seleccionar plan</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - ${p.precio_mensual} USD ({p.creditos_mes} créditos/mes)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder={tipoFactura === 'plan' ? 'Se autocompleta al seleccionar plan' : 'Ej: Factura por servicio adicional'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Monto *</label>
              <input
                type="number"
                step="0.01"
                value={precioTotal}
                onChange={(e) => setPrecioTotal(e.target.value)}
                className={`w-full p-2 border rounded-lg ${tipoFactura === 'plan' ? 'bg-gray-50' : ''}`}
                placeholder="0.00"
                required
                readOnly={tipoFactura === 'plan'}
              />
              {tipoFactura === 'plan' && (
                <p className="text-xs text-gray-500 mt-1">Se asigna según el plan</p>
              )}
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
              <label className="block text-sm font-medium mb-2">Fecha Desde *</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Vencimiento *</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Se calcula automáticamente</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
              {loading ? 'Creando...' : 'Crear Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Stats Modal ──
function StatsModal({ stats, onClose }) {
  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(monto || 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Estadísticas de Facturación</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-600">Total Facturas</p>
              <p className="text-2xl font-bold text-blue-700">{stats.resumen.total_facturas}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-600">Total Facturado</p>
              <p className="text-xl font-bold text-green-700">{formatMonto(stats.resumen.total_facturado)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl">
              <p className="text-sm text-emerald-600">Total Pagado</p>
              <p className="text-xl font-bold text-emerald-700">{formatMonto(stats.resumen.total_pagado)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-amber-600">Pendiente</p>
              <p className="text-xl font-bold text-amber-700">{formatMonto(stats.resumen.total_pendiente)}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-600">Tasa de Cobro</p>
            <p className="text-3xl font-bold text-gray-800">{stats.resumen.tasa_cobro}%</p>
          </div>

          {/* Por mes */}
          <div>
            <h3 className="font-semibold mb-3">Facturación por Mes (últimos 12 meses)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Mes</th>
                    <th className="px-3 py-2 text-center">Cantidad</th>
                    <th className="px-3 py-2 text-right">Facturado</th>
                    <th className="px-3 py-2 text-center">Pagadas</th>
                    <th className="px-3 py-2 text-right">Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.por_mes.map(mes => (
                    <tr key={mes.mes} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{mes.mes}</td>
                      <td className="px-3 py-2 text-center">{mes.cantidad}</td>
                      <td className="px-3 py-2 text-right">{formatMonto(mes.monto_total)}</td>
                      <td className="px-3 py-2 text-center text-green-600">{mes.pagadas}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatMonto(mes.monto_pagado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top clientes */}
          <div>
            <h3 className="font-semibold mb-3">Top 10 Clientes por Facturación</h3>
            <div className="space-y-2">
              {stats.top_clientes.map((cliente, idx) => (
                <div key={cliente.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{cliente.facturas} facturas · {cliente.facturas_pagadas} pagadas</p>
                  </div>
                  <p className="font-semibold text-green-600">{formatMonto(cliente.total_facturado)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
