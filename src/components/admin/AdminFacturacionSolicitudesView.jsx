import { useState, useEffect, useMemo } from 'react'
import { 
  FileText, Download, Filter, RefreshCw, Loader2, Calendar, Users, 
  Building2, ChevronDown, ChevronRight, Check, Euro, Receipt, FileSpreadsheet,
  X, Printer, CheckCircle, History, Clock, DollarSign, AlertCircle, MoreVertical, Pencil
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

// Configuración de estados de pago
const ESTADO_PAGO_CONFIG = {
  pendiente: { label: 'Pendiente', icon: Clock, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  facturada: { label: 'Facturada', icon: FileText, color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  pagada: { label: 'Pagada', icon: CheckCircle, color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  cancelada: { label: 'Cancelada', icon: AlertCircle, color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
}

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

const ROW_ORDER_OPTIONS = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'id_pais', label: 'ID / País' },
  { value: 'prioridad', label: 'Prioridad' },
  { value: 'precio', label: 'Precio' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'estado', label: 'Estado' },
]

export default function AdminFacturacionSolicitudesView() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    solicitudes: [],
    resumen: [],
    total_general_eur: 0,
    pricing_policy: 'notify',
    pricing_missing: [],
    pricing_missing_count: 0,
  })
  const [usuarios, setUsuarios] = useState([])
  const [expandedCliente, setExpandedCliente] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  
  // Moneda por cliente (usuario_abono -> 'EUR' | 'USD')
  const [monedaPorCliente, setMonedaPorCliente] = useState({})
  
  // Moneda para el resumen general
  const [monedaResumen, setMonedaResumen] = useState('EUR')
  const [expandedResumenCliente, setExpandedResumenCliente] = useState(null)
  const [eurUsdRate, setEurUsdRate] = useState(1.2)
  const [exporting, setExporting] = useState(false)
  
  // Tab activa: 'solicitudes' o 'historial'
  const [activeTab, setActiveTab] = useState('solicitudes')
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  
  // Modal de facturación
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)
  const [marking, setMarking] = useState(false)

  const getTodayInputDate = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value
    const d = new Date(normalized)
    if (Number.isNaN(d.getTime())) {
      return String(value).replace('T', ' ').replace(/([+-]\d{2}:\d{2})$/, '')
    }
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const isEstadoPendiente = (sol) => (sol?.factura_estado_pago || '').toLowerCase() === 'pendiente'
  const isFacturable = (sol) => !sol?.facturado || isEstadoPendiente(sol)

  // Modal de revertir
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [revertData, setRevertData] = useState(null)
  const [reverting, setReverting] = useState(false)

  // Modal de confirmación de facturado
  const [showConfirmFacturadoModal, setShowConfirmFacturadoModal] = useState(false)

  // Modal de cambio de estado de pago
  const [showEstadoModal, setShowEstadoModal] = useState(null) // factura object
  const [changingEstado, setChangingEstado] = useState(false)
  const [historialStats, setHistorialStats] = useState({})

  // Edición inline de precio (admin only)
  const [editingPrecio, setEditingPrecio] = useState(null) // sol.id
  const [editPrecioValue, setEditPrecioValue] = useState('')
  const [savingPrecio, setSavingPrecio] = useState(false)
  const [showMonitoreoHistorialModal, setShowMonitoreoHistorialModal] = useState(false)
  const [loadingMonitoreoHistorial, setLoadingMonitoreoHistorial] = useState(false)
  const [monitoreoHistorialData, setMonitoreoHistorialData] = useState(null)
  const [rowOrderBy, setRowOrderBy] = useState('fecha')
  const [rowOrderDir, setRowOrderDir] = useState('desc')

  // Filtros
  const now = new Date()
  const [filtros, setFiltros] = useState({
    mes: now.getMonth() + 1,
    anio: now.getFullYear(),
    usuario_id: '',
    proveedor_id: '',
    facturado: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  // Acordeón de resumen
  const [showResumen, setShowResumen] = useState(false)
  const [showMobilePeriodo, setShowMobilePeriodo] = useState(false)
  const [showMobileFiltros, setShowMobileFiltros] = useState(false)
  const [showMobileDetalle, setShowMobileDetalle] = useState(false)

  const limpiarFiltros = () => {
    const now = new Date()
    setFiltros({
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
      usuario_id: '',
      proveedor_id: '',
      facturado: '',
      fechaDesde: '',
      fechaHasta: ''
    })
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  useEffect(() => {
    loadData()
  }, [filtros])

  const loadUsuarios = async () => {
    try {
      const res = await axios.get('/api/admin/facturacion-solicitudes/usuarios')
      if (res.data.success) {
        setUsuarios(res.data.usuarios)
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtros.fechaDesde) {
        params.set('fecha_desde', filtros.fechaDesde)
      } else if (filtros.mes) {
        params.set('mes', filtros.mes)
      }
      if (filtros.fechaHasta) {
        params.set('fecha_hasta', filtros.fechaHasta)
      } else if (filtros.anio) {
        params.set('anio', filtros.anio)
      }
      if (!filtros.fechaDesde && !filtros.fechaHasta) {
        if (filtros.mes) params.set('mes', filtros.mes)
        if (filtros.anio) params.set('anio', filtros.anio)
      }
      if (filtros.usuario_id) params.set('usuario_id', filtros.usuario_id)
      if (filtros.proveedor_id) params.set('proveedor_id', filtros.proveedor_id)
      if (filtros.facturado) params.set('facturado', filtros.facturado)

      const [res, tasasRes] = await Promise.all([
        axios.get(`/api/admin/facturacion-solicitudes?${params}`),
        axios.get('/api/admin/precios-pais/tasas-cambio').catch(() => null),
      ])
      if (res.data.success) {
        setData(res.data)
        setSelectedIds([])
        
        // Inicializar moneda por cliente usando la moneda_facturacion de cada solicitud
        const monedas = {}
        res.data.solicitudes?.forEach(sol => {
          if (sol.usuario_abono && !monedas[sol.usuario_abono]) {
            monedas[sol.usuario_abono] = sol.moneda_facturacion || 'EUR'
          }
        })
        setMonedaPorCliente(prev => ({ ...prev, ...monedas }))
      }

      if (tasasRes?.data?.success) {
        const tasaEurUsd = tasasRes.data.tasas?.find(
          t => t.moneda_origen === 'EUR' && t.moneda_destino === 'USD'
        )
        if (tasaEurUsd?.tasa) {
          setEurUsdRate(Number(tasaEurUsd.tasa))
        }
      }
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const getPrecioEur = (sol) => Number(sol.precio_eur || sol.precio_calculado || 0)
  const getPrecioUsd = (sol) => {
    if (sol.precio_usd && Number(sol.precio_usd) > 0) return Number(sol.precio_usd)
    return getPrecioEur(sol) * eurUsdRate
  }
  const getPrecioByMoneda = (sol, moneda) => {
    return moneda === 'USD' ? getPrecioUsd(sol) : getPrecioEur(sol)
  }

  const getMonitoreoUsoLabel = (sol = {}) => {
    const uso = Number(sol?.monitoreo_prepago_uso_numero || 0)
    const total = Number(sol?.monitoreo_prepago_total_cupo || 0)
    if (uso > 0 && total > 0) return `${uso}/${total}`
    return null
  }

  const getMonitoreoStatusBadge = (sol = {}) => {
    if ((sol?.prioridad || '').toLowerCase() !== 'monitoreo') return null
    const usoLabel = getMonitoreoUsoLabel(sol)
    if (!usoLabel) return null

    const precio = Number(sol?.precio_eur || 0)
    if (precio <= 0) {
      return {
        label: usoLabel,
        title: `Ya pagado ${usoLabel}`,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    }

    return {
      label: usoLabel,
      title: `Validado ${usoLabel}`,
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }
  }

  const getPriorityRank = (value) => {
    const p = String(value || '').toLowerCase()
    if (p === 'urgente') return 1
    if (p === 'monitoreo') return 2
    if (p === '72h') return 3
    return 4
  }

  const getEstadoSortRank = (sol = {}) => {
    if (isFacturable(sol)) return 1 // pendiente
    const estado = String(sol?.factura_estado_pago || 'facturada').toLowerCase()
    if (estado === 'facturada') return 2
    if (estado === 'pagada') return 3
    if (estado === 'cancelada') return 4
    return 5
  }

  const getSortDateValue = (sol = {}) => {
    const raw = sol?.fecha_completado_ts || sol?.updated_at || sol?.fecha_completado
    if (!raw) return 0
    if (typeof raw === 'number') return raw

    const text = String(raw).trim()

    // ISO u otros formatos parseables por Date.
    const normalized = text.replace(' ', 'T')
    const t1 = new Date(normalized).getTime()
    if (!Number.isNaN(t1)) return t1

    // Formato local: dd/mm/yyyy hh:mm[:ss]
    const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
    if (m) {
      const day = Number(m[1])
      const month = Number(m[2]) - 1
      const year = Number(m[3])
      const hour = Number(m[4] || 0)
      const minute = Number(m[5] || 0)
      const second = Number(m[6] || 0)
      return new Date(year, month, day, hour, minute, second).getTime()
    }

    return 0
  }

  const compareRows = (a, b, monedaCliente) => {
    let av
    let bv

    if (rowOrderBy === 'empresa') {
      av = String(a?.razon_social || '').trim().toUpperCase()
      bv = String(b?.razon_social || '').trim().toUpperCase()
    } else if (rowOrderBy === 'id_pais') {
      av = `${String(a?.cuit || '').trim()}|${String(a?.pais_codigo || '').trim()}`
      bv = `${String(b?.cuit || '').trim()}|${String(b?.pais_codigo || '').trim()}`
    } else if (rowOrderBy === 'prioridad') {
      av = getPriorityRank(a?.prioridad)
      bv = getPriorityRank(b?.prioridad)
    } else if (rowOrderBy === 'precio') {
      av = getPrecioByMoneda(a, monedaCliente)
      bv = getPrecioByMoneda(b, monedaCliente)
    } else if (rowOrderBy === 'estado') {
      av = getEstadoSortRank(a)
      bv = getEstadoSortRank(b)
    } else {
      av = getSortDateValue(a)
      bv = getSortDateValue(b)
    }

    let base = 0
    if (typeof av === 'string' || typeof bv === 'string') {
      base = String(av).localeCompare(String(bv), 'es', { sensitivity: 'base', numeric: true })
    } else {
      base = Number(av || 0) - Number(bv || 0)
    }

    // Empate estable para evitar sensación de "no ordena" cuando hay valores iguales.
    if (base === 0) {
      base = Number(a?.id || 0) - Number(b?.id || 0)
    }

    return rowOrderDir === 'asc' ? base : -base
  }

  const applySortField = (field, keepDirection = false) => {
    if (keepDirection) {
      setRowOrderBy(field)
      return
    }
    setRowOrderBy(field)
    setRowOrderDir(field === 'fecha' ? 'desc' : 'asc')
  }

  const toggleSort = (field) => {
    if (rowOrderBy === field) {
      setRowOrderDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    applySortField(field)
  }

  const getSortIndicator = (field) => {
    if (rowOrderBy !== field) return '↕'
    return rowOrderDir === 'asc' ? '↑' : '↓'
  }

  const openMonitoreoHistorialModal = async (sol) => {
    const prepagoId = Number(sol?.monitoreo_prepago_id || 0)
    if (!prepagoId) return

    setShowMonitoreoHistorialModal(true)
    setLoadingMonitoreoHistorial(true)
    setMonitoreoHistorialData(null)
    try {
      const res = await axios.get(`/api/monitoreo-prepagos/${prepagoId}/historial`)
      if (res.data?.success) {
        setMonitoreoHistorialData(res.data)
      } else {
        toast.error(res.data?.error || 'No se pudo cargar el historial de monitoreo')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error cargando historial de monitoreo')
    } finally {
      setLoadingMonitoreoHistorial(false)
    }
  }

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
    }
  }

  const normalizeTotalsByRate = (stat = {}, rate = 1.2) => {
    const safeRate = Number(rate) > 0 ? Number(rate) : 1.2
    const rawEur = Number(stat?.total_eur || 0)
    const rawUsd = Number(stat?.total_usd || 0)
    const eur = rawEur + (rawUsd / safeRate)
    const usd = rawUsd + (rawEur * safeRate)
    return {
      eur: Number(eur.toFixed(2)),
      usd: Number(usd.toFixed(2)),
    }
  }

  const selectedMissingPricing = useMemo(() => {
    if (!selectedIds.length) return []
    const selected = new Set(selectedIds)
    return (data.pricing_missing || []).filter(item =>
      (item.solicitud_ids || []).some(id => selected.has(id))
    )
  }, [data.pricing_missing, selectedIds])

  // Guardar precio editado (admin only)
  const handleSavePrecio = async (solId) => {
    const newPrecio = parseFloat(editPrecioValue)
    if (isNaN(newPrecio) || newPrecio < 0) {
      toast.error('Precio inválido')
      return
    }
    setSavingPrecio(true)
    try {
      const res = await axios.put(`/api/pedidos-solicitudes/${solId}`, { precio_eur: newPrecio })
      if (res.data.success) {
        toast.success(newPrecio === 0 ? 'Solicitud marcada como no facturable' : `Precio actualizado a €${newPrecio.toFixed(2)}`)
        setEditingPrecio(null)
        loadData()
      } else {
        toast.error(res.data.error || 'Error al actualizar precio')
      }
    } catch {
      toast.error('Error al guardar precio')
    } finally {
      setSavingPrecio(false)
    }
  }

  const loadHistorial = async () => {
    setLoadingHistorial(true)
    try {
      const params = new URLSearchParams()
      if (filtros.mes) params.set('mes', filtros.mes)
      if (filtros.anio) params.set('anio', filtros.anio)
      if (filtros.proveedor_id) {
        const prov = proveedores.find(p => p.id === parseInt(filtros.proveedor_id))
        if (prov) params.set('proveedor_codigo', prov.codigo)
      }
      if (filtros.usuario_id) {
        const usr = usuarios.find(u => u.id === parseInt(filtros.usuario_id))
        if (usr) params.set('usuario_abono', usr.abono)
      }

      const [resHistorial, resPendientes] = await Promise.all([
        axios.get(`/api/admin/facturas-proveedores/historial?${params}`),
        axios.get(`/api/admin/facturacion-solicitudes?${params}&facturado=false`).catch(() => null),
      ])

      if (resHistorial.data.success) {
        setHistorial(resHistorial.data.facturas)
        const statsBase = resHistorial.data.stats || {}
        if (resPendientes?.data?.success) {
          const pendingStats = buildPendingStatsFromSolicitudes(resPendientes.data.solicitudes || [], eurUsdRate)
          setHistorialStats({
            ...statsBase,
            pendiente: pendingStats,
          })
        } else {
          setHistorialStats(statsBase)
        }
      }
    } catch (err) {
      toast.error('Error al cargar historial')
    } finally {
      setLoadingHistorial(false)
    }
  }

  // Cambiar estado de pago de una factura
  const handleCambiarEstadoPago = async (facturaId, nuevoEstado) => {
    setChangingEstado(true)
    try {
      const res = await axios.post(`/api/admin/facturas-proveedores/${facturaId}/change-status`, {
        estado: nuevoEstado
      })
      if (res.data.success) {
        toast.success(`Estado cambiado a ${ESTADO_PAGO_CONFIG[nuevoEstado]?.label || nuevoEstado}`)
        setShowEstadoModal(null)
        loadHistorial()
      } else {
        toast.error(res.data.error || 'Error al cambiar estado')
      }
    } catch (err) {
      toast.error('Error al cambiar estado')
    } finally {
      setChangingEstado(false)
    }
  }

  const descargarPdfHistorial = async (facturaId, numero, abono) => {
    try {
      const res = await axios.get(`/api/admin/facturas-proveedores/${facturaId}/pdf`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${abono}_${numero}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Error al descargar PDF')
    }
  }

  // Cargar historial cuando cambia a esa tab o cambian los filtros
  useEffect(() => {
    if (activeTab === 'historial') {
      loadHistorial()
    }
  }, [activeTab, filtros.mes, filtros.anio, filtros.proveedor_id, filtros.usuario_id])

  const handleExport = async (formato) => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('format', formato)
      // Priorizar fechas si están definidas
      if (filtros.fechaDesde) params.set('fecha_desde', filtros.fechaDesde)
      if (filtros.fechaHasta) params.set('fecha_hasta', filtros.fechaHasta)
      // Si no hay fechas, usar mes/año
      if (!filtros.fechaDesde && !filtros.fechaHasta) {
        if (filtros.mes) params.set('mes', filtros.mes)
        if (filtros.anio) params.set('anio', filtros.anio)
      }
      if (filtros.usuario_id) params.set('usuario_id', filtros.usuario_id)
      if (filtros.proveedor_id) params.set('proveedor_id', filtros.proveedor_id)
      if (filtros.facturado) params.set('facturado', filtros.facturado)

      const res = await axios.get(`/api/admin/facturacion-solicitudes/export?${params}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      // Nombre de archivo según filtros
      let filename = 'Facturacion'
      if (filtros.fechaDesde || filtros.fechaHasta) {
        if (filtros.fechaDesde && filtros.fechaHasta) {
          filename = `Facturacion_${filtros.fechaDesde}_a_${filtros.fechaHasta}`
        } else if (filtros.fechaDesde) {
          filename = `Facturacion_desde_${filtros.fechaDesde}`
        } else {
          filename = `Facturacion_hasta_${filtros.fechaHasta}`
        }
      } else {
        const mesNombre = MESES.find(m => m.value === filtros.mes)?.label || filtros.mes
        filename = `Facturacion_${mesNombre}_${filtros.anio}`
      }
      a.download = `${filename}.${formato}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${formato.toUpperCase()} descargado`)
    } catch (err) {
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const handleMarcarFacturado = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una solicitud')
      return
    }
    
    // Obtener info del cliente/proveedor de las solicitudes seleccionadas
    const primeraSol = data.solicitudes.find(s => selectedIds.includes(s.id))
    if (!primeraSol) return

    const selectedSolicitudes = data.solicitudes.filter(s => selectedIds.includes(s.id))
    
    // Verificar que todas las seleccionadas sean del mismo cliente/proveedor
    const mismoCliente = selectedSolicitudes
      .every(s => s.usuario_abono === primeraSol.usuario_abono)
    
    if (!mismoCliente) {
      toast.error('Selecciona solicitudes de un solo cliente para generar la factura')
      return
    }

    if ((data.pricing_policy || 'notify') === 'block' && selectedMissingPricing.length > 0) {
      toast.error('Bloqueado por política pricing: hay países sin asociación proveedor-país')
      return
    }
    
    // Obtener la moneda del cliente
    const monedaCliente = monedaPorCliente[primeraSol.usuario_abono] || primeraSol.moneda_facturacion || 'EUR'
    
    // Calcular total en la moneda seleccionada
    const totalMonto = selectedSolicitudes
      .reduce((sum, s) => {
        const precio = getPrecioByMoneda(s, monedaCliente)
        return sum + precio
      }, 0)

    const precioOverrides = {}
    selectedSolicitudes.forEach(s => {
      precioOverrides[s.id] = getPrecioByMoneda(s, monedaCliente)
    })
    
    setModalData({
      usuario_abono: primeraSol.usuario_abono,
      usuario_nombre: primeraSol.usuario_nombre,
      proveedor_codigo: primeraSol.proveedor_codigo,
      proveedor_nombre: primeraSol.proveedor_nombre,
      cantidad: selectedIds.length,
      total_eur: totalMonto,
      solicitud_ids: selectedIds,
      moneda: monedaCliente,
      precio_overrides: precioOverrides,
    })
    setInvoiceNumber('')
    setInvoiceDate(getTodayInputDate())
    setPoNumber('')
    setPdfGenerated(false)
    setShowModal(true)
  }

  const handleGenerarPdf = async () => {
    if (!invoiceNumber) {
      toast.error('Ingresa el número de factura/remito')
      return
    }
    
    if ((data.pricing_policy || 'notify') === 'block') {
      const modalMissing = (data.pricing_missing || []).filter(item =>
        (item.solicitud_ids || []).some(id => (modalData?.solicitud_ids || []).includes(id))
      )
      if (modalMissing.length > 0) {
        toast.error('Bloqueado por política pricing: completa asociación de países antes de generar PDF')
        return
      }
    }

    setGeneratingPdf(true)
    try {
      const mesNum = filtros.mes === '' || filtros.mes == null ? null : Number(filtros.mes)
      const anioNum = filtros.anio === '' || filtros.anio == null ? null : Number(filtros.anio)
      const mesPayload = Number.isInteger(mesNum) && mesNum >= 1 && mesNum <= 12 ? mesNum : null
      const anioPayload = Number.isInteger(anioNum) && anioNum >= 2000 ? anioNum : null

      const res = await axios.post('/api/admin/facturacion-solicitudes/generar-pdf', {
        usuario_abono: modalData.usuario_abono,
        proveedor_codigo: modalData.proveedor_codigo,
        solicitud_ids: modalData.solicitud_ids,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        po_number: poNumber,
        mes: mesPayload,
        anio: anioPayload,
        moneda: modalData.moneda || 'EUR',
        precio_overrides: modalData.precio_overrides || {}
      }, { responseType: 'blob' })
      
      // Descargar PDF
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${modalData.usuario_abono}_${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF generado y descargado')
      setPdfGenerated(true)
    } catch (err) {
      toast.error('Error al generar PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleConfirmarFacturado = async () => {
    setShowConfirmFacturadoModal(false)
    setMarking(true)
    try {
      const mesNum = filtros.mes === '' || filtros.mes == null ? null : Number(filtros.mes)
      const anioNum = filtros.anio === '' || filtros.anio == null ? null : Number(filtros.anio)
      const mesPayload = Number.isInteger(mesNum) && mesNum >= 1 && mesNum <= 12 ? mesNum : null
      const anioPayload = Number.isInteger(anioNum) && anioNum >= 2000 ? anioNum : null

      // Primero generar y guardar el PDF en el historial
      await axios.post('/api/admin/facturacion-solicitudes/generar-pdf', {
        usuario_abono: modalData.usuario_abono,
        proveedor_codigo: modalData.proveedor_codigo,
        solicitud_ids: modalData.solicitud_ids,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        po_number: poNumber,
        mes: mesPayload,
        anio: anioPayload,
        moneda: modalData.moneda || 'EUR',
        precio_overrides: modalData.precio_overrides || {},
        save_to_history: true
      }, { responseType: 'blob' })

      // Luego marcar como facturadas
      const res = await axios.post('/api/admin/facturacion-solicitudes/marcar', {
        ids: modalData.solicitud_ids,
        facturado: true,
      })
      if (res.data.success) {
        toast.success(`${res.data.updated} solicitudes marcadas como facturadas`)
        setShowModal(false)
        setSelectedIds([])
        loadData()
        // Actualizar historial también
        if (activeTab === 'historial') loadHistorial()
      }
    } catch (err) {
      toast.error('Error al marcar como facturado')
    } finally {
      setMarking(false)
    }
  }

  const abrirModalRevertir = (sol) => {
    setRevertData(sol)
    setShowRevertModal(true)
  }

  const confirmarRevertir = async () => {
    if (!revertData) return
    setReverting(true)
    try {
      // Soporta tanto IDs múltiples como ID único (compatibilidad)
      const idsToRevert = revertData.ids || [revertData.id]
      const res = await axios.post('/api/admin/facturacion-solicitudes/marcar', {
        ids: idsToRevert,
        facturado: false,
        factura_id: null
      })
      if (res.data.success) {
        toast.success(`${res.data.updated} solicitud(es) revertida(s) a pendiente`)
        setShowRevertModal(false)
        setRevertData(null)
        loadData()
      }
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.facturas_asociadas) {
        toast.error(
          <div>
            <strong>{errorData.error}</strong>
            <br/>
            <small>{errorData.mensaje}</small>
            <ul className="mt-1 text-xs">
              {errorData.facturas_asociadas.slice(0,3).map((f,i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>,
          { duration: 8000 }
        )
      } else {
        toast.error(errorData?.error || 'Error al revertir')
      }
    } finally {
      setReverting(false)
    }
  }

  const toggleSelectAll = (clienteAbono) => {
    // Solo seleccionar solicitudes facturables (sin factura o con estado de pago pendiente)
    const solsPendientes = data.solicitudes.filter(s => s.usuario_abono === clienteAbono && isFacturable(s))
    const idsPendientes = solsPendientes.map(s => s.id)
    const allSelected = idsPendientes.length > 0 && idsPendientes.every(id => selectedIds.includes(id))
    
    if (allSelected) {
      // Deseleccionar todas
      setSelectedIds([])
    } else {
      // Seleccionar SOLO las pendientes de este cliente
      setSelectedIds(idsPendientes)
    }
  }

  // Obtener proveedores únicos
  const proveedores = [...new Map(usuarios.map(u => [u.proveedor_id, { id: u.proveedor_id, codigo: u.proveedor_codigo, nombre: u.proveedor_nombre }])).values()]

  // Agrupar solicitudes por cliente
  const solicitudesPorCliente = {}
  data.solicitudes.forEach(sol => {
    const key = sol.usuario_abono
    if (!solicitudesPorCliente[key]) {
      solicitudesPorCliente[key] = {
        usuario_id: sol.usuario_id,
        usuario_nombre: sol.usuario_nombre,
        usuario_abono: sol.usuario_abono,
        proveedor_codigo: sol.proveedor_codigo,
        proveedor_nombre: sol.proveedor_nombre,
        solicitudes: []
      }
    }
    solicitudesPorCliente[key].solicitudes.push(sol)
  })

  // Calcular resumen por cliente basado en la moneda seleccionada
  const resumenCalculado = useMemo(() => {
    const resumen = {}
    data.solicitudes.forEach(sol => {
      const key = sol.usuario_abono
      if (!resumen[key]) {
        resumen[key] = {
          usuario_abono: sol.usuario_abono,
          usuario_nombre: sol.usuario_nombre,
          proveedor_codigos: new Set(),
          qty_normal: 0,
          qty_urgente: 0,
          qty_monitoreo: 0,
          qty_72h: 0,
          total_informes: 0,
          total_eur: 0,
          total_usd: 0,
          tiene_usd: false
        }
      }
      const r = resumen[key]
      if (sol.proveedor_codigo) r.proveedor_codigos.add(sol.proveedor_codigo)
      const prio = sol.prioridad || 'normal'
      if (prio === 'urgente') r.qty_urgente++
      else if (prio === 'monitoreo') r.qty_monitoreo++
      else if (prio === '72h') r.qty_72h++
      else r.qty_normal++
      r.total_informes++
      r.total_eur += getPrecioEur(sol)
      r.total_usd += getPrecioUsd(sol)
      if (sol.precio_usd && Number(sol.precio_usd) > 0) r.tiene_usd = true
    })
    return Object.values(resumen).map(r => ({
      ...r,
      proveedor_codigos: Array.from(r.proveedor_codigos).sort(),
      proveedor_codigo: Array.from(r.proveedor_codigos).sort().join(', '),
    }))
  }, [data.solicitudes, eurUsdRate])

  // Detalle por cliente para validar facturacion por pais/prioridad
  const detalleResumenPorCliente = useMemo(() => {
    const detalle = {}

    data.solicitudes.forEach(sol => {
      const clienteKey = sol.usuario_abono || 'SIN_ABONO'
      const paisCodigo = sol.pais_codigo || '??'
      const paisNombre = sol.pais_nombre || 'Sin país'
      const paisKey = `${paisCodigo}|${paisNombre}`
      const prioridad = sol.prioridad || 'normal'
      const precioEur = getPrecioEur(sol)
      const precioUsd = getPrecioUsd(sol)

      if (!detalle[clienteKey]) detalle[clienteKey] = {}
      if (!detalle[clienteKey][paisKey]) {
        detalle[clienteKey][paisKey] = {
          pais_codigo: paisCodigo,
          pais_nombre: paisNombre,
          qty_normal: 0,
          eur_normal: 0,
          usd_normal: 0,
          qty_urgente: 0,
          eur_urgente: 0,
          usd_urgente: 0,
          qty_monitoreo_fact: 0,
          eur_monitoreo_fact: 0,
          usd_monitoreo_fact: 0,
          qty_monitoreo_cortesia: 0,
          eur_monitoreo_cortesia: 0,
          usd_monitoreo_cortesia: 0,
          qty_72h: 0,
          eur_72h: 0,
          usd_72h: 0,
          total_qty: 0,
          total_eur: 0,
          total_usd: 0,
        }
      }

      const row = detalle[clienteKey][paisKey]

      if (prioridad === 'urgente') {
        row.qty_urgente += 1
        row.eur_urgente += precioEur
        row.usd_urgente += precioUsd
      } else if (prioridad === '72h') {
        row.qty_72h += 1
        row.eur_72h += precioEur
        row.usd_72h += precioUsd
      } else if (prioridad === 'monitoreo') {
        if (precioEur > 0) {
          row.qty_monitoreo_fact += 1
          row.eur_monitoreo_fact += precioEur
          row.usd_monitoreo_fact += precioUsd
        } else {
          row.qty_monitoreo_cortesia += 1
          row.eur_monitoreo_cortesia += precioEur
          row.usd_monitoreo_cortesia += precioUsd
        }
      } else {
        row.qty_normal += 1
        row.eur_normal += precioEur
        row.usd_normal += precioUsd
      }

      row.total_qty += 1
      row.total_eur += precioEur
      row.total_usd += precioUsd
    })

    const salida = {}
    Object.keys(detalle).forEach(clienteKey => {
      salida[clienteKey] = Object.values(detalle[clienteKey]).sort((a, b) => {
        return (a.pais_codigo || '').localeCompare(b.pais_codigo || '')
      })
    })

    return salida
  }, [data.solicitudes, eurUsdRate])

  const toggleExpandedResumenCliente = (abono) => {
    setExpandedResumenCliente(prev => (prev === abono ? null : abono))
  }

  // Total general según moneda
  const totalGeneralMonto = useMemo(() => {
    return resumenCalculado.reduce((sum, r) => {
      return sum + (monedaResumen === 'USD' ? r.total_usd : r.total_eur)
    }, 0)
  }, [resumenCalculado, monedaResumen])

  return (
    <div className="space-y-4 px-1 sm:px-0">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Facturación de Solicitudes
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Solicitudes completadas de clientes con proveedor fijo asignado
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting || loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
          {!!data.pricing_missing_count && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Pricing faltante detectado ({data.pricing_missing_count})</p>
                  <p className="text-xs mt-0.5">
                    Modo actual: {(data.pricing_policy || 'notify').toUpperCase()}.{' '}
                    {(data.pricing_policy || 'notify') === 'block'
                      ? 'Se bloquea la facturación automática hasta asociar país/proveedor en Motor Pricing.'
                      : 'Se permite facturar, pero se recomienda completar asociación en Motor Pricing.'}
                  </p>
                </div>
              </div>
            </div>
          )}

        <div className="mt-4 rounded-xl bg-gray-100 p-1">
          <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`min-h-11 px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 ${
              activeTab === 'solicitudes'
                ? 'bg-emerald-100 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Solicitudes
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`min-h-11 px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-emerald-100 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <History className="h-4 w-4" />
            <span className="sm:hidden">Historial</span>
            <span className="hidden sm:inline">Historial de Facturas</span>
          </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
              <button
                type="button"
                onClick={() => setShowMobilePeriodo(prev => !prev)}
                className="md:hidden w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <Calendar className="h-4 w-4" />
                  Periodo
                </div>
                {showMobilePeriodo ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
              </button>
              <div className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Calendar className="h-4 w-4" />
                Periodo
              </div>
              <div className={`${showMobilePeriodo ? 'grid' : 'hidden'} md:grid grid-cols-1 sm:grid-cols-2 gap-3`}>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filtros.fechaDesde}
                      onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value, mes: '', anio: '' })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                    />
                    {filtros.fechaDesde && (
                      <button
                        onClick={() => setFiltros({ ...filtros, fechaDesde: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filtros.fechaHasta}
                      onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value, mes: '', anio: '' })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                    />
                    {filtros.fechaHasta && (
                      <button
                        onClick={() => setFiltros({ ...filtros, fechaHasta: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
                  <div className="relative">
                    <select
                      value={filtros.mes}
                      onChange={e => setFiltros({ ...filtros, mes: e.target.value ? parseInt(e.target.value) : '', fechaDesde: '', fechaHasta: '' })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                      disabled={filtros.fechaDesde || filtros.fechaHasta}
                    >
                      <option value="">-</option>
                      {MESES.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    {filtros.mes && (
                      <button
                        onClick={() => setFiltros({ ...filtros, mes: '' })}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
                  <div className="relative">
                    <select
                      value={filtros.anio}
                      onChange={e => setFiltros({ ...filtros, anio: e.target.value ? parseInt(e.target.value) : '', fechaDesde: '', fechaHasta: '' })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                      disabled={filtros.fechaDesde || filtros.fechaHasta}
                    >
                      <option value="">-</option>
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    {filtros.anio && (
                      <button
                        onClick={() => setFiltros({ ...filtros, anio: '' })}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
              <button
                type="button"
                onClick={() => setShowMobileFiltros(prev => !prev)}
                className="md:hidden w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <Filter className="h-4 w-4" />
                  Filtros
                </div>
                {showMobileFiltros ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
              </button>
              <div className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              <div className={`${showMobileFiltros ? 'grid' : 'hidden'} md:grid grid-cols-1 sm:grid-cols-2 gap-3`}>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
                  <div className="relative">
                    <select
                      value={filtros.proveedor_id}
                      onChange={e => setFiltros({ ...filtros, proveedor_id: e.target.value })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                    >
                      <option value="">Todos</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.codigo}</option>
                      ))}
                    </select>
                    {filtros.proveedor_id && (
                      <button
                        onClick={() => setFiltros({ ...filtros, proveedor_id: '' })}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                  <div className="relative">
                    <select
                      value={filtros.usuario_id}
                      onChange={e => setFiltros({ ...filtros, usuario_id: e.target.value })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                    >
                      <option value="">Todos</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>{u.abono} - {u.nombre_completo}</option>
                      ))}
                    </select>
                    {filtros.usuario_id && (
                      <button
                        onClick={() => setFiltros({ ...filtros, usuario_id: '' })}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <div className="relative">
                    <select
                      value={filtros.facturado}
                      onChange={e => setFiltros({ ...filtros, facturado: e.target.value })}
                      className="w-full min-h-11 px-3 py-2 text-sm border rounded-xl pr-8 bg-white"
                    >
                      <option value="">Todos</option>
                      <option value="false">Pendiente</option>
                      <option value="true">Facturado</option>
                    </select>
                    {filtros.facturado && (
                      <button
                        onClick={() => setFiltros({ ...filtros, facturado: '' })}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2">
            <button
              onClick={limpiarFiltros}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* TAB: Solicitudes */}
      {activeTab === 'solicitudes' && (
      <>
      {/* Resumen - Acordeón */}
      {resumenCalculado.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <button
            onClick={() => setShowResumen(!showResumen)}
            className="hidden md:flex w-full px-4 py-3 items-start sm:items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <h4 className="font-medium text-gray-900 flex items-center gap-2 min-w-0">
              <Euro className="h-4 w-4 text-emerald-600" />
              <span className="truncate">Resumen por Cliente</span>
              <span className="text-sm font-normal text-gray-500 whitespace-nowrap">({resumenCalculado.length} clientes)</span>
            </h4>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-bold text-emerald-700 text-sm sm:text-base">
                {monedaResumen === 'USD' ? '$' : '€'}{totalGeneralMonto.toFixed(2)}
              </span>
              {showResumen ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
            </div>
          </button>

          <button
            onClick={() => setShowResumen(!showResumen)}
            className="md:hidden w-full px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="min-w-0 flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-full bg-emerald-100 p-2 text-emerald-700">
                <Euro className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900">Resumen por Cliente</h4>
                <p className="text-xs text-gray-500 mt-1">{resumenCalculado.length} cliente(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-emerald-700 text-sm">
                {monedaResumen === 'USD' ? '$' : '€'}{totalGeneralMonto.toFixed(2)}
              </span>
              {showResumen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            </div>
          </button>
          
          {showResumen && (
            <div className="p-4">
              {/* Selector de moneda */}
              <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm text-gray-600">Moneda:</span>
                <div className="grid grid-cols-2 sm:inline-flex rounded-lg overflow-hidden border border-gray-300">
                  <button
                    onClick={() => setMonedaResumen('EUR')}
                    className={`px-3 py-2 text-xs font-medium ${
                      monedaResumen === 'EUR' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    € EUR
                  </button>
                  <button
                    onClick={() => setMonedaResumen('USD')}
                    className={`px-3 py-2 text-xs font-medium border-l border-gray-300 ${
                      monedaResumen === 'USD' 
                        ? 'bg-green-500 text-white border-green-500' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="md:hidden space-y-3">
                {resumenCalculado.map((r, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm text-blue-600">{r.usuario_abono}</p>
                        <p className="font-medium text-gray-900 break-words">{r.usuario_nombre}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                        {r.proveedor_codigos.map(code => (
                          <span key={code} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-gray-500">Normal</p><p className="font-medium">{r.qty_normal}</p></div>
                      <div><p className="text-xs text-gray-500">Urgente</p><p className="font-medium">{r.qty_urgente}</p></div>
                      <div><p className="text-xs text-gray-500">Monitoreo</p><p className="font-medium">{r.qty_monitoreo}</p></div>
                      <div><p className="text-xs text-gray-500">72h</p><p className="font-medium">{r.qty_72h}</p></div>
                      <div><p className="text-xs text-gray-500">Total informes</p><p className="font-medium">{r.total_informes}</p></div>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">Monto {monedaResumen}</span>
                      <span className="font-semibold text-emerald-600">
                        {monedaResumen === 'USD' ? '$' : '€'}{(monedaResumen === 'USD' ? r.total_usd : r.total_eur).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-500">Normal</p><p className="font-bold">{resumenCalculado.reduce((sum, r) => sum + r.qty_normal, 0)}</p></div>
                  <div><p className="text-xs text-gray-500">Urgente</p><p className="font-bold">{resumenCalculado.reduce((sum, r) => sum + r.qty_urgente, 0)}</p></div>
                  <div><p className="text-xs text-gray-500">Monitoreo</p><p className="font-bold">{resumenCalculado.reduce((sum, r) => sum + r.qty_monitoreo, 0)}</p></div>
                  <div><p className="text-xs text-gray-500">72h</p><p className="font-bold">{resumenCalculado.reduce((sum, r) => sum + r.qty_72h, 0)}</p></div>
                  <div><p className="text-xs text-gray-500">Total informes</p><p className="font-bold">{resumenCalculado.reduce((sum, r) => sum + r.total_informes, 0)}</p></div>
                  <div className="col-span-2 pt-2 border-t border-emerald-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Subtotal</span>
                    <span className="font-bold text-emerald-700 text-lg">
                      {monedaResumen === 'USD' ? '$' : '€'}{totalGeneralMonto.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Abonado</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Cliente</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Proveedor</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Normal</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Urgente</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Monitoreo</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">72h</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Monto {monedaResumen}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resumenCalculado.map((r, i) => (
                    <>
                    <tr key={`row-${i}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-blue-600">
                        <button
                          type="button"
                          onClick={() => toggleExpandedResumenCliente(r.usuario_abono)}
                          className="inline-flex items-center gap-1 hover:underline"
                          title="Ver detalle por país"
                        >
                          {r.usuario_abono}
                          {expandedResumenCliente === r.usuario_abono ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleExpandedResumenCliente(r.usuario_abono)}
                          className="text-left hover:underline"
                          title="Ver detalle por país"
                        >
                          {r.usuario_nombre}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {r.proveedor_codigos.map(code => (
                            <span key={code} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">{r.qty_normal}</td>
                      <td className="px-3 py-2 text-center">{r.qty_urgente}</td>
                      <td className="px-3 py-2 text-center">{r.qty_monitoreo}</td>
                      <td className="px-3 py-2 text-center">{r.qty_72h}</td>
                      <td className="px-3 py-2 text-center font-medium">{r.total_informes}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                        {monedaResumen === 'USD' ? '$' : '€'}{(monedaResumen === 'USD' ? r.total_usd : r.total_eur).toFixed(2)}
                      </td>
                    </tr>
                    {expandedResumenCliente === r.usuario_abono && (
                      <tr key={`detail-${i}`} className="bg-gray-50/60">
                        <td colSpan={9} className="px-3 py-3">
                          {(() => {
                            const detalleClienteRows = detalleResumenPorCliente[r.usuario_abono] || []
                            const detalleClienteTotals = detalleClienteRows.reduce((acc, d) => {
                              acc.qty_normal += d.qty_normal
                              acc.eur_normal += d.eur_normal
                              acc.usd_normal += d.usd_normal
                              acc.qty_urgente += d.qty_urgente
                              acc.eur_urgente += d.eur_urgente
                              acc.usd_urgente += d.usd_urgente
                              acc.qty_monitoreo_fact += d.qty_monitoreo_fact
                              acc.eur_monitoreo_fact += d.eur_monitoreo_fact
                              acc.usd_monitoreo_fact += d.usd_monitoreo_fact
                              acc.qty_monitoreo_cortesia += d.qty_monitoreo_cortesia
                              acc.eur_monitoreo_cortesia += d.eur_monitoreo_cortesia
                              acc.usd_monitoreo_cortesia += d.usd_monitoreo_cortesia
                              acc.qty_72h += d.qty_72h
                              acc.eur_72h += d.eur_72h
                              acc.usd_72h += d.usd_72h
                              acc.total_qty += d.total_qty
                              acc.total_eur += d.total_eur
                              acc.total_usd += d.total_usd
                              return acc
                            }, {
                              qty_normal: 0,
                              eur_normal: 0,
                              usd_normal: 0,
                              qty_urgente: 0,
                              eur_urgente: 0,
                              usd_urgente: 0,
                              qty_monitoreo_fact: 0,
                              eur_monitoreo_fact: 0,
                              usd_monitoreo_fact: 0,
                              qty_monitoreo_cortesia: 0,
                              eur_monitoreo_cortesia: 0,
                              usd_monitoreo_cortesia: 0,
                              qty_72h: 0,
                              eur_72h: 0,
                              usd_72h: 0,
                              total_qty: 0,
                              total_eur: 0,
                              total_usd: 0,
                            })

                            const symbol = monedaResumen === 'USD' ? '$' : '€'
                            const totalNormal = monedaResumen === 'USD' ? detalleClienteTotals.usd_normal : detalleClienteTotals.eur_normal
                            const totalUrgente = monedaResumen === 'USD' ? detalleClienteTotals.usd_urgente : detalleClienteTotals.eur_urgente
                            const totalMonFact = monedaResumen === 'USD' ? detalleClienteTotals.usd_monitoreo_fact : detalleClienteTotals.eur_monitoreo_fact
                            const totalMonCortesia = monedaResumen === 'USD' ? detalleClienteTotals.usd_monitoreo_cortesia : detalleClienteTotals.eur_monitoreo_cortesia
                            const total72h = monedaResumen === 'USD' ? detalleClienteTotals.usd_72h : detalleClienteTotals.eur_72h
                            const totalFinal = monedaResumen === 'USD' ? detalleClienteTotals.total_usd : detalleClienteTotals.total_eur

                            return (
                          <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                  <th className="px-2 py-2 text-left font-semibold">País</th>
                                  <th className="px-2 py-2 text-center font-semibold">Normal</th>
                                  <th className="px-2 py-2 text-center font-semibold">Urgente</th>
                                  <th className="px-2 py-2 text-center font-semibold">Monit. fact.</th>
                                  <th className="px-2 py-2 text-center font-semibold">Monit. €0</th>
                                  <th className="px-2 py-2 text-center font-semibold">72h</th>
                                  <th className="px-2 py-2 text-center font-semibold">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {detalleClienteRows.map((d, j) => {
                                  const montoNormal = monedaResumen === 'USD' ? d.usd_normal : d.eur_normal
                                  const montoUrgente = monedaResumen === 'USD' ? d.usd_urgente : d.eur_urgente
                                  const montoMonFact = monedaResumen === 'USD' ? d.usd_monitoreo_fact : d.eur_monitoreo_fact
                                  const montoMonCortesia = monedaResumen === 'USD' ? d.usd_monitoreo_cortesia : d.eur_monitoreo_cortesia
                                  const monto72h = monedaResumen === 'USD' ? d.usd_72h : d.eur_72h
                                  const montoTotal = monedaResumen === 'USD' ? d.total_usd : d.total_eur
                                  const symbol = monedaResumen === 'USD' ? '$' : '€'

                                  return (
                                    <tr key={`${d.pais_codigo}-${j}`} className="hover:bg-gray-50">
                                      <td className="px-2 py-2">
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{d.pais_codigo}</span>
                                          <span>{d.pais_nombre}</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <div className="font-medium">{d.qty_normal}</div>
                                        <div className="text-gray-500">{symbol}{montoNormal.toFixed(2)}</div>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <div className="font-medium">{d.qty_urgente}</div>
                                        <div className="text-gray-500">{symbol}{montoUrgente.toFixed(2)}</div>
                                      </td>
                                      <td className="px-2 py-2 text-center bg-violet-50/50">
                                        <div className="font-medium text-violet-700">{d.qty_monitoreo_fact}</div>
                                        <div className="text-violet-600">{symbol}{montoMonFact.toFixed(2)}</div>
                                      </td>
                                      <td className="px-2 py-2 text-center bg-amber-50/50">
                                        <div className="font-medium text-amber-700">{d.qty_monitoreo_cortesia}</div>
                                        <div className="text-amber-600">{symbol}{montoMonCortesia.toFixed(2)}</div>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <div className="font-medium">{d.qty_72h}</div>
                                        <div className="text-gray-500">{symbol}{monto72h.toFixed(2)}</div>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <div className="font-semibold">{d.total_qty}</div>
                                        <div className="font-semibold text-emerald-700">{symbol}{montoTotal.toFixed(2)}</div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              <tfoot className="bg-emerald-50 border-t border-emerald-200">
                                <tr>
                                  <td className="px-2 py-2 font-bold text-gray-900">TOTAL</td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="font-bold">{detalleClienteTotals.qty_normal}</div>
                                    <div className="font-bold text-gray-700">{symbol}{totalNormal.toFixed(2)}</div>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="font-bold">{detalleClienteTotals.qty_urgente}</div>
                                    <div className="font-bold text-gray-700">{symbol}{totalUrgente.toFixed(2)}</div>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="font-bold text-violet-700">{detalleClienteTotals.qty_monitoreo_fact}</div>
                                    <div className="font-bold text-violet-700">{symbol}{totalMonFact.toFixed(2)}</div>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="font-bold text-amber-700">{detalleClienteTotals.qty_monitoreo_cortesia}</div>
                                    <div className="font-bold text-amber-700">{symbol}{totalMonCortesia.toFixed(2)}</div>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="font-bold">{detalleClienteTotals.qty_72h}</div>
                                    <div className="font-bold text-gray-700">{symbol}{total72h.toFixed(2)}</div>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="font-bold text-gray-900">{detalleClienteTotals.total_qty}</div>
                                    <div className="font-bold text-emerald-700">{symbol}{totalFinal.toFixed(2)}</div>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                            )
                          })()}
                        </td>
                      </tr>
                    )}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50 font-medium">
                  <tr className="border-t-2 border-emerald-200">
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-900">SUBTOTALES:</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {resumenCalculado.reduce((sum, r) => sum + r.qty_normal, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {resumenCalculado.reduce((sum, r) => sum + r.qty_urgente, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {resumenCalculado.reduce((sum, r) => sum + r.qty_monitoreo, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {resumenCalculado.reduce((sum, r) => sum + r.qty_72h, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-900">
                      {resumenCalculado.reduce((sum, r) => sum + r.total_informes, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700 text-lg">
                      {monedaResumen === 'USD' ? '$' : '€'}{totalGeneralMonto.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detalle por Cliente */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col gap-3 mb-3">
          <div className="hidden md:flex sm:justify-between sm:items-center gap-3">
            <h4 className="font-medium text-gray-900">Detalle de Solicitudes</h4>
            {selectedIds.length > 0 && (
              <button
                onClick={handleMarcarFacturado}
                className="btn-primary text-sm inline-flex items-center justify-center gap-1 w-full sm:w-auto"
              >
                <Receipt className="h-4 w-4" />
                Facturar ({selectedIds.length})
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileDetalle(prev => !prev)}
            className="md:hidden w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0 flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-full bg-blue-100 p-2 text-blue-700">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
              <h4 className="font-medium text-gray-900">Detalle de Solicitudes</h4>
              <p className="text-xs text-gray-500 mt-1">
                {Object.keys(solicitudesPorCliente).length} cliente(s)
              </p>
            </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedIds.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  {selectedIds.length} sel.
                </span>
              )}
              {showMobileDetalle ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            </div>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleMarcarFacturado}
              className={`${showMobileDetalle ? 'inline-flex' : 'hidden'} md:hidden btn-primary text-sm items-center justify-center gap-1 w-full`}
            >
              <Receipt className="h-4 w-4" />
              Facturar ({selectedIds.length})
            </button>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-gray-500">Ordenar por:</span>
              <select
                value={rowOrderBy}
                onChange={(e) => applySortField(e.target.value)}
                className="px-2 py-1 text-xs border rounded bg-white"
              >
                {ROW_ORDER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setRowOrderDir(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 w-fit"
              title="Cambiar dirección del orden"
            >
              {rowOrderDir === 'asc' ? 'Ascendente ↑' : 'Descendente ↓'}
            </button>
            <span className="text-xs text-gray-500">
              Orden actual: {ROW_ORDER_OPTIONS.find(o => o.value === rowOrderBy)?.label || rowOrderBy} {rowOrderDir === 'asc' ? '↑' : '↓'}
            </span>
          </div>
        </div>

        <div className={`${showMobileDetalle ? 'block' : 'hidden'} md:block`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : Object.keys(solicitudesPorCliente).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay solicitudes completadas para el período seleccionado
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(solicitudesPorCliente).map(([abono, grupo]) => {
              const isExpanded = expandedCliente === abono
              
              // Verificar si el cliente tiene precios en USD (al menos una solicitud con precio_usd > 0)
              const monedaCliente = monedaPorCliente[abono] || 'EUR'
              const simboloMoneda = monedaCliente === 'USD' ? '$' : '€'
              const sortedSolicitudes = [...grupo.solicitudes].sort((a, b) => compareRows(a, b, monedaCliente))
              
              // Calcular total usando la moneda seleccionada
              const totalGrupo = sortedSolicitudes.reduce((sum, s) => {
                const precio = getPrecioByMoneda(s, monedaCliente)
                return sum + precio
              }, 0)
              
              // Calcular estado del grupo
              const solsPendientes = sortedSolicitudes.filter(s => isFacturable(s))
              const solsFacturadas = sortedSolicitudes.filter(s => !isFacturable(s))
              const todasFacturadas = solsFacturadas.length === sortedSolicitudes.length
              const todasPendientes = solsPendientes.length === sortedSolicitudes.length
              
              // Determinar el estado de pago real (de las solicitudes facturadas)
              // Priorizar el estado más relevante: pagada > cancelada > facturada > pendiente
              const getEstadoPagoGrupo = () => {
                if (todasPendientes) return null // Sin facturar
                const estadosSols = solsFacturadas.map(s => s.factura_estado_pago || 'facturada')
                if (estadosSols.includes('pagada')) return 'pagada'
                if (estadosSols.includes('cancelada')) return 'cancelada'
                if (estadosSols.includes('pendiente')) return 'pendiente'
                if (estadosSols.includes('facturada')) return 'facturada'
                return 'facturada' // default si tiene factura
              }
              const estadoPagoGrupo = getEstadoPagoGrupo()
              const estadoPagoConfig = estadoPagoGrupo ? ESTADO_PAGO_CONFIG[estadoPagoGrupo] : null
              
              // Solo se pueden seleccionar las pendientes
              const idsPendientes = solsPendientes.map(s => s.id)
              const allPendientesSelected = idsPendientes.length > 0 && idsPendientes.every(id => selectedIds.includes(id))

              return (
                <div key={abono} className="border rounded-lg overflow-hidden">
                  {/* Header del grupo */}
                  <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedCliente(isExpanded ? null : abono)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Checkbox solo si hay pendientes */}
                      {solsPendientes.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(abono) }} className="shrink-0 mt-0.5">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            allPendientesSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {allPendientesSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      ) : (
                        <div className="w-5 h-5 shrink-0" /> 
                      )}
                      <div className="pt-0.5 shrink-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                          <span className="font-mono font-medium text-blue-600 text-sm break-all">{abono}</span>
                          <span className="font-medium text-gray-900 break-words">{grupo.usuario_nombre}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                            {grupo.proveedor_codigo}
                          </span>
                          {todasFacturadas && estadoPagoConfig ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${estadoPagoConfig.color}`}>
                              <estadoPagoConfig.icon className="h-3 w-3" />
                              {estadoPagoConfig.label}
                            </span>
                          ) : todasPendientes ? (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              ○ Pendiente
                            </span>
                          ) : estadoPagoConfig ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${estadoPagoConfig.color}`}>
                              <estadoPagoConfig.icon className="h-3 w-3" />
                              {solsFacturadas.length} {estadoPagoConfig.label} / {solsPendientes.length} Pend.
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {solsFacturadas.length} Fact. / {solsPendientes.length} Pend.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 sm:justify-end">
                      <span className="text-sm text-gray-500">{sortedSolicitudes.length} informes</span>
                      <select
                        value={monedaCliente}
                        onChange={(e) => {
                          e.stopPropagation()
                          setMonedaPorCliente(prev => ({ ...prev, [abono]: e.target.value }))
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        <option value="EUR">€ EUR</option>
                        <option value="USD">$ USD</option>
                      </select>
                      <span className="font-medium text-emerald-600">{simboloMoneda}{totalGrupo.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Detalle de solicitudes */}
                  {isExpanded && (
                    <div>
                      <div className="md:hidden divide-y divide-gray-100 bg-white">
                        {sortedSolicitudes.map(sol => (
                          (() => {
                            const monitoreoStatusBadge = getMonitoreoStatusBadge(sol)
                            return (
                          <div key={sol.id} className={`p-4 space-y-3 ${!isFacturable(sol) ? 'bg-green-50' : ''} ${selectedIds.includes(sol.id) ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                {isFacturable(sol) ? (
                                  <button
                                    onClick={() => {
                                      if (selectedIds.includes(sol.id)) {
                                        setSelectedIds(prev => prev.filter(id => id !== sol.id))
                                      } else {
                                        const otroCliente = selectedIds.length > 0 && 
                                          data.solicitudes.find(s => selectedIds.includes(s.id))?.usuario_abono !== sol.usuario_abono

                                        if (otroCliente) {
                                          setSelectedIds([sol.id])
                                        } else {
                                          setSelectedIds(prev => [...prev, sol.id])
                                        }
                                      }
                                    }}
                                    className="shrink-0 mt-0.5"
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                      selectedIds.includes(sol.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                    }`}>
                                      {selectedIds.includes(sol.id) && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-4 h-4 shrink-0 mt-0.5" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 break-words">{sol.razon_social}</p>
                                  {sol.solicitante_nombre && (
                                    <p className="text-[10px] text-indigo-500">→ {sol.solicitante_nombre}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="font-mono text-xs text-gray-500 break-all">{sol.cuit}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      sol.pais_codigo === 'AR' ? 'bg-sky-100 text-sky-700' :
                                      sol.pais_codigo === 'CL' ? 'bg-red-100 text-red-700' :
                                      sol.pais_codigo === 'BR' ? 'bg-green-100 text-green-700' :
                                      sol.pais_codigo === 'UY' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`} title={sol.pais_nombre}>
                                      {sol.pais_codigo || '??'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="font-semibold text-emerald-600">
                                  {simboloMoneda}{getPrecioByMoneda(sol, monedaCliente).toFixed(2)}
                                </span>
                                {isAdmin && isFacturable(sol) && (
                                  <button
                                    onClick={() => { setEditingPrecio(sol.id); setEditPrecioValue(getPrecioEur(sol).toString()) }}
                                    className="text-gray-300 hover:text-blue-500 transition-colors"
                                    title="Editar precio"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex items-center gap-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  sol.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                                  sol.prioridad === 'monitoreo' ? 'bg-violet-100 text-violet-700' :
                                  sol.prioridad === '72h' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {sol.prioridad === 'urgente' ? 'Urgente' : sol.prioridad === 'monitoreo' ? 'Monitoreo' : sol.prioridad === '72h' ? '72h' : 'Normal'}
                                </span>
                                {monitoreoStatusBadge && (
                                  <button
                                    type="button"
                                    onClick={() => openMonitoreoHistorialModal(sol)}
                                    className={`px-2 py-0.5 rounded text-xs border hover:opacity-90 ${monitoreoStatusBadge.className}`}
                                    title={monitoreoStatusBadge.title || 'Ver árbol/historial del monitoreo asociado'}
                                  >
                                    {monitoreoStatusBadge.label}
                                  </button>
                                )}
                              </div>
                              {!isFacturable(sol) ? (
                                (() => {
                                  const estadoSol = sol.factura_estado_pago || 'facturada'
                                  const cfg = ESTADO_PAGO_CONFIG[estadoSol] || ESTADO_PAGO_CONFIG.facturada
                                  return (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${cfg.color}`}>
                                      <cfg.icon className="h-3 w-3" />
                                      {cfg.label}
                                    </span>
                                  )
                                })()
                              ) : (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                  ○ Pendiente
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs text-gray-500 pt-2 border-t">
                              <span>Actualizada</span>
                              <span>{sol.fecha_completado || sol.updated_at}</span>
                            </div>
                          </div>
                            )
                          })()
                        ))}
                      </div>

                      <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="w-10 px-3 py-2"></th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">
                              <button type="button" onClick={() => toggleSort('empresa')} className="w-full inline-flex items-center justify-start gap-1 hover:text-gray-900 cursor-pointer">
                                <span>Empresa</span>
                                <span className={`text-xs ${rowOrderBy === 'empresa' ? 'text-gray-900' : 'text-gray-400'}`}>{getSortIndicator('empresa')}</span>
                              </button>
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">
                              <button type="button" onClick={() => toggleSort('id_pais')} className="w-full inline-flex items-center justify-start gap-1 hover:text-gray-900 cursor-pointer">
                                <span>ID / País</span>
                                <span className={`text-xs ${rowOrderBy === 'id_pais' ? 'text-gray-900' : 'text-gray-400'}`}>{getSortIndicator('id_pais')}</span>
                              </button>
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">
                              <button type="button" onClick={() => toggleSort('prioridad')} className="w-full inline-flex items-center justify-center gap-1 hover:text-gray-900 cursor-pointer">
                                <span>Prioridad</span>
                                <span className={`text-xs ${rowOrderBy === 'prioridad' ? 'text-gray-900' : 'text-gray-400'}`}>{getSortIndicator('prioridad')}</span>
                              </button>
                            </th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600">
                              <button type="button" onClick={() => toggleSort('precio')} className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer">
                                <span>Precio</span>
                                <span className={`text-xs ${rowOrderBy === 'precio' ? 'text-gray-900' : 'text-gray-400'}`}>{getSortIndicator('precio')}</span>
                              </button>
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">
                              <button type="button" onClick={() => toggleSort('fecha')} className="w-full inline-flex items-center justify-center gap-1 hover:text-gray-900 cursor-pointer">
                                <span>Fecha</span>
                                <span className={`text-xs ${rowOrderBy === 'fecha' ? 'text-gray-900' : 'text-gray-400'}`}>{getSortIndicator('fecha')}</span>
                              </button>
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">
                              <button type="button" onClick={() => toggleSort('estado')} className="w-full inline-flex items-center justify-center gap-1 hover:text-gray-900 cursor-pointer">
                                <span>Estado</span>
                                <span className={`text-xs ${rowOrderBy === 'estado' ? 'text-gray-900' : 'text-gray-400'}`}>{getSortIndicator('estado')}</span>
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {sortedSolicitudes.map(sol => (
                            (() => {
                              const monitoreoStatusBadge = getMonitoreoStatusBadge(sol)
                              return (
                            <tr key={sol.id} className={`hover:bg-gray-50 ${!isFacturable(sol) ? 'bg-green-50' : ''} ${selectedIds.includes(sol.id) ? 'bg-blue-50' : ''}`}>
                              <td className="px-3 py-2">
                                {isFacturable(sol) ? (
                                  <button onClick={() => {
                                    // Toggle selección individual
                                    if (selectedIds.includes(sol.id)) {
                                      // Deseleccionar esta solicitud
                                      setSelectedIds(prev => prev.filter(id => id !== sol.id))
                                    } else {
                                      // Verificar si ya hay seleccionados de otro cliente
                                      const otroCliente = selectedIds.length > 0 && 
                                        data.solicitudes.find(s => selectedIds.includes(s.id))?.usuario_abono !== sol.usuario_abono
                                      
                                      if (otroCliente) {
                                        // Limpiar y seleccionar solo este (nuevo cliente)
                                        setSelectedIds([sol.id])
                                      } else {
                                        // Agregar a la selección actual
                                        setSelectedIds(prev => [...prev, sol.id])
                                      }
                                    }
                                  }}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                      selectedIds.includes(sol.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                    }`}>
                                      {selectedIds.includes(sol.id) && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-4 h-4" />
                                )}
                              </td>
                              <td className="px-3 py-2 max-w-[200px]" title={sol.razon_social}>
                                <div className="truncate">{sol.razon_social}</div>
                                {sol.solicitante_nombre && (
                                  <div className="text-[10px] text-indigo-500 truncate" title={`Solicitado por: ${sol.solicitante_nombre}`}>
                                    → {sol.solicitante_nombre}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs">{sol.cuit}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    sol.pais_codigo === 'AR' ? 'bg-sky-100 text-sky-700' :
                                    sol.pais_codigo === 'CL' ? 'bg-red-100 text-red-700' :
                                    sol.pais_codigo === 'BR' ? 'bg-green-100 text-green-700' :
                                    sol.pais_codigo === 'UY' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`} title={sol.pais_nombre}>
                                    {sol.pais_codigo || '??'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    sol.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                                    sol.prioridad === 'monitoreo' ? 'bg-violet-100 text-violet-700' :
                                    sol.prioridad === '72h' ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {sol.prioridad === 'urgente' ? 'Urgente' : sol.prioridad === 'monitoreo' ? 'Monitoreo' : sol.prioridad === '72h' ? '72h' : 'Normal'}
                                  </span>
                                  {monitoreoStatusBadge && (
                                    <button
                                      type="button"
                                      onClick={() => openMonitoreoHistorialModal(sol)}
                                      className={`px-2 py-0.5 rounded text-[11px] border hover:opacity-90 ${monitoreoStatusBadge.className}`}
                                      title={monitoreoStatusBadge.title || 'Ver árbol/historial del monitoreo asociado'}
                                    >
                                      {monitoreoStatusBadge.label}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {editingPrecio === sol.id ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-gray-400">€</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editPrecioValue}
                                      onChange={e => setEditPrecioValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleSavePrecio(sol.id); if (e.key === 'Escape') setEditingPrecio(null) }}
                                      className="w-20 px-1 py-0.5 text-right text-sm border rounded focus:ring-1 focus:ring-blue-400"
                                      autoFocus
                                      disabled={savingPrecio}
                                    />
                                    <button onClick={() => handleSavePrecio(sol.id)} disabled={savingPrecio} className="text-green-600 hover:text-green-800" title="Guardar">
                                      {savingPrecio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </button>
                                    <button onClick={() => setEditingPrecio(null)} className="text-gray-400 hover:text-gray-600" title="Cancelar">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    {simboloMoneda}{getPrecioByMoneda(sol, monedaCliente).toFixed(2)}
                                    {isAdmin && isFacturable(sol) && (
                                      <button
                                        onClick={() => { setEditingPrecio(sol.id); setEditPrecioValue(getPrecioEur(sol).toString()) }}
                                        className="text-gray-300 hover:text-blue-500 transition-colors"
                                        title="Editar precio"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center text-xs text-gray-500">{sol.fecha_completado || sol.updated_at}</td>
                              <td className="px-3 py-2 text-center">
                                {!isFacturable(sol) ? (
                                  (() => {
                                    const estadoSol = sol.factura_estado_pago || 'facturada'
                                    const cfg = ESTADO_PAGO_CONFIG[estadoSol] || ESTADO_PAGO_CONFIG.facturada
                                    return (
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${cfg.color}`}>
                                        <cfg.icon className="h-3 w-3" />
                                        {cfg.label}
                                      </span>
                                    )
                                  })()
                                ) : (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                    ○ Pendiente
                                  </span>
                                )}
                              </td>
                            </tr>
                              )
                            })()
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>
      </>
      )}

      {/* TAB: Historial de Facturas */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600" />
              Historial de Facturas Generadas
            </h4>
            <button
              onClick={loadHistorial}
              disabled={loadingHistorial}
              className="btn-secondary text-sm inline-flex items-center justify-center gap-1 w-full sm:w-auto"
            >
              {loadingHistorial ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>

          {/* Stats de estados */}
          {Object.keys(historialStats).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {Object.entries(ESTADO_PAGO_CONFIG).map(([key, cfg]) => {
                const stat = historialStats[key] || { cantidad: 0, total: 0 }
                const totals = normalizeTotalsByRate(stat, eurUsdRate)
                return (
                  <div key={key} className={`${cfg.color} rounded-lg p-3`}>
                    <div className="flex items-center gap-2">
                      <cfg.icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{stat.cantidad || 0}</p>
                    <p className="text-xs opacity-75">€{totals.eur.toFixed(2)} | ${totals.usd.toFixed(2)}</p>
                  </div>
                )
              })}
            </div>
          )}

          {loadingHistorial ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay facturas generadas para este período</p>
            </div>
          ) : (
            <div>
              <div className="md:hidden space-y-3">
                {historial.map(f => {
                  const estadoKey = f.estado_pago || 'pendiente'
                  const estadoCfg = ESTADO_PAGO_CONFIG[estadoKey] || ESTADO_PAGO_CONFIG.pendiente
                  return (
                    <div key={f.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono font-medium text-blue-600 break-all">{f.numero_factura}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              f.tipo_documento === 'Remito' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {f.tipo_documento}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {new Date(f.created_at).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                        </div>
                        <span className="font-semibold text-emerald-600 shrink-0">
                          €{parseFloat(f.total_eur || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Cliente</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{f.usuario_abono}</span>
                            {f.usuario_nombre && <span className="text-gray-700 break-words">{f.usuario_nombre}</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cantidad</p>
                          <p className="font-medium">{f.cantidad_solicitudes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Estado</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${estadoCfg.color}`}>
                            <estadoCfg.icon className="h-3 w-3" />
                            {estadoCfg.label}
                          </span>
                        </div>
                      </div>

                      {f.tiene_pdf ? (
                        <button
                          onClick={() => descargarPdfHistorial(f.id, f.numero_factura, f.usuario_abono)}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                        >
                          <Download className="h-4 w-4" />
                          Descargar PDF
                        </button>
                      ) : (
                        <div className="text-sm text-gray-400 text-center py-2 bg-gray-50 rounded-lg">Sin PDF disponible</div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">N° Factura/Remito</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Cliente</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Total EUR</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Estado</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historial.map(f => {
                    const estadoKey = f.estado_pago || 'pendiente'
                    const estadoCfg = ESTADO_PAGO_CONFIG[estadoKey] || ESTADO_PAGO_CONFIG.pendiente
                    return (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="h-3 w-3" />
                            {new Date(f.created_at).toLocaleDateString('es-AR')}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono font-medium text-blue-600">{f.numero_factura}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                            f.tipo_documento === 'Remito' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {f.tipo_documento}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{f.usuario_abono}</span>
                          {f.usuario_nombre && <span className="text-gray-500 ml-1 text-xs">- {f.usuario_nombre}</span>}
                        </td>
                        <td className="px-3 py-2 text-center">{f.cantidad_solicitudes}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          €{parseFloat(f.total_eur || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoCfg.color}`}>
                            <estadoCfg.icon className="h-3 w-3" />
                            {estadoCfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {f.tiene_pdf ? (
                            <button
                              onClick={() => descargarPdfHistorial(f.id, f.numero_factura, f.usuario_abono)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Descargar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showMonitoreoHistorialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Árbol de Monitoreo Asociado</h3>
                <p className="text-sm text-gray-500">Solicitud padre + historial de todas las asociadas</p>
              </div>
              <button
                onClick={() => {
                  setShowMonitoreoHistorialModal(false)
                  setMonitoreoHistorialData(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {loadingMonitoreoHistorial ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : !monitoreoHistorialData?.success ? (
                <div className="text-center py-8 text-red-600">No se pudo cargar el historial asociado.</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-indigo-700 font-semibold uppercase tracking-wide">Prepago</p>
                      <p className="text-indigo-900 font-medium">#{monitoreoHistorialData.prepago?.id}</p>
                    </div>
                    <div>
                      <p className="text-indigo-700 font-semibold uppercase tracking-wide">Cliente</p>
                      <p className="text-indigo-900 font-medium truncate">{monitoreoHistorialData.prepago?.cliente_nombre || '-'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-700 font-semibold uppercase tracking-wide">Uso</p>
                      <p className="text-indigo-900 font-medium">{monitoreoHistorialData.resumen?.usados || 0}/{monitoreoHistorialData.resumen?.total_cupo || 0}</p>
                    </div>
                    <div>
                      <p className="text-indigo-700 font-semibold uppercase tracking-wide">Disponibles</p>
                      <p className="text-indigo-900 font-medium">{monitoreoHistorialData.resumen?.disponibles || 0}</p>
                    </div>
                  </div>

                  {monitoreoHistorialData.parent && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Solicitud Padre (raíz)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-500">ID:</span> <span className="font-medium">#{monitoreoHistorialData.parent.id}</span></p>
                        <p><span className="text-gray-500">Uso:</span> <span className="font-medium">{monitoreoHistorialData.parent.uso_numero}/{monitoreoHistorialData.prepago?.total_cupo || '?'}</span></p>
                        <p className="sm:col-span-2"><span className="text-gray-500">Empresa:</span> <span className="font-medium">{monitoreoHistorialData.parent.razon_social || '-'}</span></p>
                        <p><span className="text-gray-500">Identificador:</span> <span className="font-medium">{monitoreoHistorialData.parent.cuit || '-'}</span></p>
                        <p><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDateTime(monitoreoHistorialData.parent.created_at)}</span></p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Árbol / Historial de Asociadas</p>
                    {(monitoreoHistorialData.asociadas || []).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No hay solicitudes asociadas.</p>
                    ) : (
                      <div className="relative pl-6 space-y-3">
                        <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-200" />
                        {(monitoreoHistorialData.asociadas || []).map((nodo) => {
                          const isParent = monitoreoHistorialData.parent?.id === nodo.id
                          return (
                            <div key={nodo.id} className="relative">
                              <div className={`absolute -left-5 top-4 h-3 w-3 rounded-full border-2 ${isParent ? 'bg-emerald-500 border-emerald-100' : 'bg-white border-gray-300'}`} />
                              <div className={`border rounded-xl p-3 ${isParent ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-900">#{nodo.id} · {nodo.razon_social || 'Sin razón social'}</p>
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${Number(nodo.precio_eur || 0) === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                    {Number(nodo.precio_eur || 0) === 0 ? 'Ya pagado' : 'Validado'} {nodo.uso_numero || '?'}/{monitoreoHistorialData.prepago?.total_cupo || '?'}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                                  <p><span className="text-gray-500">Identificador:</span> {nodo.cuit || '-'}</p>
                                  <p><span className="text-gray-500">Estado:</span> {nodo.estado || '-'}</p>
                                  <p><span className="text-gray-500">Fecha:</span> {formatDateTime(nodo.created_at)}</p>
                                  <p className="sm:col-span-2"><span className="text-gray-500">Solicitado por:</span> {nodo.solicitante_nombre || '-'}</p>
                                  <p><span className="text-gray-500">Precio EUR:</span> {Number(nodo.precio_eur || 0).toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => {
                  setShowMonitoreoHistorialModal(false)
                  setMonitoreoHistorialData(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturación */}
      {showModal && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Generar Factura
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {modalData.cantidad} solicitud(es) seleccionada(s)
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Info del cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Cliente:</span>
                    <p className="font-medium">{modalData.usuario_nombre}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Abonado:</span>
                    <p className="font-mono font-medium text-blue-600">{modalData.usuario_abono}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Proveedor:</span>
                    <p className="font-medium">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                        {modalData.proveedor_codigo}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total {modalData.moneda || 'EUR'}:</span>
                    <p className="font-bold text-emerald-600 text-lg">
                      {modalData.moneda === 'USD' ? '$' : '€'}{modalData.total_eur.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Número de factura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modalData.proveedor_codigo === 'CESCE' ? 'Número de Remito' : 'Número de Invoice'} *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Ej: 6850"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Invoice
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Si no se modifica, se usa la fecha de hoy.</p>
              </div>

              {/* PO Number (solo para Ducroire) */}
              {modalData.proveedor_codigo === 'DUCROIRE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                    placeholder="Ej: PO10853"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Paso 1: Generar PDF */}
              <div className={`p-4 rounded-lg border-2 ${pdfGenerated ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      pdfGenerated ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {pdfGenerated ? <CheckCircle className="h-5 w-5" /> : '1'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Generar PDF</p>
                      <p className="text-xs text-gray-500">Descarga el documento para enviar al proveedor</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerarPdf}
                    disabled={generatingPdf || !invoiceNumber}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                      pdfGenerated 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300'
                    }`}
                  >
                    {generatingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    {pdfGenerated ? 'Descargar de nuevo' : 'Generar PDF'}
                  </button>
                </div>
              </div>

              {/* Paso 2: Marcar como facturado */}
              <div className={`p-4 rounded-lg border-2 ${!pdfGenerated ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      pdfGenerated ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      2
                    </div>
                    <div>
                      <p className={`font-medium ${pdfGenerated ? 'text-gray-900' : 'text-gray-400'}`}>
                        Marcar como Facturado
                      </p>
                      <p className="text-xs text-gray-500">Confirma que la factura fue enviada</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfirmFacturadoModal(true)}
                    disabled={!pdfGenerated || marking}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300"
                  >
                    {marking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Confirmar Facturado
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Facturado */}
      {showConfirmFacturadoModal && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-emerald-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Confirmar Facturación</h3>
                  <p className="text-sm text-gray-500">Las solicitudes pasarán a estado facturado</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmFacturadoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Cliente:</span>
                  <span className="font-medium text-gray-900 text-sm">{modalData.usuario_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Abono:</span>
                  <span className="font-mono text-sm text-gray-900">{modalData.usuario_abono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">N° Factura/Remito:</span>
                  <span className="font-mono text-blue-600">{invoiceNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Solicitudes:</span>
                  <span className="font-bold text-gray-900">{modalData.solicitud_ids?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Total:</span>
                  <span className="font-bold text-emerald-600">
                    {modalData.moneda === 'USD' ? '$' : '€'}{modalData.total_eur?.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-blue-600 text-xl">ℹ️</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">¿Confirmar facturación?</p>
                    <p>Las solicitudes pasarán a estado <strong>Facturado</strong> y quedarán registradas en el <strong>Historial</strong>. 
                    Podrás descargar el PDF desde el historial en cualquier momento.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => setShowConfirmFacturadoModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarFacturado}
                disabled={marking}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-300"
              >
                {marking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revertir a Pendiente */}
      {showRevertModal && revertData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-orange-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-xl">↩</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Revertir a Pendiente</h3>
                  <p className="text-sm text-gray-500">Esta acción quitará el estado de facturado</p>
                </div>
              </div>
              <button onClick={() => setShowRevertModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {/* Mostrar info del grupo o de la solicitud individual */}
                {revertData.count ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Cliente:</span>
                      <span className="font-medium text-gray-900 text-sm">{revertData.usuario_nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Abono:</span>
                      <span className="font-mono text-sm text-blue-600">{revertData.usuario_abono}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Solicitudes a revertir:</span>
                      <span className="font-bold text-orange-600">{revertData.count}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Empresa:</span>
                      <span className="font-medium text-gray-900 text-sm text-right max-w-[200px] truncate" title={revertData.razon_social}>
                        {revertData.razon_social}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">CUIT:</span>
                      <span className="font-mono text-sm text-gray-900">{revertData.cuit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Precio:</span>
                      <span className="font-bold text-emerald-600">€{revertData.precio_calculado?.toFixed(2)}</span>
                    </div>
                    {revertData.factura_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">N° Factura:</span>
                        <span className="font-mono text-blue-600">{revertData.factura_id}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-amber-600 text-xl">⚠️</span>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">¿Estás seguro?</p>
                    <p>{revertData.count ? `${revertData.count} solicitudes volverán` : 'Esta solicitud volverá'} a estado <strong>Pendiente</strong> y se quitará el número de factura asociado. 
                    Podrás volver a facturarlas después.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => setShowRevertModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRevertir}
                disabled={reverting}
                className="flex-1 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-300"
              >
                {reverting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>↩</span>
                )}
                Confirmar Revertir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
