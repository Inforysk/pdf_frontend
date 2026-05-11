import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Search, FileText,
  Shield, Zap, AlertTriangle, ArrowUpRight, Loader2,
  BarChart3, Activity, Package, Clock, CreditCard, Receipt,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, Star, Crown
} from 'lucide-react'
import AmpliarPlanModal from './AmpliarPlanModal'

// Configuración de colores e iconos por plan
const PLAN_CONFIG = {
  Starter: {
    icon: Zap,
    gradient: 'from-blue-500 to-blue-600',
    buttonText: 'text-blue-700',
    iconBg: 'bg-blue-400/30'
  },
  Pro: {
    icon: Star,
    gradient: 'from-purple-500 to-purple-600',
    buttonText: 'text-purple-700',
    iconBg: 'bg-purple-400/30'
  },
  Enterprise: {
    icon: Crown,
    gradient: 'from-amber-500 to-amber-600',
    buttonText: 'text-amber-700',
    iconBg: 'bg-amber-400/30'
  },
  default: {
    icon: Zap,
    gradient: 'from-indigo-600 to-purple-600',
    buttonText: 'text-indigo-700',
    iconBg: 'bg-white/20'
  }
}

const PRODUCT_LABELS = {
  informe_basico: 'Informe Reducido',
  informe_premium: 'Informe Completo',
  informe_historico: 'Informe Histórico',
  informe_actualizado: 'Informe Actualizado',
  consulta_api: 'Consulta API',
  alertas: 'Alertas',
  alerta: 'Alerta',
  alerta_monitoreo: 'Monitoreo',
  scoring: 'Scoring',
  consulta: 'Consulta',
  descarga: 'Descarga PDF',
  descarga_pdf: 'Descarga PDF',
}

const PRODUCT_COLORS = {
  informe_basico: '#3B82F6',
  informe_premium: '#8B5CF6',
  informe_historico: '#6366F1',
  informe_actualizado: '#0EA5E9',
  consulta_api: '#14B8A6',
  alertas: '#F59E0B',
  alerta: '#EF4444',
  alerta_monitoreo: '#F59E0B',
  scoring: '#10B981',
  consulta: '#6366F1',
  descarga: '#EC4899',
  descarga_pdf: '#EC4899',
}

export default function ConsumoView({ isAdmin = true }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFactura, setShowFactura] = useState(false)
  const [factura, setFactura] = useState(null)
  const [loadingFactura, setLoadingFactura] = useState(false)
  const [showAmpliarPlan, setShowAmpliarPlan] = useState(false)
  const [showCreditosDetalle, setShowCreditosDetalle] = useState(false)
  const [showHistorialPeriodos, setShowHistorialPeriodos] = useState(false)
  
  // Estado para ver historial de un periodo específico
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null)
  const [datosPeriodoHistorial, setDatosPeriodoHistorial] = useState(null)
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)
  
  // Paginación de actividad
  const [actividadPagina, setActividadPagina] = useState(0) // offset
  const [actividadTotal, setActividadTotal] = useState(0)
  const [actividadLoading, setActividadLoading] = useState(false)
  const ACTIVIDAD_LIMIT = 10

  // Cargar datos de un periodo histórico
  const cargarPeriodoHistorial = async (periodo) => {
    if (periodo === periodoSeleccionado) {
      // Toggle off
      setPeriodoSeleccionado(null)
      setDatosPeriodoHistorial(null)
      return
    }
    
    setLoadingPeriodo(true)
    setPeriodoSeleccionado(periodo)
    try {
      const res = await axios.get(`/api/portal/consumo/periodo/${periodo}`)
      if (res.data.success) {
        setDatosPeriodoHistorial(res.data)
      }
    } catch (err) {
      console.error('Error cargando periodo:', err)
    }
    setLoadingPeriodo(false)
  }

  useEffect(() => {
    setLoading(true)
    axios.get('/api/portal/consumo')
      .then(r => {
        if (r.data.success) {
          setData(r.data.data)
          setActividadTotal(r.data.data.actividad_total || 0)
        }
        else setError('No se pudo cargar el dashboard')
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [])

  const cargarActividad = (offset) => {
    setActividadLoading(true)
    axios.get(`/api/portal/consumo/actividad?limit=${ACTIVIDAD_LIMIT}&offset=${offset}`)
      .then(r => {
        if (r.data.success) {
          setData(prev => ({ ...prev, actividad: r.data.actividad }))
          setActividadTotal(r.data.total)
          setActividadPagina(offset)
        }
      })
      .catch(() => {})
      .finally(() => setActividadLoading(false))
  }

  const paginaActual = Math.floor(actividadPagina / ACTIVIDAD_LIMIT) + 1
  const totalPaginas = Math.ceil(actividadTotal / ACTIVIDAD_LIMIT)

  const loadFactura = () => {
    if (factura) { setShowFactura(!showFactura); return }
    setLoadingFactura(true)
    axios.get('/api/portal/factura')
      .then(r => {
        if (r.data.success) setFactura(r.data.factura)
      })
      .catch(() => {})
      .finally(() => { setLoadingFactura(false); setShowFactura(true) })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <p className="text-gray-600">{error || 'Sin datos disponibles'}</p>
      </div>
    )
  }

  const { creditos, kpis, uso, historico, productos, actividad, plan, equipo, es_admin, periodo, historial_periodos } = data
  const cred = creditos || {}
  const currencySymbol = plan?.currency_code === 'EUR' ? '€' : '$'
  const consumoPorUsuario = equipo?.consumo_por_usuario || []
  const periodoActual = periodo?.actual || new Date().toISOString().slice(0, 7)
  const tieneRollover = cred.rollover > 0

  // Formatear periodo para mostrar
  const formatPeriodo = (p) => {
    if (!p) return ''
    const [year, month] = p.split('-')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${meses[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Banner de Plan - Solo para cliente_admin */}
      {es_admin && plan && (() => {
        const planConfig = PLAN_CONFIG[plan.nombre] || PLAN_CONFIG.default
        const PlanIcon = planConfig.icon
        return (
          <div className={`bg-gradient-to-r ${planConfig.gradient} rounded-2xl p-4 sm:p-5`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`p-2.5 sm:p-3 ${planConfig.iconBg} rounded-xl shrink-0`}>
                  <PlanIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-base sm:text-lg">Tu Plan: {plan.nombre}</h3>
                  <p className="text-white/80 text-xs sm:text-sm truncate">
                    {cred.incluidos} créditos / mes · {currencySymbol}{cred.precio_credito?.toFixed(2) || '1.50'} por crédito extra
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAmpliarPlan(true)}
                className={`w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-white ${planConfig.buttonText} font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm sm:text-base`}
              >
                Cambiar Plan
              </button>
            </div>
          </div>
        )
      })()}

      {/* Info de Periodo Activo y Rollover */}
      {es_admin && (tieneRollover || periodo) && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2.5 flex-1">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-emerald-800">
                  Periodo actual: {formatPeriodo(periodoActual)}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-emerald-700 mt-1">
                  <span>Plan: {cred.incluidos || 0} créditos</span>
                  {tieneRollover && (
                    <span className="font-medium text-emerald-600">
                      + {cred.rollover} créditos rollover
                    </span>
                  )}
                  <span className="font-semibold">= {cred.totales || cred.incluidos || 0} créditos totales</span>
                </div>
              </div>
            </div>
            {historial_periodos && historial_periodos.length > 1 && (
              <button 
                onClick={() => setShowHistorialPeriodos(!showHistorialPeriodos)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
              >
                {showHistorialPeriodos ? 'Ocultar historial' : 'Ver historial'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Historial de Periodos - Expandible (disponible para todos) */}
      {showHistorialPeriodos && historial_periodos && historial_periodos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Historial de Periodos</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click en un periodo para ver detalles</p>
          </div>
          <div className="divide-y divide-gray-100">
            {historial_periodos.map((p, i) => (
              <div 
                key={p.factura_id || i} 
                onClick={() => i > 0 && cargarPeriodoHistorial(p.periodo)}
                className={`p-4 transition-colors ${
                  i === 0 ? 'bg-blue-50' : 
                  periodoSeleccionado === p.periodo ? 'bg-amber-50 border-l-4 border-amber-400' :
                  'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{formatPeriodo(p.periodo)}</span>
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Actual</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                        p.estado === 'vencida' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {p.estado === 'pagada' ? 'Pagada' : p.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                      </span>
                      {i > 0 && (
                        <span className="text-[10px] text-blue-600 font-medium ml-auto sm:ml-0">
                          {periodoSeleccionado === p.periodo ? '▼ Ver menos' : '▶ Ver detalles'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.plan_nombre}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Créditos</p>
                      <p className="font-semibold text-gray-900">
                        {p.creditos_usados}/{p.creditos_totales}
                      </p>
                    </div>
                    {p.creditos_rollover > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Rollover</p>
                        <p className="font-semibold text-emerald-600">+{p.creditos_rollover}</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Uso</p>
                      <p className={`font-semibold ${p.porcentaje_uso > 100 ? 'text-red-600' : p.porcentaje_uso > 85 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {p.porcentaje_uso}%
                      </p>
                    </div>
                    {p.creditos_saldo > 0 && p.estado === 'pagada' && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Sobrante</p>
                        <p className="font-semibold text-emerald-600">{p.creditos_saldo}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Detalles expandidos del periodo seleccionado */}
                {periodoSeleccionado === p.periodo && datosPeriodoHistorial && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    {loadingPeriodo ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Resumen del periodo */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-gray-500">Total Créditos</p>
                            <p className="text-lg font-bold text-gray-900">{datosPeriodoHistorial.factura.creditos_totales}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-gray-500">Usados</p>
                            <p className="text-lg font-bold text-blue-600">{datosPeriodoHistorial.factura.creditos_usados}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-gray-500">Sobrante</p>
                            <p className="text-lg font-bold text-emerald-600">{datosPeriodoHistorial.factura.creditos_saldo}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-gray-500">Operaciones</p>
                            <p className="text-lg font-bold text-gray-900">{datosPeriodoHistorial.total_operaciones}</p>
                          </div>
                        </div>
                        
                        {/* Productos del periodo */}
                        {datosPeriodoHistorial.productos && datosPeriodoHistorial.productos.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Consumo por producto</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {datosPeriodoHistorial.productos.map(prod => (
                                <div key={prod.tipo_producto} className="bg-white rounded-lg p-2 border border-gray-100 flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: PRODUCT_COLORS[prod.tipo_producto] || '#6B7280' }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-600 truncate">{PRODUCT_LABELS[prod.tipo_producto] || prod.tipo_producto}</p>
                                    <p className="text-xs font-semibold">{prod.total} · {parseFloat(prod.creditos_total).toFixed(1)} cr</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Gráfico de uso diario del periodo */}
                        {datosPeriodoHistorial.historico && datosPeriodoHistorial.historico.length > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Uso diario del periodo</h4>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosPeriodoHistorial.historico}>
                                  <XAxis 
                                    dataKey="fecha" 
                                    tick={{ fontSize: 9 }}
                                    tickFormatter={(v) => new Date(v).getDate()}
                                  />
                                  <YAxis tick={{ fontSize: 9 }} width={30} />
                                  <Tooltip 
                                    formatter={(v) => [`${parseFloat(v).toFixed(1)} cr`, 'Créditos']}
                                    labelFormatter={(v) => new Date(v).toLocaleDateString('es-ES')}
                                  />
                                  <Bar dataKey="creditos" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                        
                        {/* Consumo por usuario del periodo - SOLO para admin */}
                        {es_admin && datosPeriodoHistorial.consumo_por_usuario && datosPeriodoHistorial.consumo_por_usuario.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Consumo por usuario</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {datosPeriodoHistorial.consumo_por_usuario.map(u => (
                                <div key={u.id} className="bg-white rounded-lg p-2 border border-gray-100 flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                                    {(u.nombre_completo || u.username || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-600 truncate">{u.nombre_completo || u.username}</p>
                                    <p className="text-xs font-semibold">{u.operaciones || 0} ops · {(u.creditos || 0).toFixed(1)} cr</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Actividad del periodo */}
                        {datosPeriodoHistorial.actividad && datosPeriodoHistorial.actividad.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Últimas operaciones del periodo ({datosPeriodoHistorial.total_operaciones} total)</h4>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {datosPeriodoHistorial.actividad.map((a, idx) => (
                                <div key={idx} className="bg-white rounded-lg p-2 border border-gray-100 flex items-center gap-2 text-xs">
                                  <span className="text-gray-400 w-24 shrink-0">
                                    {new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                  </span>
                                  <span className="font-medium text-gray-700 truncate flex-1">
                                    {PRODUCT_LABELS[a.tipo_producto] || a.tipo_producto}
                                  </span>
                                  {a.nombre_completo && (
                                    <span className="text-purple-600 text-[10px] truncate max-w-20">{a.nombre_completo}</span>
                                  )}
                                  {a.empresa_consultada && (
                                    <span className="text-gray-500 truncate max-w-32">{a.empresa_consultada}</span>
                                  )}
                                  <span className="text-blue-600 font-semibold shrink-0">{a.creditos} cr</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de límite */}
      {uso.porcentaje >= 85 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2.5 flex-1">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-red-800">Estás cerca del límite de tu plan</p>
                <p className="text-[10px] sm:text-xs text-red-600">Has usado el {uso.porcentaje}% de tus créditos mensuales</p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowAmpliarPlan(true)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shrink-0"
              >
                Ampliar plan
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Ampliar Plan */}
      <AmpliarPlanModal
        isOpen={showAmpliarPlan}
        onClose={() => setShowAmpliarPlan(false)}
        planActual={plan}
      />

      {/* ===================== VISTA PARA CLIENTE_USUARIO ===================== */}
      {!es_admin && data.creditos_totales && (
        <>
          {/* Info de Periodo Activo para cliente_usuario */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2.5 flex-1">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-800">
                    Periodo actual: {formatPeriodo(periodoActual)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-blue-700 mt-1">
                    <span>Créditos asignados: {cred.incluidos || 0}</span>
                    <span>Usados: {cred.usados || 0}</span>
                    <span className="font-semibold">Disponible: {cred.saldo || 0}</span>
                  </div>
                </div>
              </div>
              {historial_periodos && historial_periodos.length > 1 && (
                <button 
                  onClick={() => setShowHistorialPeriodos(!showHistorialPeriodos)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                >
                  {showHistorialPeriodos ? 'Ocultar historial' : 'Ver historial'}
                </button>
              )}
            </div>
          </div>

          {/* Sección de Créditos Asignados para Informes - Acordeón */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setShowCreditosDetalle(!showCreditosDetalle)}
              className="w-full flex items-center gap-2 p-4 sm:p-5 hover:bg-gray-50 transition-colors text-left"
            >
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Créditos Asignados para Informes</h3>
              <span className="ml-auto text-sm font-bold text-blue-600">
                {data.creditos_totales.usado}/{data.creditos_totales.limite}
              </span>
              {showCreditosDetalle ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {/* Créditos por tipo de informe - colapsable */}
            {showCreditosDetalle && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(data.creditos_por_tipo || {}).map(([tipo, creditos]) => (
                    <div key={tipo} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PRODUCT_COLORS[`informe_${tipo === 'completo' ? 'premium' : tipo === 'reducido' ? 'basico' : tipo}`] || '#6B7280' }}
                        />
                        <span className="text-xs text-gray-600 font-medium truncate">
                          {tipo === 'completo' ? 'Completo' : tipo === 'reducido' ? 'Reducido' : tipo === 'historico' ? 'Histórico' : tipo === 'actualizado' ? 'Actualizado' : tipo === 'api' ? 'API' : tipo}
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${
                        creditos.limite > 0 && creditos.usado >= creditos.limite ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {creditos.usado}/{creditos.limite}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KPI Cards — igual que admin pero sin "Costo acumulado/estimado" */}
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Créditos usados"
              value={cred.usados || 0}
              sub={`periodo ${formatPeriodo(periodoActual)}`}
              icon={CreditCard}
              color="blue"
              delta={cred.variacion}
            />
            <KpiCard
              label="Créditos disponibles"
              value={cred.totales || cred.incluidos || 0}
              sub={tieneRollover ? `${cred.incluidos} plan + ${cred.rollover} rollover` : 'en tu plan'}
              icon={Package}
              color={tieneRollover ? 'emerald' : 'gray'}
            />
            <KpiCard
              label="Saldo disponible"
              value={cred.saldo || 0}
              icon={Zap}
              color={cred.saldo < 10 ? 'red' : cred.saldo < 30 ? 'amber' : 'green'}
            />
            <KpiCard
              label="Excedente"
              value={cred.excedentes || 0}
              icon={AlertTriangle}
              color={cred.excedentes > 0 ? 'red' : 'gray'}
            />
            <KpiCard
              label="Operaciones"
              value={kpis.consultas_mes || 0}
              sub="operaciones generadas"
              icon={FileText}
              color="indigo"
            />
          </div>
        </>
      )}

      {/* ===================== VISTA PARA CLIENTE_ADMIN ===================== */}
      {es_admin && (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Créditos usados"
            value={cred.usados || 0}
            sub={`periodo ${formatPeriodo(periodoActual)}`}
            icon={CreditCard}
            color="blue"
            delta={cred.variacion}
          />
          <KpiCard
            label="Créditos disponibles"
            value={cred.totales || cred.incluidos || 0}
            sub={tieneRollover ? `${cred.incluidos} + ${cred.rollover} rollover` : 'en tu plan'}
            icon={Package}
            color={tieneRollover ? 'emerald' : 'gray'}
          />
          <KpiCard
            label="Saldo disponible"
            value={cred.saldo || 0}
            icon={Zap}
            color={cred.saldo < 10 ? 'red' : cred.saldo < 30 ? 'amber' : 'green'}
          />
          <KpiCard
            label="Excedente"
            value={cred.excedentes || 0}
            icon={AlertTriangle}
            color={cred.excedentes > 0 ? 'red' : 'gray'}
          />
          <KpiCard
            label="Costo acumulado"
            value={`${currencySymbol}${((plan?.precio_mensual || 0) + (cred.costo_excedente || 0)).toFixed(0)}`}
            sub="estimado"
            icon={Receipt}
            color="purple"
          />
          <KpiCard
            label="Operaciones"
            value={kpis.consultas_mes || 0}
            sub="operaciones generadas"
            icon={FileText}
            color="indigo"
          />
        </div>
      )}

      {/* Barra de uso */}
      <UsageBar uso={uso} plan={plan} creditos={cred} onFactura={loadFactura} loadingFactura={loadingFactura} isAdmin={es_admin} />

      {/* Factura expandible - Solo admin */}
      {es_admin && showFactura && factura && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              Factura del mes — {factura.periodo}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium w-fit ${
              factura.estado === 'pagada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {factura.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Resumen */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-xs sm:text-sm font-medium text-gray-500">Resumen</h4>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Plan contratado</span><span className="font-medium">{factura.plan_nombre}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Créditos incluidos</span><span className="font-medium">{factura.creditos_incluidos}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Créditos usados</span><span className="font-medium">{factura.creditos_usados}</span></div>
                {factura.creditos_excedentes > 0 && (
                  <div className="flex justify-between text-red-600"><span>Excedente</span><span className="font-medium">{factura.creditos_excedentes} créditos</span></div>
                )}
              </div>
            </div>

            {/* Desglose */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-xs sm:text-sm font-medium text-gray-500">Desglose por producto</h4>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                {factura.desglose && Object.entries(factura.desglose).map(([prod, det]) => (
                  <div key={prod} className="flex justify-between">
                    <span className="text-gray-600 truncate mr-2">{PRODUCT_LABELS[prod] || prod} ×{det.cantidad}</span>
                    <span className="font-medium shrink-0">{det.creditos} créditos</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Base mensual</span><span className="font-medium">{currencySymbol}{factura.precio_base}</span></div>
            {factura.precio_excedente > 0 && (
              <div className="flex justify-between text-red-600"><span className="truncate mr-2">Excedente ({factura.creditos_excedentes} × {currencySymbol}{(factura.precio_excedente / factura.creditos_excedentes).toFixed(2)})</span><span className="font-medium shrink-0">{currencySymbol}{factura.precio_excedente}</span></div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-bold"><span>Total a pagar</span><span>{currencySymbol}{factura.total}</span></div>
          </div>
        </div>
      )}

      {/* Charts + Breakdown - Para todos los usuarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Consumo Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Uso de plataforma</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Créditos consumidos · últimos 30 días</p>
            </div>
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          {historico && historico.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historico} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}` }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 11 }}
                  labelFormatter={v => { const d = new Date(v); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                  formatter={(val, name) => [val, name === 'creditos' ? 'Créditos' : 'Operaciones']}
                />
                <Bar dataKey="creditos" name="Créditos" radius={[4, 4, 0, 0]}>
                  {historico.map((_, i) => (
                    <Cell key={i} fill={i === historico.length - 1 ? '#3B82F6' : '#BFDBFE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 sm:h-60 text-gray-400 text-xs sm:text-sm">
              Sin datos de consumo aún
            </div>
          )}
        </div>

        {/* Product Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Por producto</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Créditos del mes</p>
            </div>
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          {productos && productos.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {(() => {
                const totalCreditos = productos.reduce((s, p) => s + parseFloat(p.creditos_total || p.total), 0)
                return productos.map(p => {
                  const creds = parseFloat(p.creditos_total || p.total)
                  return (
                    <div key={p.tipo_producto}>
                      <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                        <span className="text-xs sm:text-sm text-gray-700 truncate mr-2">{PRODUCT_LABELS[p.tipo_producto] || p.tipo_producto}</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span className="text-[10px] sm:text-xs text-gray-400">×{p.total}</span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900">{creds} cr</span>
                          <span className="text-[10px] sm:text-xs text-gray-400">{totalCreditos > 0 ? Math.round(creds / totalCreditos * 100) : 0}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${totalCreditos > 0 ? (creds / totalCreditos * 100) : 0}%`,
                            backgroundColor: PRODUCT_COLORS[p.tipo_producto] || '#6B7280'
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 sm:h-40 text-gray-400 text-xs sm:text-sm">
              Sin consumo este mes
            </div>
          )}
        </div>
      </div>

      {/* Consumo por Usuario - Solo para cliente_admin */}
      {es_admin && consumoPorUsuario.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Consumo por Usuario</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Desglose del consumo de tu equipo este mes</p>
            </div>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          </div>
          
          {/* Vista móvil: Tarjetas */}
          <div className="sm:hidden space-y-3">
            {consumoPorUsuario.map((u, i) => {
              const porcentaje = cred.usados > 0 ? ((u.creditos_mes / cred.usados) * 100).toFixed(1) : 0
              return (
                <div key={u.usuario_id || i} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.nombre_completo || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${
                      u.rol === 'cliente_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {u.rol === 'cliente_admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-500">Operaciones</span>
                      <p className="font-semibold text-gray-900">{u.operaciones_mes || 0}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Créditos</span>
                      <p className="font-bold text-blue-600">{parseFloat(u.creditos_mes || 0).toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, porcentaje)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{porcentaje}%</span>
                  </div>
                </div>
              )
            })}
            {/* Total móvil */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Total Equipo</span>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{consumoPorUsuario.reduce((acc, u) => acc + (u.operaciones_mes || 0), 0)} ops</p>
                  <p className="text-sm font-bold text-blue-600">{cred.usados?.toFixed(1) || '0.0'} créditos</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Vista desktop: Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Operaciones</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Créditos</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">% del Total</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Última actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {consumoPorUsuario.map((u, i) => {
                  const porcentaje = cred.usados > 0 ? ((u.creditos_mes / cred.usados) * 100).toFixed(1) : 0
                  return (
                    <tr key={u.usuario_id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-medium text-gray-900">{u.nombre_completo || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          u.rol === 'cliente_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.rol === 'cliente_admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-700">
                        {u.operaciones_mes || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {parseFloat(u.creditos_mes || 0).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, porcentaje)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{porcentaje}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs">
                        {u.ultima_actividad 
                          ? new Date(u.ultima_actividad).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'Sin actividad'
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-gray-200">
                <tr className="bg-gray-50">
                  <td className="py-3 px-3 font-semibold text-gray-900" colSpan="2">Total Equipo</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">
                    {consumoPorUsuario.reduce((acc, u) => acc + (u.operaciones_mes || 0), 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-blue-600">
                    {cred.usados?.toFixed(1) || '0.0'}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-500">100%</td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Actividad reciente */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">
              {es_admin ? 'Actividad del equipo' : 'Actividad reciente'}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
              {es_admin ? 'Últimas operaciones de todo el equipo' : 'Últimas operaciones'}
            </p>
          </div>
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </div>
        {actividad && actividad.length > 0 ? (
          <>
            {/* Vista móvil: Lista de tarjetas */}
            <div className={`sm:hidden space-y-2 ${actividadLoading ? 'opacity-50' : ''}`}>
              {actividad.map((a, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl flex items-start gap-3">
                  <span className="text-lg">{a.tipo_producto === 'informe_premium' ? '📄' : a.tipo_producto === 'informe_basico' ? '📋' : a.tipo_producto === 'scoring' ? '📊' : '🔍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-gray-900">{PRODUCT_LABELS[a.tipo_producto] || a.tipo_producto}</p>
                      {a.pais && (
                        <img src={`https://flagcdn.com/16x12/${a.pais.toLowerCase()}.png`} alt={a.pais} className="w-4 h-3 rounded-sm" />
                      )}
                    </div>
                    {a.empresa_consultada && <p className="text-[10px] text-gray-600 truncate">{a.empresa_consultada}</p>}
                    {es_admin && <p className="text-[10px] text-gray-500">@{a.username}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 shrink-0">{a.creditos || '0.5'} cr</span>
                </div>
              ))}
              {/* Paginación móvil */}
              {actividadTotal > ACTIVIDAD_LIMIT && (
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                  <button
                    onClick={() => cargarActividad(actividadPagina - ACTIVIDAD_LIMIT)}
                    disabled={actividadPagina === 0 || actividadLoading}
                    className="flex items-center gap-1 text-xs text-blue-600 disabled:text-gray-400"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <span className="text-xs text-gray-500">{paginaActual}/{totalPaginas}</span>
                  <button
                    onClick={() => cargarActividad(actividadPagina + ACTIVIDAD_LIMIT)}
                    disabled={actividadPagina + ACTIVIDAD_LIMIT >= actividadTotal || actividadLoading}
                    className="flex items-center gap-1 text-xs text-blue-600 disabled:text-gray-400"
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {/* Vista desktop: Tabla */}
            <div className={`hidden sm:block overflow-x-auto relative ${actividadLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {actividadLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  {es_admin && (
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                  )}
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Fiscal</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">País</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Créditos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {actividad.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    {es_admin && (
                      <td className="py-3 px-3">
                        <span className="text-gray-700 text-xs font-medium">{item.nombre_completo || item.username || '-'}</span>
                      </td>
                    )}
                    <td className="py-3 px-3 font-mono text-gray-700">{item.cuit_consultado || '-'}</td>
                    <td className="py-3 px-3 text-gray-900 max-w-xs truncate">{item.empresa_consultada || '-'}</td>
                    <td className="py-3 px-3">
                      {item.pais ? (
                        <span className="inline-flex items-center gap-1.5">
                          <img src={`https://flagcdn.com/16x12/${item.pais.toLowerCase()}.png`} alt="" className="w-4 h-3 rounded-sm" />
                          <span className="text-gray-600">{item.pais}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: (PRODUCT_COLORS[item.tipo_producto] || '#6B7280') + '18',
                          color: PRODUCT_COLORS[item.tipo_producto] || '#6B7280'
                        }}
                      >
                        {PRODUCT_LABELS[item.tipo_producto] || item.tipo_producto}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-700">
                      {item.creditos != null ? parseFloat(item.creditos).toFixed(1) : '1.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {actividadTotal > ACTIVIDAD_LIMIT && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Mostrando {actividadPagina + 1}-{Math.min(actividadPagina + ACTIVIDAD_LIMIT, actividadTotal)} de {actividadTotal}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cargarActividad(actividadPagina - ACTIVIDAD_LIMIT)}
                  disabled={actividadPagina === 0 || actividadLoading}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {paginaActual} / {totalPaginas}
                </span>
                <button
                  onClick={() => cargarActividad(actividadPagina + ACTIVIDAD_LIMIT)}
                  disabled={actividadPagina + ACTIVIDAD_LIMIT >= actividadTotal || actividadLoading}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="flex items-center justify-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm">
            Aún no tienes actividad registrada
          </div>
        )}
      </div>
    </div>
  )
}

/* ── KPI Card ── */
function KpiCard({ label, value, sub, icon: Icon, color = 'blue', delta }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium ${
            delta > 0 ? 'text-green-600' : 'text-red-500'
          }`}>
            {delta > 0 ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
        <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">{sub || label}</p>
      </div>
    </div>
  )
}

/* ── Usage Bar ── */
function UsageBar({ uso, plan, creditos, onFactura, loadingFactura, isAdmin = true }) {
  const pct = uso.porcentaje
  const barColor = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-green-500'
  const bgTrack = pct > 85 ? 'bg-red-100' : pct > 60 ? 'bg-amber-100' : 'bg-green-100'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Uso del plan</h3>
            {plan && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{plan.nombre}</span>}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
            <span className="font-semibold text-gray-900">{uso.usado}</span> de <span className="font-semibold text-gray-900">{uso.total}</span> créditos usados
            {creditos?.excedentes > 0 && (
              <span className="ml-2 text-red-600 font-semibold">+{creditos.excedentes} excedente</span>
            )}
          </p>
          <div className={`h-2.5 sm:h-3 rounded-full ${bgTrack} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2">{pct.toFixed(1)}% utilizado</p>
        </div>
        {/* Botón Ver factura solo visible para admin */}
        {isAdmin && (
          <div className="sm:shrink-0">
            <button
              onClick={onFactura}
              disabled={loadingFactura}
              className="w-full sm:w-auto px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {loadingFactura ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Ver factura
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
