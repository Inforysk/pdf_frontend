import { useState, useEffect } from 'react'
import { 
  FileText, Download, Filter, RefreshCw, Loader2, Calendar, Users, 
  Building2, ChevronDown, ChevronRight, Check, Euro, Receipt, FileSpreadsheet,
  X, Printer, CheckCircle, History, Clock, DollarSign, AlertCircle, MoreVertical
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

export default function AdminFacturacionSolicitudesView() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ solicitudes: [], resumen: [], total_general_eur: 0 })
  const [usuarios, setUsuarios] = useState([])
  const [expandedCliente, setExpandedCliente] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [exporting, setExporting] = useState(false)
  
  // Tab activa: 'solicitudes' o 'historial'
  const [activeTab, setActiveTab] = useState('solicitudes')
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  
  // Modal de facturación
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)
  const [marking, setMarking] = useState(false)

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

      const res = await axios.get(`/api/admin/facturacion-solicitudes?${params}`)
      if (res.data.success) {
        setData(res.data)
        setSelectedIds([])
      }
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
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

      const res = await axios.get(`/api/admin/facturas-proveedores/historial?${params}`)
      if (res.data.success) {
        setHistorial(res.data.facturas)
        setHistorialStats(res.data.stats || {})
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
    
    // Verificar que todas las seleccionadas sean del mismo cliente/proveedor
    const mismoCliente = data.solicitudes
      .filter(s => selectedIds.includes(s.id))
      .every(s => s.usuario_abono === primeraSol.usuario_abono)
    
    if (!mismoCliente) {
      toast.error('Selecciona solicitudes de un solo cliente para generar la factura')
      return
    }
    
    // Calcular total
    const totalEur = data.solicitudes
      .filter(s => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + (s.precio_calculado || 0), 0)
    
    setModalData({
      usuario_abono: primeraSol.usuario_abono,
      usuario_nombre: primeraSol.usuario_nombre,
      proveedor_codigo: primeraSol.proveedor_codigo,
      proveedor_nombre: primeraSol.proveedor_nombre,
      cantidad: selectedIds.length,
      total_eur: totalEur,
      solicitud_ids: selectedIds
    })
    setInvoiceNumber('')
    setPoNumber('')
    setPdfGenerated(false)
    setShowModal(true)
  }

  const handleGenerarPdf = async () => {
    if (!invoiceNumber) {
      toast.error('Ingresa el número de factura/remito')
      return
    }
    
    setGeneratingPdf(true)
    try {
      const res = await axios.post('/api/admin/facturacion-solicitudes/generar-pdf', {
        usuario_abono: modalData.usuario_abono,
        proveedor_codigo: modalData.proveedor_codigo,
        solicitud_ids: modalData.solicitud_ids,
        invoice_number: invoiceNumber,
        po_number: poNumber,
        mes: filtros.mes,
        anio: filtros.anio
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
      // Primero generar y guardar el PDF en el historial
      await axios.post('/api/admin/facturacion-solicitudes/generar-pdf', {
        usuario_abono: modalData.usuario_abono,
        proveedor_codigo: modalData.proveedor_codigo,
        solicitud_ids: modalData.solicitud_ids,
        invoice_number: invoiceNumber,
        po_number: poNumber,
        mes: filtros.mes,
        anio: filtros.anio,
        save_to_history: true
      }, { responseType: 'blob' })

      // Luego marcar como facturadas
      const res = await axios.post('/api/admin/facturacion-solicitudes/marcar', {
        ids: modalData.solicitud_ids,
        facturado: true,
        factura_id: invoiceNumber
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
    // Solo seleccionar solicitudes PENDIENTES (no facturadas)
    const solsPendientes = data.solicitudes.filter(s => s.usuario_abono === clienteAbono && !s.facturado)
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Facturación de Solicitudes
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Solicitudes completadas de clientes con proveedor fijo asignado
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || loading}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting || loading}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b">
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'solicitudes'
                ? 'bg-emerald-100 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Receipt className="h-4 w-4 inline mr-1" />
            Solicitudes
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'historial'
                ? 'bg-emerald-100 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="h-4 w-4 inline mr-1" />
            Historial de Facturas
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <div className="relative">
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value, mes: '', anio: '' })}
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
            <div className="relative">
              <select
                value={filtros.proveedor_id}
                onChange={e => setFiltros({ ...filtros, proveedor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <div className="relative">
              <select
                value={filtros.facturado}
                onChange={e => setFiltros({ ...filtros, facturado: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg pr-8"
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
          <div className="flex items-end gap-2">
            <button
              onClick={limpiarFiltros}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-primary text-sm flex items-center justify-center gap-1 px-4"
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
      {data.resumen.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <button
            onClick={() => setShowResumen(!showResumen)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Euro className="h-4 w-4 text-emerald-600" />
              Resumen por Cliente
              <span className="text-sm font-normal text-gray-500">({data.resumen.length} clientes)</span>
            </h4>
            <div className="flex items-center gap-3">
              <span className="font-bold text-emerald-700">€{data.total_general_eur.toFixed(2)}</span>
              {showResumen ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
            </div>
          </button>
          
          {showResumen && (
            <div className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Abonado</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Cliente</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Proveedor</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Normal</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Urgente</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">72h</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Monto EUR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.resumen.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-blue-600">{r.usuario_abono}</td>
                      <td className="px-3 py-2">{r.usuario_nombre}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                          {r.proveedor_codigo}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{r.qty_normal}</td>
                      <td className="px-3 py-2 text-center">{r.qty_urgente}</td>
                      <td className="px-3 py-2 text-center">{r.qty_72h}</td>
                      <td className="px-3 py-2 text-center font-medium">{r.total_informes}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">€{r.total_eur.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50 font-medium">
                  <tr className="border-t-2 border-emerald-200">
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-900">SUBTOTALES:</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {data.resumen.reduce((sum, r) => sum + r.qty_normal, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {data.resumen.reduce((sum, r) => sum + r.qty_urgente, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700">
                      {data.resumen.reduce((sum, r) => sum + r.qty_72h, 0)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-900">
                      {data.resumen.reduce((sum, r) => sum + r.total_informes, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700 text-lg">€{data.total_general_eur.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detalle por Cliente */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900">Detalle de Solicitudes</h4>
          {selectedIds.length > 0 && (
            <button
              onClick={handleMarcarFacturado}
              className="btn-primary text-sm flex items-center gap-1"
            >
              <Receipt className="h-4 w-4" />
              Facturar ({selectedIds.length})
            </button>
          )}
        </div>

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
              const totalGrupo = grupo.solicitudes.reduce((sum, s) => sum + (s.precio_calculado || 0), 0)
              
              // Calcular estado del grupo
              const solsPendientes = grupo.solicitudes.filter(s => !s.facturado)
              const solsFacturadas = grupo.solicitudes.filter(s => s.facturado)
              const todasFacturadas = solsFacturadas.length === grupo.solicitudes.length
              const todasPendientes = solsPendientes.length === grupo.solicitudes.length
              
              // Determinar el estado de pago real (de las solicitudes facturadas)
              // Priorizar el estado más relevante: pagada > cancelada > facturada > pendiente
              const getEstadoPagoGrupo = () => {
                if (todasPendientes) return null // Sin facturar
                const estadosSols = solsFacturadas.map(s => s.factura_estado_pago || 'facturada')
                if (estadosSols.includes('pagada')) return 'pagada'
                if (estadosSols.includes('cancelada')) return 'cancelada'
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
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedCliente(isExpanded ? null : abono)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox solo si hay pendientes */}
                      {solsPendientes.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(abono) }}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            allPendientesSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {allPendientesSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      ) : (
                        <div className="w-5 h-5" /> 
                      )}
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                      <span className="font-mono font-medium text-blue-600">{abono}</span>
                      <span className="font-medium text-gray-900">{grupo.usuario_nombre}</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                        {grupo.proveedor_codigo}
                      </span>
                      {/* Badge de estado */}
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
                    <div className="flex items-center gap-4">
                      {/* Botón Revertir para admin - solo si hay facturadas */}
                      {isAdmin && solsFacturadas.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Revertir todas las facturadas del grupo
                            setRevertData({
                              ids: solsFacturadas.map(s => s.id),
                              count: solsFacturadas.length,
                              usuario_nombre: grupo.usuario_nombre,
                              usuario_abono: abono
                            })
                            setShowRevertModal(true)
                          }}
                          className="px-2 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors flex items-center gap-1"
                          title="Revertir facturadas a Pendiente"
                        >
                          ↩ Revertir ({solsFacturadas.length})
                        </button>
                      )}
                      <span className="text-sm text-gray-500">{grupo.solicitudes.length} informes</span>
                      <span className="font-medium text-emerald-600">€{totalGrupo.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Detalle de solicitudes */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="w-10 px-3 py-2"></th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Empresa</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">ID / País</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Prioridad</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600">Precio</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Fecha</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {grupo.solicitudes.map(sol => (
                            <tr key={sol.id} className={`hover:bg-gray-50 ${sol.facturado ? 'bg-green-50' : ''}`}>
                              <td className="px-3 py-2">
                                {!sol.facturado ? (
                                  <button onClick={() => {
                                    // Solo seleccionar pendientes del mismo cliente
                                    const solsPendientes = grupo.solicitudes.filter(s => !s.facturado).map(s => s.id)
                                    const yaSeleccionado = solsPendientes.every(id => selectedIds.includes(id))
                                    
                                    if (yaSeleccionado) {
                                      setSelectedIds([])
                                    } else {
                                      setSelectedIds(solsPendientes)
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
                              <td className="px-3 py-2 max-w-[200px] truncate" title={sol.razon_social}>
                                {sol.razon_social}
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
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  sol.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                                  sol.prioridad === '72h' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {sol.prioridad === 'urgente' ? 'Urgente' : sol.prioridad === '72h' ? '72h' : 'Normal'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">€{sol.precio_calculado?.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-xs text-gray-500">{sol.updated_at}</td>
                              <td className="px-3 py-2 text-center">
                                {sol.facturado ? (
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* TAB: Historial de Facturas */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600" />
              Historial de Facturas Generadas
            </h4>
            <button
              onClick={loadHistorial}
              disabled={loadingHistorial}
              className="btn-secondary text-sm flex items-center gap-1"
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
                return (
                  <div key={key} className={`${cfg.color} rounded-lg p-3`}>
                    <div className="flex items-center gap-2">
                      <cfg.icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{stat.cantidad || 0}</p>
                    <p className="text-xs opacity-75">€{(stat.total || 0).toFixed(2)}</p>
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
            <div className="overflow-x-auto">
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
          )}
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
            <div className="p-6 space-y-4">
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
                    <span className="text-gray-500">Total EUR:</span>
                    <p className="font-bold text-emerald-600 text-lg">€{modalData.total_eur.toFixed(2)}</p>
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
            <div className="p-6 space-y-4">
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
                  <span className="font-bold text-emerald-600">€{modalData.total_eur?.toFixed(2)}</span>
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
            <div className="p-6 space-y-4">
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
