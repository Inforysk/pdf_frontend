import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import {
  Building2, ClipboardList, TrendingUp, Users, Shield, AlertTriangle,
  FileText, Database, Activity, Loader2, RefreshCcw, ChevronDown, ChevronUp, X,
  Download, FileJson2, FileSpreadsheet, FileDown, Filter, Calendar, CreditCard, Receipt
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e']
const RATING_COLORS = {
  AAA: '#059669', AA: '#10b981', A: '#34d399',
  BBB: '#f59e0b', BB: '#f97316',
  B: '#ef4444', CCC: '#dc2626'
}
const ESTADO_LABELS = {
  pendiente: 'Pendiente', en_proceso: 'En Proceso', completada: 'Completada',
  cancelada: 'Cancelada', consulta: 'Consulta', precarga: 'Precarga'
}
const ESTADO_COLORS = {
  pendiente: '#f59e0b', en_proceso: '#3b82f6', completada: '#10b981',
  cancelada: '#9ca3af', consulta: '#8b5cf6', precarga: '#06b6d4'
}

function KpiCard({ icon: Icon, label, value, sub, color = 'blue', active, onClick, description }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  }
  const ringColor = {
    blue: 'ring-blue-300', green: 'ring-green-300', amber: 'ring-amber-300',
    purple: 'ring-purple-300', rose: 'ring-rose-300', cyan: 'ring-cyan-300',
  }
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border p-3 sm:p-4 flex items-start gap-3 transition-all text-left w-full ${
        onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
      } ${active ? `ring-2 ${ringColor[color]} shadow-md` : ''}`}
    >
      <div className={`p-2 sm:p-2.5 rounded-xl border ${colorMap[color]} flex-shrink-0`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        {description && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{description}</p>}
      </div>
      {onClick && (
        <div className="flex-shrink-0 mt-1">
          {active ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </div>
      )}
    </button>
  )
}

function ChartCard({ title, children, className = '', headerRight = null }) {
  return (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

function DetailPanel({ data, title, nameKey = 'pais', valueKey = 'cantidad', valueLabel = 'Registros', onClose, source }) {
  const total = data.reduce((a, b) => a + b[valueKey], 0)
  const [downloading, setDownloading] = useState(null) // 'json' | 'csv' | 'pdf' | 'pais:Argentina:json' etc

  const handleDownload = async (format, pais = '') => {
    const key = pais ? `pais:${pais}:${format}` : format
    setDownloading(key)
    try {
      const params = new URLSearchParams({ format })
      if (pais) params.set('pais', pais)
      const res = await axios.get(`/api/admin/export/${source}?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers['content-disposition']?.match(/filename=(.+)/)?.[1]
        || `${source}${pais ? '_' + pais : ''}.${format}`
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

  const DownloadBtns = ({ pais = '', size = 'sm' }) => {
    const btnBase = size === 'sm'
      ? 'p-1 rounded hover:bg-gray-200 transition-colors'
      : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors text-xs font-medium'
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => handleDownload('json', pais)} title="Descargar JSON"
          className={`${btnBase} text-amber-600`}
          disabled={!!downloading}>
          {downloading === (pais ? `pais:${pais}:json` : 'json')
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <><FileJson2 className="h-3.5 w-3.5" />{size !== 'sm' && <span>JSON</span>}</>}
        </button>
        <button onClick={() => handleDownload('csv', pais)} title="Descargar CSV (Excel)"
          className={`${btnBase} text-green-600`}
          disabled={!!downloading}>
          {downloading === (pais ? `pais:${pais}:csv` : 'csv')
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <><FileSpreadsheet className="h-3.5 w-3.5" />{size !== 'sm' && <span>Excel</span>}</>}
        </button>
        <button onClick={() => handleDownload('pdf', pais)} title="Descargar PDF"
          className={`${btnBase} text-red-600`}
          disabled={!!downloading}>
          {downloading === (pais ? `pais:${pais}:pdf` : 'pdf')
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <><FileDown className="h-3.5 w-3.5" />{size !== 'sm' && <span>PDF</span>}</>}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-50 border-b">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400 mr-1">
            <Download className="h-3 w-3" /> Descargar todo:
          </div>
          <DownloadBtns size="md" />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 ml-1"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {data.map((item, i) => {
            const pct = total > 0 ? (item[valueKey] / total * 100) : 0
            return (
              <div key={i} className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS_PIE[i % COLORS_PIE.length] }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item[nameKey]}</p>
                  <p className="text-xs text-gray-500">{item[valueKey].toLocaleString()} {valueLabel} · {pct.toFixed(1)}%</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DownloadBtns pais={item[nameKey]} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
          <span className="text-gray-500">Total</span>
          <span className="font-bold text-gray-800">{total.toLocaleString()} {valueLabel}</span>
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border px-3 py-2 text-xs">
      <p className="font-medium text-gray-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedKpi, setExpandedKpi] = useState(null) // 'empresas' | 'precarga' | 'solicitudes' | 'informes' | null
  const [solicitudesActivas, setSolicitudesActivas] = useState(null)
  const [informesMes, setInformesMes] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Filtros para solicitudes activas
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  
  // Filtros para informes
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  
  // Estado de descarga
  const [downloading, setDownloading] = useState(null)
  
  // Filtro de período para gráfica de facturación
  const [periodoFacturacion, setPeriodoFacturacion] = useState(6)
  const [periodoResumenEmpresas, setPeriodoResumenEmpresas] = useState('6m')
  const [periodoResumenSolicitudes, setPeriodoResumenSolicitudes] = useState('6m')
  const [periodoResumenClientes, setPeriodoResumenClientes] = useState('6m')

  const PERIODOS_RESUMEN = [
    { value: 'day', label: 'D' },
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1A' },
  ]

  const RESUMEN_LABELS = {
    day: 'Hoy',
    '1m': 'Este mes',
    '3m': 'Últimos 3 meses',
    '6m': 'Últimos 6 meses',
    '1y': 'Último año',
  }

  const loadSolicitudesActivas = async (estado = '', prioridad = '') => {
    setLoadingDetail(true)
    try {
      const params = new URLSearchParams()
      if (estado) params.set('estado', estado)
      if (prioridad) params.set('prioridad', prioridad)
      const res = await axios.get(`/api/admin/dashboard/solicitudes-activas?${params}`)
      if (res.data.success) setSolicitudesActivas(res.data.data)
    } catch { toast.error('Error al cargar solicitudes') }
    finally { setLoadingDetail(false) }
  }

  const loadInformesMes = async (desde = '', hasta = '') => {
    setLoadingDetail(true)
    try {
      const params = new URLSearchParams()
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const res = await axios.get(`/api/admin/dashboard/informes-mes?${params}`)
      if (res.data.success) setInformesMes(res.data.data)
    } catch { toast.error('Error al cargar informes') }
    finally { setLoadingDetail(false) }
  }

  const handleDownloadSolicitudes = async (format) => {
    setDownloading(`sol-${format}`)
    try {
      const params = new URLSearchParams({ format })
      if (filtroEstado) params.set('estado', filtroEstado)
      if (filtroPrioridad) params.set('prioridad', filtroPrioridad)
      const res = await axios.get(`/api/admin/dashboard/solicitudes-activas?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers['content-disposition']?.match(/filename=(.+)/)?.[1] || `solicitudes_activas.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} descargado`)
    } catch { toast.error('Error al descargar') }
    finally { setDownloading(null) }
  }

  const handleDownloadInformes = async (format) => {
    setDownloading(`inf-${format}`)
    try {
      const params = new URLSearchParams({ format })
      if (filtroDesde) params.set('desde', filtroDesde)
      if (filtroHasta) params.set('hasta', filtroHasta)
      const res = await axios.get(`/api/admin/dashboard/informes-mes?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers['content-disposition']?.match(/filename=(.+)/)?.[1] || `informes.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} descargado`)
    } catch { toast.error('Error al descargar') }
    finally { setDownloading(null) }
  }

  const toggleKpi = async (key) => {
    if (expandedKpi === key) {
      setExpandedKpi(null)
      return
    }
    setExpandedKpi(key)
    
    // Cargar datos detallados si es necesario
    if (key === 'solicitudes' && !solicitudesActivas) {
      loadSolicitudesActivas()
    }
    if (key === 'informes' && !informesMes) {
      loadInformesMes()
    }
  }

  const loadDashboard = async (
    periodo = periodoFacturacion,
    resumenEmpresas = periodoResumenEmpresas,
    resumenSolicitudes = periodoResumenSolicitudes,
    resumenClientes = periodoResumenClientes,
  ) => {
    setLoading(true)
    try {
      const res = await axios.get(
        `/api/admin/dashboard?periodo_facturacion=${periodo}&periodo_empresas=${resumenEmpresas}&periodo_solicitudes=${resumenSolicitudes}&periodo_clientes=${resumenClientes}`
      )
      if (res.data.success) setData(res.data.data)
    } catch {
      toast.error('Error al cargar dashboard')
    } finally {
      setLoading(false)
    }
  }
  
  const handlePeriodoChange = (nuevoPeriodo) => {
    setPeriodoFacturacion(nuevoPeriodo)
    loadDashboard(nuevoPeriodo, periodoResumenEmpresas, periodoResumenSolicitudes, periodoResumenClientes)
  }

  const handlePeriodoEmpresasChange = (nuevoPeriodo) => {
    setPeriodoResumenEmpresas(nuevoPeriodo)
    loadDashboard(periodoFacturacion, nuevoPeriodo, periodoResumenSolicitudes, periodoResumenClientes)
  }

  const handlePeriodoSolicitudesChange = (nuevoPeriodo) => {
    setPeriodoResumenSolicitudes(nuevoPeriodo)
    loadDashboard(periodoFacturacion, periodoResumenEmpresas, nuevoPeriodo, periodoResumenClientes)
  }

  const handlePeriodoClientesChange = (nuevoPeriodo) => {
    setPeriodoResumenClientes(nuevoPeriodo)
    loadDashboard(periodoFacturacion, periodoResumenEmpresas, periodoResumenSolicitudes, nuevoPeriodo)
  }

  // Auto-refresh cada 30 segundos para datos en tiempo real
  useEffect(() => {
    loadDashboard()
    const interval = setInterval(() => {
      loadDashboard()
    }, 30000) // 30 segundos
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-400" />
        <p>No se pudo cargar el dashboard</p>
        <button onClick={loadDashboard} className="mt-3 text-blue-600 hover:underline text-sm">Reintentar</button>
      </div>
    )
  }

  const { kpis } = data
  const eurUsd = data?.eur_usd || 1.20
  const fmtDual = (eur) => { const e = parseFloat(eur || 0); return `€${e.toLocaleString()} | $${Math.round(e * eurUsd).toLocaleString()}` }

  // Preparar datos de solicitudes por estado con labels legibles
  const solEstado = (data.solicitudes_por_estado || []).map(s => ({
    ...s,
    name: ESTADO_LABELS[s.estado] || s.estado,
    fill: ESTADO_COLORS[s.estado] || '#9ca3af'
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h2>
          <p className="text-sm text-gray-500 mt-0.5">Vista general del sistema Inforysk</p>
        </div>
        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-xl hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={Building2} label="Empresas" value={kpis.total_empresas} color="blue"
          description="Informes en el sistema"
          active={expandedKpi === 'empresas'}
          onClick={() => toggleKpi('empresas')}
        />
        <KpiCard icon={ClipboardList} label="Pendientes" value={kpis.solicitudes_pendientes || 0} color="amber"
          description="⚡ Tiempo real"
          active={expandedKpi === 'solicitudes'}
          onClick={() => toggleKpi('solicitudes')}
        />
        <KpiCard icon={Activity} label="En Proceso" value={kpis.solicitudes_en_proceso || 0} color="cyan"
          description="⚡ Tiempo real"
        />
        <KpiCard icon={FileText} label="Completadas" value={kpis.solicitudes_completadas_mes || 0} color="green"
          description="Este mes"
          active={expandedKpi === 'informes'}
          onClick={() => toggleKpi('informes')}
        />
        <KpiCard icon={TrendingUp} label="Score promedio" value={kpis.score_promedio} sub="/ 100" color="purple" />
        <KpiCard
          icon={Database} label="Facturación" value={fmtDual(kpis.facturacion_mes)} color="rose"
          description="Este mes"
        />
      </div>

      {/* ── Facturación Global ── */}
      {(data.facturas_proveedores || data.facturas_clientes) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Facturación a Clientes */}
          {data.facturas_proveedores && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                Facturación a Clientes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600">{data.facturas_proveedores.pendientes}</div>
                  <div className="text-xs text-amber-700">Pendientes</div>
                  <div className="text-xs text-amber-500 mt-0.5">{fmtDual(data.facturas_proveedores.total_pendiente)}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{data.facturas_proveedores.facturadas}</div>
                  <div className="text-xs text-blue-700">Facturadas</div>
                  <div className="text-xs text-blue-500 mt-0.5">{fmtDual(data.facturas_proveedores.total_facturado)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{data.facturas_proveedores.pagadas}</div>
                  <div className="text-xs text-green-700">Pagadas</div>
                  <div className="text-xs text-green-500 mt-0.5">{fmtDual(data.facturas_proveedores.total_pagado)}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600">{fmtDual(data.facturas_proveedores.pagado_mes)}</div>
                  <div className="text-xs text-emerald-700">Pagado este mes</div>
                </div>
              </div>
            </div>
          )}

          {/* Facturas Clientes Planes */}
          {data.facturas_clientes && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-500" />
                Facturas Clientes Planes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600">{data.facturas_clientes.pendientes}</div>
                  <div className="text-xs text-amber-700">Pendientes</div>
                  <div className="text-xs text-amber-500 mt-0.5">{fmtDual(data.facturas_clientes.total_pendiente)}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{data.facturas_clientes.vencidas}</div>
                  <div className="text-xs text-red-700">Vencidas</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{data.facturas_clientes.pagadas}</div>
                  <div className="text-xs text-green-700">Pagadas</div>
                  <div className="text-xs text-green-500 mt-0.5">{fmtDual(data.facturas_clientes.total_pagado)}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600">{fmtDual(data.facturas_clientes.pagado_mes)}</div>
                  <div className="text-xs text-emerald-700">Cobrado este mes</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Panel expandible: Empresas por país ── */}
      {expandedKpi === 'empresas' && (data.empresas_por_pais || []).length > 0 && (
        <DetailPanel
          data={data.empresas_por_pais}
          title="Empresas por País — Click en un país para descargar"
          nameKey="pais"
          valueKey="cantidad"
          valueLabel="empresas"
          onClose={() => setExpandedKpi(null)}
          source="empresas"
        />
      )}

      {/* ── Panel expandible: Solicitudes Activas ── */}
      {expandedKpi === 'solicitudes' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 bg-amber-50 border-b border-amber-100 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Solicitudes Activas (Pendientes + En Proceso)</h3>
              {solicitudesActivas && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {solicitudesActivas.resumen?.pendiente || 0} pendientes · {solicitudesActivas.resumen?.en_proceso || 0} en proceso
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtros */}
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <select
                  value={filtroEstado}
                  onChange={(e) => { setFiltroEstado(e.target.value); loadSolicitudesActivas(e.target.value, filtroPrioridad) }}
                  className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-amber-300"
                >
                  <option value="">Todo Estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                </select>
                <select
                  value={filtroPrioridad}
                  onChange={(e) => { setFiltroPrioridad(e.target.value); loadSolicitudesActivas(filtroEstado, e.target.value) }}
                  className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-amber-300"
                >
                  <option value="">Toda Prioridad</option>
                  <option value="urgente">Urgente</option>
                  <option value="72h">72 Horas</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
              {/* Descargas */}
              <div className="flex items-center gap-1 border-l pl-2 ml-1">
                <button
                  onClick={() => handleDownloadSolicitudes('csv')}
                  disabled={!!downloading}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  title="Descargar Excel"
                >
                  {downloading === 'sol-csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={() => handleDownloadSolicitudes('pdf')}
                  disabled={!!downloading}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  title="Descargar PDF"
                >
                  {downloading === 'sol-pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
              <button onClick={() => setExpandedKpi(null)} className="p-1 rounded-lg hover:bg-amber-100 text-gray-400 ml-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : solicitudesActivas?.solicitudes?.length > 0 ? (
              <div className="space-y-2">
                {solicitudesActivas.solicitudes.map((sol, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-amber-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sol.estado === 'pendiente' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800 truncate">{sol.razon_social}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          sol.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {sol.estado === 'pendiente' ? 'Pendiente' : 'En Proceso'}
                        </span>
                        {sol.prioridad === 'urgente' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Urgente</span>
                        )}
                        {sol.prioridad === '72h' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">72 Horas</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {sol.cuit} · {sol.solicitado_por} · {sol.dias_pendiente > 0 ? `hace ${sol.dias_pendiente} días` : 'hoy'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No hay solicitudes activas</p>
            )}
          </div>
        </div>
      )}

      {/* ── Panel expandible: Informes del Mes ── */}
      {expandedKpi === 'informes' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 bg-green-50 border-b border-green-100 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Informes Completados {informesMes?.periodo || 'Este Mes'}</h3>
              {informesMes && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {informesMes.total} informes · {informesMes.empresas_nuevas || 0} empresas nuevas · {informesMes.empresas_actualizadas || 0} actualizadas
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtros de fecha */}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-300 w-[115px]"
                  placeholder="Desde"
                />
                <span className="text-gray-400 text-xs">a</span>
                <input
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-300 w-[115px]"
                  placeholder="Hasta"
                />
                <button
                  onClick={() => loadInformesMes(filtroDesde, filtroHasta)}
                  className="px-2 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Buscar
                </button>
              </div>
              {/* Descargas */}
              <div className="flex items-center gap-1 border-l pl-2 ml-1">
                <button
                  onClick={() => handleDownloadInformes('csv')}
                  disabled={!!downloading}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  title="Descargar Excel"
                >
                  {downloading === 'inf-csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={() => handleDownloadInformes('pdf')}
                  disabled={!!downloading}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  title="Descargar PDF"
                >
                  {downloading === 'inf-pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
              <button onClick={() => setExpandedKpi(null)} className="p-1 rounded-lg hover:bg-green-100 text-gray-400 ml-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
              </div>
            ) : informesMes?.informes?.length > 0 ? (
              <div className="space-y-2">
                {informesMes.informes.map((inf, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-green-50 transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{inf.razon_social}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                          {inf.tipo_informe || 'Standard'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {inf.cuit} · {inf.solicitado_por} · {inf.created_at ? new Date(inf.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No hay informes completados en este período</p>
            )}
          </div>
        </div>
      )}

      {/* ── Fila 1: Empresas por país + Solicitudes por estado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title={`Empresas por País (${RESUMEN_LABELS[periodoResumenEmpresas] || 'Últimos 6 meses'})`}
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {PERIODOS_RESUMEN.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodoEmpresasChange(opt.value)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    periodoResumenEmpresas === opt.value
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.empresas_por_pais || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="pais" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Empresas" radius={[0, 6, 6, 0]}>
                  {(data.empresas_por_pais || []).map((_, i) => (
                    <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t mt-3 flex justify-between text-sm">
            <span className="text-gray-500">Total {RESUMEN_LABELS[periodoResumenEmpresas]?.toLowerCase() || 'período'}</span>
            <span className="font-bold">{(data.empresas_por_pais || []).reduce((a, b) => a + (b.cantidad || 0), 0)}</span>
          </div>
        </ChartCard>

        <ChartCard
          title={`Solicitudes ${RESUMEN_LABELS[periodoResumenSolicitudes] || 'Últimos 6 meses'} ⚡`}
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {PERIODOS_RESUMEN.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodoSolicitudesChange(opt.value)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    periodoResumenSolicitudes === opt.value
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            {(data.solicitudes_hoy || []).length > 0 ? (
              <div className="space-y-3 pt-2">
                {['pendiente', 'en_proceso', 'completada'].map(estado => {
                  const item = (data.solicitudes_hoy || []).find(s => s.estado === estado)
                  const cantidad = item?.cantidad || 0
                  const colors = { pendiente: '#f59e0b', en_proceso: '#3b82f6', completada: '#10b981' }
                  const labels = { pendiente: 'Pendientes', en_proceso: 'En Proceso', completada: 'Completadas' }
                  const total = (data.solicitudes_hoy || []).reduce((a, b) => a + (b.cantidad || 0), 0) || 1
                  const pct = (cantidad / total * 100).toFixed(0)
                  return (
                    <div key={estado} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-medium text-gray-600">{labels[estado]}</div>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full rounded-lg transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: colors[estado] }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                          {cantidad}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t mt-3 flex justify-between text-sm">
                  <span className="text-gray-500">Total {RESUMEN_LABELS[periodoResumenSolicitudes]?.toLowerCase() || 'período'}</span>
                  <span className="font-bold">{(data.solicitudes_hoy || []).reduce((a, b) => a + (b.cantidad || 0), 0)}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sin solicitudes en el período
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Fila 2: Top Clientes + Facturación mensual ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title={`Top 5 Clientes (${RESUMEN_LABELS[periodoResumenClientes] || 'Últimos 6 meses'})`}
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {PERIODOS_RESUMEN.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodoClientesChange(opt.value)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    periodoResumenClientes === opt.value
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            {(data.top_clientes || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_clientes} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="cliente" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="solicitudes" name="Solicitudes" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sin datos de clientes
              </div>
            )}
          </div>
          {(data.top_clientes || []).length > 0 && (
            <div className="pt-2 border-t mt-3 flex justify-between text-sm">
              <span className="text-gray-500">Total solicitudes {RESUMEN_LABELS[periodoResumenClientes]?.toLowerCase() || 'período'}</span>
              <span className="font-bold">{(data.top_clientes || []).reduce((a, b) => a + (b.solicitudes || 0), 0)}</span>
            </div>
          )}
        </ChartCard>

        <div className="bg-white rounded-xl border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Facturación</h3>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {[
                { value: 1, label: '1M' },
                { value: 3, label: '3M' },
                { value: 6, label: '6M' },
                { value: 12, label: '1A' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodoChange(opt.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    periodoFacturacion === opt.value
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {(data.facturacion_por_mes || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.facturacion_por_mes} margin={{ top: 5, right: 10 }}>
                  <defs>
                    <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white rounded-lg shadow-lg border px-3 py-2 text-xs">
                        <p className="font-medium text-gray-700">{label}</p>
                        <p className="text-green-600">Facturación: <span className="font-bold">€{payload[0]?.value?.toLocaleString()}</span></p>
                        <p className="text-gray-500">Facturas: {payload[0]?.payload?.facturas}</p>
                      </div>
                    )
                  }} />
                  <Area type="monotone" dataKey="facturacion" name="Facturación" stroke="#10b981" fill="url(#gradFact)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sin datos de facturación
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fila 4: Tendencia empresas + Actividad sistema ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Empresas ingresadas — últimos 12 meses">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.empresas_por_mes || []} margin={{ top: 5, right: 10 }}>
                <defs>
                  <linearGradient id="gradEmp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cantidad" name="Empresas" stroke="#10b981" fill="url(#gradEmp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Actividad del sistema — últimos 30 días">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.actividad_diaria || []} margin={{ top: 5, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="acciones" name="Acciones" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Fila 5: Actividad usuarios ── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <ChartCard title="Actividad por Usuario — últimos 30 días">
          {(data.actividad_usuarios || []).length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.actividad_usuarios} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="username" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="acciones" name="Acciones" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Sin actividad registrada
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Fila 6: Top mejores/peores + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top mejores */}
        <ChartCard title="Top 5 — Mejor Score">
          {(data.top_mejores || []).length > 0 ? (
            <div className="space-y-2.5">
              {data.top_mejores.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.razon_social || e.cuit}</p>
                    <p className="text-xs text-gray-400">{e.cuit}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-green-600">{e.score_total}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      RATING_COLORS[e.rating] ? 'text-white' : 'text-gray-600 bg-gray-100'
                    }`} style={{ backgroundColor: RATING_COLORS[e.rating] }}>{e.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
          )}
        </ChartCard>

        {/* Top peores */}
        <ChartCard title="Top 5 — Menor Score">
          {(data.top_peores || []).length > 0 ? (
            <div className="space-y-2.5">
              {data.top_peores.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.razon_social || e.cuit}</p>
                    <p className="text-xs text-gray-400">{e.cuit}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-red-600">{e.score_total}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white`}
                      style={{ backgroundColor: RATING_COLORS[e.rating] || '#9ca3af' }}>{e.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
          )}
        </ChartCard>

        {/* Alertas */}
        <ChartCard title="Alertas y Pendientes">
          <div className="space-y-4">
            {/* Urgentes sin asignar */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {(data.urgentes_sin_asignar || []).length} urgente{(data.urgentes_sin_asignar || []).length !== 1 ? 's' : ''} sin asignar
                </p>
                <div className="mt-1 space-y-1">
                  {(data.urgentes_sin_asignar || []).slice(0, 3).map((u, i) => (
                    <p key={i} className="text-xs text-gray-500 truncate">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${u.prioridad === 'urgente' ? 'bg-red-500' : 'bg-orange-400'}`} />
                      {u.razon_social || u.cuit}
                    </p>
                  ))}
                  {(data.urgentes_sin_asignar || []).length > 3 && (
                    <p className="text-xs text-blue-500">+{(data.urgentes_sin_asignar || []).length - 3} más</p>
                  )}
                </div>
              </div>
            </div>

            {/* Empresas sin scoring */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {(data.empresas_sin_scoring || 0).toLocaleString()} empresa{data.empresas_sin_scoring !== 1 ? 's' : ''} sin scoring
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {kpis.total_empresas > 0
                    ? `${((data.empresas_sin_scoring / kpis.total_empresas) * 100).toFixed(0)}% del total`
                    : 'Sin empresas'
                  }
                </p>
              </div>
            </div>

            {/* Solicitudes activas */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {kpis.solicitudes_activas} solicitud{kpis.solicitudes_activas !== 1 ? 'es' : ''} activa{kpis.solicitudes_activas !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pendientes y en proceso
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
