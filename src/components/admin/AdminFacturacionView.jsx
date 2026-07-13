import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FileText, Search, Filter, Download, Plus, Eye, Edit2,
  DollarSign, CheckCircle, Clock, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Loader2, Calendar, Building2,
  TrendingUp, RefreshCw, X, BarChart3, Trash2, AlertTriangle,
  MoreVertical, Receipt, Check
} from 'lucide-react'

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', icon: Clock, color: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  pagada: { label: 'Pagada', icon: CheckCircle, color: 'bg-green-100 text-green-700', badge: 'bg-green-100 text-green-700' },
  vencida: { label: 'Vencida', icon: AlertCircle, color: 'bg-red-100 text-red-700', badge: 'bg-red-100 text-red-700' },
  cancelada: { label: 'Cancelada', icon: XCircle, color: 'bg-gray-100 text-gray-500', badge: 'bg-gray-100 text-gray-500' }
}

// Estados de pago para facturas a proveedores
const ESTADO_PAGO_PROV = {
  pendiente: { label: 'Pendiente', icon: Clock, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  facturada: { label: 'Facturada', icon: FileText, color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  pagada: { label: 'Pagada', icon: CheckCircle, color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  cancelada: { label: 'Cancelada', icon: XCircle, color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
}

export default function AdminFacturacionView() {
  const currencySymbol = (moneda) => (moneda === 'USD' ? '$' : '€')
  const formatByCurrency = (amount, moneda) => `${currencySymbol(moneda)}${parseFloat(amount || 0).toFixed(2)}`
  const formatFechaPago = (rawDate) => {
    if (!rawDate) return ''
    try {
      // Priorizar YYYY-MM-DD literal para evitar saltos por timezone.
      const raw = String(rawDate)
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        return `${Number(match[3])}/${Number(match[2])}/${match[1]}`
      }
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) {
        return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
      }
      return raw
    } catch {
      return String(rawDate)
    }
  }

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

  // Tab activa: 'clientes' o 'proveedores'
  const [activeTab, setActiveTab] = useState('clientes')
  
  // Facturas a proveedores
  const [facturasProveedores, setFacturasProveedores] = useState([])
  const [loadingProveedores, setLoadingProveedores] = useState(false)
  const [proveedoresStats, setProveedoresStats] = useState({})
  const [showEstadoMenu, setShowEstadoMenu] = useState(null)
  const [changingEstado, setChangingEstado] = useState(false)
  const [showProveedorDetail, setShowProveedorDetail] = useState(null) // factura seleccionada para detalle
  const [confirmEstadoChange, setConfirmEstadoChange] = useState(null) // { facturaId, nuevoEstado } para confirmación
  const [estadoCambioFecha, setEstadoCambioFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedFacturas, setSelectedFacturas] = useState([]) // IDs seleccionados para bulk
  const [bulkEstado, setBulkEstado] = useState('') // estado para cambio masivo
  const [bulkFecha, setBulkFecha] = useState('') // fecha opcional para cambio masivo
  const [bulkChanging, setBulkChanging] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false) // modal confirmación bulk
  const [eurUsdRate, setEurUsdRate] = useState(1.2)
  const [sortByProv, setSortByProv] = useState('fecha')
  const [sortDirProv, setSortDirProv] = useState('desc')

  const buildPendingStatsFromSolicitudes = (solicitudes = [], rate = 1.2) => {
    const safeRate = Number(rate) > 0 ? Number(rate) : 1.2
    let cantidad = 0
    let totalEur = 0
    let totalUsd = 0

    solicitudes.forEach((s) => {
      const estadoPago = String(s?.factura_estado_pago || '').toLowerCase()
      const esFacturable = !s?.facturado || estadoPago === 'pendiente'
      if (!esFacturable) return

      cantidad += 1
      const moneda = String(s?.moneda_facturacion || 'EUR').toUpperCase()
      const precioEur = Number(s?.precio_eur || s?.precio_calculado || 0)
      const precioUsd = Number(s?.precio_usd || 0)

      if (moneda === 'USD') {
        totalUsd += (precioUsd > 0 ? precioUsd : precioEur * safeRate)
      } else {
        totalEur += precioEur
      }
    })

    return {
      cantidad,
      total_eur: Number(totalEur.toFixed(2)),
      total_usd: Number(totalUsd.toFixed(2)),
      total: Number((totalEur + totalUsd).toFixed(2)),
    }
  }

  const normalizeTotalsByRate = (stat = {}, rate = 1.2) => {
    const safeRate = Number(rate) > 0 ? Number(rate) : 1.2
    const rawEur = Number(stat?.total_eur || 0)
    const rawUsd = Number(stat?.total_usd || 0)

    // Mostrar siempre equivalentes en ambas monedas usando la tasa activa.
    const eur = rawEur + (rawUsd / safeRate)
    const usd = rawUsd + (rawEur * safeRate)

    return {
      eur: Number(eur.toFixed(2)),
      usd: Number(usd.toFixed(2)),
    }
  }

  const handleSortProveedores = (key) => {
    if (sortByProv === key) {
      setSortDirProv(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortByProv(key)
    setSortDirProv(key === 'fecha' ? 'desc' : 'asc')
  }

  const getSortIndicator = (key) => {
    if (sortByProv !== key) return '↕'
    return sortDirProv === 'asc' ? '↑' : '↓'
  }

  const sortedFacturasProveedores = useMemo(() => {
    const list = [...facturasProveedores]
    const estadoRank = { pendiente: 0, facturada: 1, pagada: 2, cancelada: 3 }

    list.sort((a, b) => {
      let va
      let vb

      if (sortByProv === 'fecha') {
        va = new Date(a.created_at || 0).getTime()
        vb = new Date(b.created_at || 0).getTime()
      } else if (sortByProv === 'numero_factura') {
        va = String(a.numero_factura || '')
        vb = String(b.numero_factura || '')
        const na = Number(va)
        const nb = Number(vb)
        if (Number.isFinite(na) && Number.isFinite(nb)) {
          va = na
          vb = nb
        }
      } else if (sortByProv === 'cliente') {
        va = `${a.usuario_abono || ''} ${a.usuario_nombre || ''}`.trim().toLowerCase()
        vb = `${b.usuario_abono || ''} ${b.usuario_nombre || ''}`.trim().toLowerCase()
      } else if (sortByProv === 'cantidad') {
        va = Number(a.cantidad_solicitudes || 0)
        vb = Number(b.cantidad_solicitudes || 0)
      } else if (sortByProv === 'total') {
        va = Number(a.total_eur || 0)
        vb = Number(b.total_eur || 0)
      } else if (sortByProv === 'estado') {
        va = estadoRank[(a.estado_pago || 'pendiente').toLowerCase()] ?? 99
        vb = estadoRank[(b.estado_pago || 'pendiente').toLowerCase()] ?? 99
      } else {
        va = String(a[sortByProv] || '')
        vb = String(b[sortByProv] || '')
      }

      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' })
      }

      return sortDirProv === 'asc' ? cmp : -cmp
    })

    return list
  }, [facturasProveedores, sortByProv, sortDirProv])

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

  // Cargar facturas a proveedores
  const loadFacturasProveedores = async () => {
    setLoadingProveedores(true)
    try {
      const [res, tasasRes, pendientesRes] = await Promise.all([
        axios.get('/api/admin/facturas-proveedores/historial', {
          params: { _ts: Date.now() }
        }),
        axios.get('/api/admin/precios-pais/tasas-cambio').catch(() => null),
        axios.get('/api/admin/facturacion-solicitudes', {
          params: { facturado: 'false', _ts: Date.now() }
        }).catch(() => null),
      ])
      if (res.data.success) {
        setFacturasProveedores(res.data.facturas || [])
        const statsBase = res.data.stats || {}
        const rate = tasasRes?.data?.success
          ? Number(tasasRes.data.tasas?.find(t => t.moneda_origen === 'EUR' && t.moneda_destino === 'USD')?.tasa || eurUsdRate)
          : eurUsdRate
        if (pendientesRes?.data?.success) {
          const pendientesStats = buildPendingStatsFromSolicitudes(pendientesRes.data.solicitudes || [], rate)
          setProveedoresStats({
            ...statsBase,
            pendiente: pendientesStats,
          })
        } else {
          setProveedoresStats(statsBase)
        }
      }
      if (tasasRes?.data?.success) {
        const t = tasasRes.data.tasas?.find(t => t.moneda_origen === 'EUR' && t.moneda_destino === 'USD')
        if (t?.tasa) setEurUsdRate(Number(t.tasa))
      }
    } catch (err) {
      toast.error('Error cargando facturas a proveedores')
    }
    setLoadingProveedores(false)
  }

  // Solicitar confirmación para cambiar estado de pago
  const handleCambiarEstadoPago = (facturaId, nuevoEstado) => {
    setEstadoCambioFecha(nuevoEstado === 'pagada' ? new Date().toISOString().slice(0, 10) : '')
    setConfirmEstadoChange({ facturaId, nuevoEstado })
  }

  // Confirmar y ejecutar el cambio de estado
  const confirmarCambioEstado = async () => {
    if (!confirmEstadoChange) return
    const requiereFechaPago = confirmEstadoChange.nuevoEstado === 'pagada'
    if (requiereFechaPago && !estadoCambioFecha) {
      toast.error('Debe seleccionar la fecha del cambio de estado')
      return
    }
    
    const { facturaId, nuevoEstado } = confirmEstadoChange
    const facturaAntes = facturasProveedores.find(f => f.id === facturaId)
    const fechaAnterior = facturaAntes?.fecha_pago || showProveedorDetail?.fecha_pago || null
    setChangingEstado(true)
    try {
      const res = await axios.post(`/api/admin/facturas-proveedores/${facturaId}/change-status`, {
        estado: nuevoEstado,
        fecha: requiereFechaPago ? estadoCambioFecha : undefined
      })
      if (res.data.success) {
        const labelEstado = ESTADO_PAGO_PROV[nuevoEstado]?.label || nuevoEstado
        const fechaGuardada = res.data?.fecha_pago_guardada
        const fechaPagoFinal = nuevoEstado === 'pagada' ? (fechaGuardada || estadoCambioFecha) : null
        const msg = nuevoEstado === 'pagada'
          ? `Factura #${facturaId} -> ${labelEstado} | Pago anterior: ${formatFechaPago(fechaAnterior) || 'N/A'} | Pago nuevo: ${formatFechaPago(fechaPagoFinal)}`
          : `Factura #${facturaId} -> ${labelEstado} | Pago anterior: ${formatFechaPago(fechaAnterior) || 'N/A'} | Pago nuevo: N/A`
        toast.success(msg)
        console.info('[facturas-proveedores][change-status]', {
          facturaId,
          estadoAnterior: facturaAntes?.estado_pago || showProveedorDetail?.estado_pago || null,
          estadoNuevo: nuevoEstado,
          fechaAnterior,
          fechaEnviada: requiereFechaPago ? estadoCambioFecha : null,
          fechaGuardadaBackend: fechaGuardada,
          fechaFinalUI: fechaPagoFinal,
        })

        // Reflejar cambio en UI inmediatamente para evitar ver datos viejos mientras recarga.
        setFacturasProveedores(prev => prev.map(f => (
          f.id === facturaId
            ? {
                ...f,
                estado_pago: nuevoEstado,
                fecha_pago: fechaPagoFinal,
              }
            : f
        )))

        setShowProveedorDetail(prev => (
          prev && prev.id === facturaId
            ? { ...prev, estado_pago: nuevoEstado, fecha_pago: fechaPagoFinal }
            : prev
        ))

        setShowEstadoMenu(null)
        setConfirmEstadoChange(null)
        setEstadoCambioFecha(new Date().toISOString().slice(0, 10))
        setShowProveedorDetail(null) // Cerrar modal de detalle
        await loadFacturasProveedores()
      } else {
        toast.error(res.data.error || 'Error al cambiar estado')
      }
    } catch (err) {
      toast.error('Error al cambiar estado')
    }
    setChangingEstado(false)
  }

  // Seleccionar/deseleccionar todas las facturas
  const toggleSelectAll = () => {
    if (selectedFacturas.length === facturasProveedores.length) {
      setSelectedFacturas([])
    } else {
      setSelectedFacturas(facturasProveedores.map(f => f.id))
    }
  }

  const toggleSelectFactura = (id) => {
    setSelectedFacturas(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Cambio masivo de estado - mostrar confirmación
  const handleBulkChangeEstado = () => {
    if (!bulkEstado || selectedFacturas.length === 0) return
    setShowBulkConfirm(true)
  }

  // Confirmar y ejecutar cambio masivo
  const confirmarBulkChangeEstado = async () => {
    setBulkChanging(true)
    try {
      const res = await axios.post('/api/admin/facturas-proveedores/bulk-change-status', {
        factura_ids: selectedFacturas,
        estado: bulkEstado,
        fecha: bulkFecha || undefined
      })
      if (res.data.success) {
        toast.success(res.data.message)
        setSelectedFacturas([])
        setBulkEstado('')
        setBulkFecha('')
        setShowBulkConfirm(false)
        loadFacturasProveedores()
      } else {
        toast.error(res.data.error || 'Error al cambiar estados')
      }
    } catch (err) {
      toast.error('Error al cambiar estados')
    }
    setBulkChanging(false)
  }

  // Descargar PDF de factura a proveedor
  const handleDownloadPdfProveedor = async (facturaId, numeroFactura, abono) => {
    try {
      const response = await axios.get(`/api/admin/facturas-proveedores/${facturaId}/pdf`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${abono}_${numeroFactura}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    } catch (error) {
      toast.error('Error al descargar PDF')
    }
  }

  useEffect(() => {
    loadFacturas()
  }, [page, estadoFilter, empresaFilter, periodoFilter, fechaDesde, fechaHasta])

  // Cargar facturas de proveedores cuando cambia a esa pestaña
  useEffect(() => {
    if (activeTab === 'proveedores' && facturasProveedores.length === 0) {
      loadFacturasProveedores()
    }
  }, [activeTab])

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
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Facturación Global</h1>
            <p className="text-sm text-gray-500">Gestión de todas las facturas del sistema</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          {activeTab === 'clientes' && (
            <>
              <button
                onClick={loadGlobalStats}
                className="min-w-0 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="truncate">Estadisticas</span>
              </button>
              <button
                onClick={exportCSV}
                className="min-w-0 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="truncate">Exportar CSV</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="min-w-0 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Factura</span>
                <span className="sm:hidden">Nueva</span>
              </button>
              <button
                onClick={loadFacturas}
                className="min-w-0 flex items-center justify-center px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="ml-2 sm:hidden">Actualizar</span>
              </button>
            </>
          )}
          {activeTab === 'proveedores' && (
            <button
              onClick={loadFacturasProveedores}
              disabled={loadingProveedores}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {loadingProveedores ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Actualizar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100 p-1 rounded-lg">
        <div className="grid grid-cols-1 sm:flex gap-1 sm:min-w-max">
        <button
          onClick={() => setActiveTab('clientes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center sm:justify-start gap-2 min-w-0 ${
            activeTab === 'clientes' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span className="truncate">Facturas a Clientes</span>
        </button>
        <button
          onClick={() => setActiveTab('proveedores')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center sm:justify-start gap-2 min-w-0 ${
            activeTab === 'proveedores' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span className="truncate">Facturas a Proveedores</span>
        </button>
        </div>
      </div>

      {/* TAB: Facturas a Clientes */}
      {activeTab === 'clientes' && (
        <>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-white rounded-xl border shadow-sm min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold leading-none">{pagination.total}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">Total Facturas</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 sm:p-4 bg-white rounded-xl border shadow-sm min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 bg-green-100 rounded-lg shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold break-words leading-none">{formatMonto(stats.este_mes?.monto)}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">Este Mes</p>
              </div>
            </div>
          </div>
          
          {Object.entries(ESTADO_CONFIG).slice(0, 3).map(([estado, config]) => {
            const stat = stats.by_estado?.[estado] || { count: 0, monto: 0 }
            return (
              <div
                key={estado}
                className={`p-3 sm:p-4 bg-white rounded-xl border shadow-sm cursor-pointer transition-all min-w-0 ${
                  estadoFilter === estado ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => { setEstadoFilter(estadoFilter === estado ? '' : estado); setPage(1) }}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${config.color.split(' ')[0]}`}>
                    <config.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color.split(' ')[1]}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold leading-none">{stat.count}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">{config.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto] gap-3 items-end">
          <form onSubmit={handleSearch} className="sm:col-span-2 xl:col-span-1 min-w-0">
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

          <div className="min-w-0">
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

          <div className="min-w-0">
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

          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPage(1) }}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="min-w-0">
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
              className="w-full xl:w-auto flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg xl:border-0"
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
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {facturas.map((factura) => {
                const estadoConfig = ESTADO_CONFIG[factura.estado] || ESTADO_CONFIG.pendiente
                return (
                  <div key={factura.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 break-words">{factura.empresa_nombre || '-'}</p>
                        <p className="text-xs text-gray-500 break-all">{factura.empresa_cuit}</p>
                        <p className="text-[11px] text-gray-400 mt-1">#{factura.id} · {factura.periodo || '-'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${estadoConfig.badge}`}>
                        <estadoConfig.icon className="w-3 h-3" />
                        {estadoConfig.label}
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-400 mb-1">Descripcion</p>
                      <p className="text-sm text-gray-600">{factura.descripcion || factura.plan_nombre || '-'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 mb-1">Total</p>
                        <p className="font-medium text-gray-900 break-words">{formatMonto(factura.precio_total, factura.currency_code)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Fecha</p>
                        <p className="text-gray-700">{formatDate(factura.created_at)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => loadDetail(factura.id)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(factura.id)}
                        disabled={downloadingPdf === factura.id}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                      >
                        {downloadingPdf === factura.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        PDF
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(factura)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
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
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
        </>
      )}

      {/* TAB: Facturas a Proveedores */}
      {activeTab === 'proveedores' && (
        <div className="space-y-4">
          {/* Stats de estados de pago */}
          {Object.keys(proveedoresStats).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(ESTADO_PAGO_PROV).map(([key, cfg]) => {
                const stat = proveedoresStats[key] || { cantidad: 0, total_eur: 0, total_usd: 0 }
                return (
                  <div key={key} className={`${cfg.color} rounded-xl p-3 sm:p-4 min-w-0`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <cfg.icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      <span className="font-medium">{cfg.label}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold mt-2 leading-none">{stat.cantidad || 0}</p>
                    <p className="text-xs sm:text-sm opacity-75 break-words">
                      {(() => {
                        const totals = normalizeTotalsByRate(stat, eurUsdRate)
                        return `€${totals.eur.toFixed(2)} | $${totals.usd.toFixed(2)}`
                      })()}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tabla de facturas a proveedores */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loadingProveedores ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : facturasProveedores.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay facturas a proveedores generadas</p>
                <p className="text-sm mt-1">Ve a Facturación de Solicitudes para generar facturas</p>
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-gray-100">
                  {sortedFacturasProveedores.map(f => {
                    const estadoKey = f.estado_pago || 'pendiente'
                    const estadoCfg = ESTADO_PAGO_PROV[estadoKey] || ESTADO_PAGO_PROV.pendiente
                    const monedaFactura = f.moneda || 'EUR'
                    return (
                      <div key={f.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono font-medium text-blue-600 break-all">{f.numero_factura}</p>
                            <div className="flex items-center gap-1 mt-1 text-gray-600 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(f.created_at).toLocaleDateString('es-AR')}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${estadoCfg.color}`}>
                            <estadoCfg.icon className="h-3 w-3" />
                            {estadoCfg.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="col-span-2">
                            <p className="text-gray-400 mb-1">Cliente</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{f.usuario_abono}</span>
                              {f.usuario_nombre && <span className="text-gray-700">{f.usuario_nombre}</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Documento</p>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${f.tipo_documento === 'Remito' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{f.tipo_documento}</span>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Cantidad</p>
                            <p className="text-gray-700">{f.cantidad_solicitudes}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Total {monedaFactura}</p>
                            <p className="font-medium text-gray-900">{formatByCurrency(f.total_eur, monedaFactura)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => setShowProveedorDetail(f)}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                          {f.tiene_pdf ? (
                            <button
                              onClick={() => handleDownloadPdfProveedor(f.id, f.numero_factura, f.usuario_abono)}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">

                {/* Barra de acciones masivas */}
                {selectedFacturas.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-3">
                    <span className="text-sm font-medium text-indigo-700">
                      {selectedFacturas.length} seleccionada{selectedFacturas.length > 1 ? 's' : ''}
                    </span>
                    <select
                      value={bulkEstado}
                      onChange={(e) => setBulkEstado(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="">Cambiar estado a...</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="facturada">Facturada</option>
                      <option value="pagada">Pagada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <input
                      type="date"
                      value={bulkFecha}
                      onChange={(e) => setBulkFecha(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      title="Fecha (opcional, por defecto hoy)"
                    />
                    <button
                      onClick={handleBulkChangeEstado}
                      disabled={!bulkEstado || bulkChanging}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {bulkChanging ? 'Aplicando...' : 'Aplicar'}
                    </button>
                    <button
                      onClick={() => { setSelectedFacturas([]); setBulkEstado(''); setBulkFecha('') }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                <table className="min-w-[920px] w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={sortedFacturasProveedores.length > 0 && selectedFacturas.length === sortedFacturasProveedores.length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          title={selectedFacturas.length === sortedFacturasProveedores.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        />
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => handleSortProveedores('fecha')} className="inline-flex items-center gap-1 hover:text-gray-700">
                          Fecha <span>{getSortIndicator('fecha')}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => handleSortProveedores('numero_factura')} className="inline-flex items-center gap-1 hover:text-gray-700">
                          N° Factura <span>{getSortIndicator('numero_factura')}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => handleSortProveedores('cliente')} className="inline-flex items-center gap-1 hover:text-gray-700">
                          Cliente <span>{getSortIndicator('cliente')}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <button onClick={() => handleSortProveedores('cantidad')} className="inline-flex items-center gap-1 hover:text-gray-700">
                          Cant. <span>{getSortIndicator('cantidad')}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button onClick={() => handleSortProveedores('total')} className="inline-flex items-center gap-1 hover:text-gray-700">
                          Total <span>{getSortIndicator('total')}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <button onClick={() => handleSortProveedores('estado')} className="inline-flex items-center gap-1 hover:text-gray-700">
                          Estado <span>{getSortIndicator('estado')}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedFacturasProveedores.map(f => {
                      const estadoKey = f.estado_pago || 'pendiente'
                      const estadoCfg = ESTADO_PAGO_PROV[estadoKey] || ESTADO_PAGO_PROV.pendiente
                      const monedaFactura = f.moneda || 'EUR'
                      return (
                        <tr key={f.id} className={`hover:bg-gray-50 ${selectedFacturas.includes(f.id) ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedFacturas.includes(f.id)}
                              onChange={() => toggleSelectFactura(f.id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-3 w-3" />
                              {new Date(f.created_at).toLocaleDateString('es-AR')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-blue-600">{f.numero_factura}</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                              f.tipo_documento === 'Remito' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {f.tipo_documento}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{f.usuario_abono}</span>
                            {f.usuario_nombre && <span className="text-gray-500 ml-1 text-sm">- {f.usuario_nombre}</span>}
                          </td>
                          <td className="px-4 py-3 text-center">{f.cantidad_solicitudes}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatByCurrency(f.total_eur, monedaFactura)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoCfg.color}`}>
                              <estadoCfg.icon className="h-3 w-3" />
                              {estadoCfg.label}
                            </span>
                            {estadoKey === 'pagada' && f.fecha_pago && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Pago: {formatFechaPago(f.fecha_pago)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setShowProveedorDetail(f)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              {f.tiene_pdf && (
                                <button
                                  onClick={() => handleDownloadPdfProveedor(f.id, f.numero_factura, f.usuario_abono)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg"
                                  title="Descargar PDF"
                                >
                                  <Download className="w-4 h-4 text-blue-600" />
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle Factura Proveedor */}
      {showProveedorDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  {showProveedorDetail.tipo_documento} #{showProveedorDetail.numero_factura}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  ESTADO_PAGO_PROV[showProveedorDetail.estado_pago || 'facturada']?.color || 'bg-blue-100 text-blue-700'
                }`}>
                  {ESTADO_PAGO_PROV[showProveedorDetail.estado_pago || 'facturada']?.icon && (
                    <Clock className="w-3 h-3" />
                  )}
                  {ESTADO_PAGO_PROV[showProveedorDetail.estado_pago || 'facturada']?.label || 'Facturada'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {showProveedorDetail.tiene_pdf && (
                  <button
                    onClick={() => handleDownloadPdfProveedor(showProveedorDetail.id, showProveedorDetail.numero_factura, showProveedorDetail.usuario_abono)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                )}
                <button onClick={() => setShowProveedorDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info del cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-semibold">{showProveedorDetail.usuario_nombre || '-'}</p>
                  <p className="font-mono text-sm text-blue-600">{showProveedorDetail.usuario_abono}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Proveedor</p>
                  <p className="font-semibold">{showProveedorDetail.proveedor_nombre || showProveedorDetail.proveedor_codigo}</p>
                </div>
              </div>

              {/* Detalles */}
              <div className="border rounded-lg divide-y">
                <div className="p-4 flex justify-between">
                  <span className="text-gray-600">Fecha</span>
                  <span className="font-medium">{new Date(showProveedorDetail.created_at).toLocaleDateString('es-AR')}</span>
                </div>
                <div className="p-4 flex justify-between">
                  <span className="text-gray-600">Periodo</span>
                  <span className="font-medium">{showProveedorDetail.mes}/{showProveedorDetail.anio}</span>
                </div>
                <div className="p-4 flex justify-between">
                  <span className="text-gray-600">Cantidad solicitudes</span>
                  <span className="font-medium">{showProveedorDetail.cantidad_solicitudes}</span>
                </div>
                {showProveedorDetail.po_number && (
                  <div className="p-4 flex justify-between">
                    <span className="text-gray-600">PO Number</span>
                    <span className="font-medium">{showProveedorDetail.po_number}</span>
                  </div>
                )}
                <div className="p-4 flex justify-between bg-gray-50 font-semibold text-lg">
                  <span>Total {showProveedorDetail.moneda || 'EUR'}</span>
                  <span className="text-emerald-600">{formatByCurrency(showProveedorDetail.total_eur, showProveedorDetail.moneda || 'EUR')}</span>
                </div>
              </div>

              {/* Fecha de pago si está pagada */}
              {(showProveedorDetail.estado_pago === 'pagada') && showProveedorDetail.fecha_pago && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Fecha de pago</p>
                  <p className="font-medium text-green-700">{formatFechaPago(showProveedorDetail.fecha_pago)}</p>
                </div>
              )}

              {/* Acciones - Cambiar estado */}
              <div className="flex gap-2 pt-4 border-t flex-wrap">
                <span className="text-sm text-gray-500 self-center mr-auto">Cambiar estado:</span>
                {Object.entries(ESTADO_PAGO_PROV).map(([estado, config]) => (
                  <button
                    key={estado}
                    onClick={() => handleCambiarEstadoPago(showProveedorDetail.id, estado)}
                    disabled={changingEstado}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                      (showProveedorDetail.estado_pago || 'facturada') === estado
                        ? `${config.color}`
                        : 'border hover:bg-gray-50'
                    }`}
                  >
                    <config.icon className="w-3 h-3" />
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cambio de Estado */}
      {confirmEstadoChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmar cambio de estado</h3>
                <p className="text-sm text-gray-500">Esta acción modificará el estado de la factura</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                {(showProveedorDetail?.estado_pago || 'facturada') === confirmEstadoChange.nuevoEstado
                  ? '¿Desea actualizar la fecha del estado actual de la factura a '
                  : '¿Está seguro que desea cambiar el estado de la factura a '}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  ESTADO_PAGO_PROV[confirmEstadoChange.nuevoEstado]?.color || 'bg-gray-100'
                }`}>
                  {ESTADO_PAGO_PROV[confirmEstadoChange.nuevoEstado]?.label || confirmEstadoChange.nuevoEstado}
                </span>?
              </p>
            </div>

            {confirmEstadoChange.nuevoEstado === 'pagada' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de pago
                </label>
                <input
                  type="date"
                  value={estadoCambioFecha}
                  onChange={(e) => setEstadoCambioFecha(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={changingEstado}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmEstadoChange(null)
                  setEstadoCambioFecha(new Date().toISOString().slice(0, 10))
                }}
                disabled={changingEstado}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioEstado}
                disabled={changingEstado}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                  confirmEstadoChange.nuevoEstado === 'pagada' ? 'bg-green-600 hover:bg-green-700' :
                  confirmEstadoChange.nuevoEstado === 'cancelada' ? 'bg-gray-600 hover:bg-gray-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {changingEstado ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Cambio Masivo */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmar cambio masivo</h3>
                <p className="text-sm text-gray-500">Esta acción afectará múltiples facturas</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-2">
              <p className="text-sm text-gray-600">
                Se cambiará el estado de <span className="font-bold text-gray-900">{selectedFacturas.length} factura{selectedFacturas.length > 1 ? 's' : ''}</span> a{' '}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  ESTADO_PAGO_PROV[bulkEstado]?.color || 'bg-gray-100'
                }`}>
                  {ESTADO_PAGO_PROV[bulkEstado]?.label || bulkEstado}
                </span>
              </p>
              {bulkFecha && (
                <p className="text-sm text-gray-600">
                  Fecha: <span className="font-medium text-gray-900">{new Date(bulkFecha + 'T12:00:00').toLocaleDateString('es-AR')}</span>
                </p>
              )}
              {!bulkFecha && (
                <p className="text-sm text-gray-400 italic">
                  Fecha: se usará la fecha de hoy ({new Date().toLocaleDateString('es-AR')})
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkChanging}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBulkChangeEstado}
                disabled={bulkChanging}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                  bulkEstado === 'pagada' ? 'bg-green-600 hover:bg-green-700' :
                  bulkEstado === 'cancelada' ? 'bg-gray-600 hover:bg-gray-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {bulkChanging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
