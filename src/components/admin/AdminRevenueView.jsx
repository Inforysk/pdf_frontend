import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  TrendingUp, TrendingDown, DollarSign, Users, AlertCircle,
  BarChart3, PieChart, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, Target, Building2, CreditCard, FileText, ChevronDown, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminRevenueView() {
  const [data, setData] = useState(null)
  const [billingData, setBillingData] = useState(null)
  const [clientesAnalytics, setClientesAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('clientes')
  const [showAnalytics, setShowAnalytics] = useState(false)

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  const buildClientesAnalytics = (facturas = []) => {
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = monthKey(d)
      months.push({
        key,
        periodo: key,
        periodo_label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        facturas: 0,
        revenue_total: 0,
        revenue_cobrado: 0,
        revenue_base: 0,
        revenue_excedentes: 0,
        facturas_pagadas: 0,
      })
    }
    const monthMap = new Map(months.map(m => [m.key, m]))

    const byProvider = new Map()
    const byClient = new Map()

    facturas.forEach((f) => {
      const total = Number(f.total_eur || 0)
      const estado = String(f.estado_pago || '').toLowerCase()
      const created = f.created_at ? new Date(f.created_at) : null
      if (!created || Number.isNaN(created.getTime())) return

      const mk = monthKey(created)
      const bucket = monthMap.get(mk)
      if (bucket) {
        bucket.facturas += 1
        bucket.revenue_total += total
        if (estado === 'pagada') {
          bucket.revenue_cobrado += total
          bucket.facturas_pagadas += 1
        }
      }

      const provName = f.proveedor_nombre || f.proveedor_codigo || 'Sin proveedor'
      if (!byProvider.has(provName)) byProvider.set(provName, { plan_nombre: provName, facturas: 0, revenue: 0, clientes: new Set() })
      const prov = byProvider.get(provName)
      prov.facturas += 1
      prov.revenue += total
      if (f.usuario_abono) prov.clientes.add(f.usuario_abono)

      const clientKey = f.usuario_abono || `SIN-${f.id}`
      if (!byClient.has(clientKey)) {
        byClient.set(clientKey, {
          id: clientKey,
          nombre: f.usuario_nombre || clientKey,
          revenue_total: 0,
          facturas: 0,
          ultima_factura: null,
        })
      }
      const cli = byClient.get(clientKey)
      cli.revenue_total += total
      cli.facturas += 1
      if (!cli.ultima_factura || new Date(cli.ultima_factura) < created) cli.ultima_factura = created.toISOString()
    })

    months.forEach((m) => {
      m.revenue_total = Number(m.revenue_total.toFixed(2))
      m.revenue_cobrado = Number(m.revenue_cobrado.toFixed(2))
    })

    const growth = []
    for (let i = 1; i < months.length; i += 1) {
      const prev = months[i - 1].revenue_cobrado
      const curr = months[i].revenue_cobrado
      growth.push({
        periodo: months[i].periodo,
        growth_pct: prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : 0,
      })
    }

    const revenuePorPlan = Array.from(byProvider.values())
      .map(p => ({ ...p, revenue: Number(p.revenue.toFixed(2)), clientes: p.clientes.size }))
      .sort((a, b) => b.revenue - a.revenue)

    const topClientes = Array.from(byClient.values())
      .map(c => ({ ...c, revenue_total: Number(c.revenue_total.toFixed(2)) }))
      .sort((a, b) => b.revenue_total - a.revenue_total)
      .slice(0, 5)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    let mesFacturas = 0
    let mesPagadas = 0
    let mesRevenue = 0
    let mesCobrado = 0
    const clientesActivosSet = new Set()

    facturas.forEach((f) => {
      const total = Number(f.total_eur || 0)
      const estado = String(f.estado_pago || '').toLowerCase()
      const created = f.created_at ? new Date(f.created_at) : null
      if (!created || Number.isNaN(created.getTime())) return
      if (f.usuario_abono) clientesActivosSet.add(f.usuario_abono)

      if (created >= startOfMonth) {
        mesFacturas += 1
        mesRevenue += total
      }

      const pagoDate = f.fecha_pago ? new Date(`${f.fecha_pago}T00:00:00`) : created
      if (estado === 'pagada' && pagoDate >= startOfMonth) {
        mesPagadas += 1
        mesCobrado += total
      }
    })

    const ultimos3 = months.slice(-3)
    const promedio = ultimos3.length ? (ultimos3.reduce((acc, m) => acc + m.revenue_cobrado, 0) / ultimos3.length) : 0
    const tendencia = months.length >= 3 ? (months[months.length - 1].revenue_cobrado - months[months.length - 3].revenue_cobrado) / 2 : 0

    return {
      mrr: {
        valor: Number(months.reduce((acc, m) => acc + m.revenue_cobrado, 0).toFixed(2)),
        clientes_activos: clientesActivosSet.size,
        clientes_mensuales: clientesActivosSet.size,
        clientes_anuales: 0,
      },
      mes_actual: {
        revenue: Number(mesRevenue.toFixed(2)),
        cobrado: Number(mesCobrado.toFixed(2)),
        facturas: mesFacturas,
        pagadas: mesPagadas,
        variacion_mom: growth.length ? growth[growth.length - 1].growth_pct : 0,
      },
      churn: {
        rate: 0,
        clientes_perdidos: 0,
        clientes_anterior: clientesActivosSet.size,
      },
      proyecciones: {
        mes_siguiente: Number(Math.max(0, promedio + tendencia).toFixed(2)),
        trimestre: Number(Math.max(0, promedio * 3 + tendencia * 3).toFixed(2)),
        anual: Number(Math.max(0, promedio * 12 + tendencia * 6).toFixed(2)),
      },
      historico: {
        revenue_mensual: months,
        growth_mom: growth,
        nuevos_clientes: months.map(m => ({ periodo: m.periodo, nuevos_clientes: 0 })),
      },
      desglose: {
        por_plan: revenuePorPlan,
        top_clientes: topClientes,
      },
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const [revenueRes, billingRes] = await Promise.all([
        axios.get('/api/admin/revenue/dashboard'),
        axios.get('/api/admin/dashboard')
      ])

      if (revenueRes.data.success && billingRes.data) {
        setData(revenueRes.data.dashboard)
        setBillingData(billingRes.data)
        try {
          const hist = await axios.get('/api/admin/facturas-proveedores/historial', { params: { _ts: Date.now() } })
          if (hist?.data?.success) {
            setClientesAnalytics(buildClientesAnalytics(hist.data.facturas || []))
          } else {
            setClientesAnalytics(null)
          }
        } catch {
          setClientesAnalytics(null)
        }
      } else {
        toast.error('Error cargando dashboard')
      }
    } catch (err) {
      toast.error('Error de conexión')
      console.error(err)
    }
    setLoading(false)
    setRefreshing(false)
  }

  const formatCurrency = (value, decimals = 0) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value || 0)
  }

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data || !billingData) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">No se pudo cargar el dashboard</p>
        <button onClick={() => loadDashboard()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Reintentar
        </button>
      </div>
    )
  }

  const analytics = activeTab === 'clientes' && clientesAnalytics ? clientesAnalytics : data
  const { mrr, mes_actual, churn, proyecciones, historico, desglose } = analytics
  const eurUsd = billingData?.eur_usd || 1.2
  const fmtDual = (eur) => {
    const e = parseFloat(eur || 0)
    return `€${e.toLocaleString()} | $${Math.round(e * eurUsd).toLocaleString()}`
  }

  const clientes = billingData?.facturas_proveedores || {}
  const suscripciones = billingData?.facturas_clientes || {}
  const totalMesOperativo = Number(clientes.pagado_mes || 0) + Number(suscripciones.pagado_mes || 0)

  return (
    <div className="space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas financieras y proyecciones</p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Bloque principal: Ingresos operativos (alineado a Facturación Global) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ingresos Operativos</h2>
            <p className="text-sm text-gray-500">Vista por Clientes y Suscripciones con los mismos montos de Facturación Global</p>
          </div>
          <div className="bg-gray-100 p-1 rounded-lg inline-flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('clientes')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'clientes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Clientes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suscripciones')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'suscripciones' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Suscripciones
            </button>
          </div>
        </div>

        {activeTab === 'clientes' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-600">{clientes.pendientes || 0}</div>
              <div className="text-xs text-amber-700">Pendientes</div>
              <div className="text-xs text-amber-500 mt-0.5">{fmtDual(clientes.total_pendiente)}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{clientes.facturadas || 0}</div>
              <div className="text-xs text-blue-700">Facturadas</div>
              <div className="text-xs text-blue-500 mt-0.5">{fmtDual(clientes.total_facturado)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-600">{clientes.pagadas || 0}</div>
              <div className="text-xs text-green-700">Pagadas</div>
              <div className="text-xs text-green-500 mt-0.5">{fmtDual(clientes.total_pagado)}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{fmtDual(clientes.pagado_mes)}</div>
              <div className="text-xs text-emerald-700">Pagado este mes</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-600">{suscripciones.pendientes || 0}</div>
              <div className="text-xs text-amber-700">Pendientes</div>
              <div className="text-xs text-amber-500 mt-0.5">{fmtDual(suscripciones.total_pendiente)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-600">{suscripciones.vencidas || 0}</div>
              <div className="text-xs text-red-700">Vencidas</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-600">{suscripciones.pagadas || 0}</div>
              <div className="text-xs text-green-700">Pagadas</div>
              <div className="text-xs text-green-500 mt-0.5">{fmtDual(suscripciones.total_pagado)}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{fmtDual(suscripciones.pagado_mes)}</div>
              <div className="text-xs text-emerald-700">Cobrado este mes</div>
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-slate-600">Ingreso total del mes (Clientes + Suscripciones)</span>
          <span className="text-lg font-semibold text-slate-900">{fmtDual(totalMesOperativo)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <button
          type="button"
          onClick={() => setShowAnalytics(prev => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div>
            <h3 className="font-semibold text-gray-900">Analítica avanzada de Revenue</h3>
            <p className="text-sm text-gray-500">MRR, churn, proyecciones y tendencias históricas</p>
          </div>
          {showAnalytics ? (
            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
          )}
        </button>
      </div>

      {showAnalytics && (
        <>
      {/* KPI Cards (analítica de revenue) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* MRR */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
                <span className="text-[11px] sm:text-xs bg-white/20 px-2 py-1 rounded-full whitespace-nowrap">{activeTab === 'clientes' ? 'Clientes' : 'MRR'}</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold break-words">{formatCurrency(mrr.valor)}</p>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {mrr.clientes_activos} clientes activos
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] sm:text-xs text-blue-100">
            <span>{mrr.clientes_mensuales} mensuales</span>
            <span>{mrr.clientes_anuales} anuales</span>
          </div>
        </div>

        {/* Revenue Mes Actual */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="p-2 bg-green-100 rounded-lg shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className={`flex items-center gap-1 text-[11px] sm:text-xs px-2 py-1 rounded-full whitespace-nowrap ${
              mes_actual.variacion_mom >= 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {mes_actual.variacion_mom >= 0 
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />
              }
              {formatPercent(mes_actual.variacion_mom)}
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{formatCurrency(mes_actual.cobrado)}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Cobrado este mes</p>
          <div className="flex justify-between mt-3 text-[11px] sm:text-xs text-gray-500">
            <span>{mes_actual.pagadas}/{mes_actual.facturas} facturas pagadas</span>
          </div>
        </div>

        {/* Churn */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="p-2 bg-red-100 rounded-lg shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <span className={`text-[11px] sm:text-xs px-2 py-1 rounded-full whitespace-nowrap ${
              churn.rate <= 5 ? 'bg-green-100 text-green-700' : 
              churn.rate <= 10 ? 'bg-amber-100 text-amber-700' : 
              'bg-red-100 text-red-700'
            }`}>
              {churn.rate <= 5 ? 'Bajo' : churn.rate <= 10 ? 'Moderado' : 'Alto'}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{churn.rate}%</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Churn Rate</p>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-3">
            {churn.clientes_perdidos} de {churn.clientes_anterior} clientes
          </p>
        </div>

        {/* Proyección */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <span className="text-[11px] sm:text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full whitespace-nowrap">Proyeccion</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{formatCurrency(proyecciones.mes_siguiente)}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Proximo mes (estimado)</p>
          <div className="flex justify-between mt-3 text-[11px] sm:text-xs text-gray-500">
            <span>Trimestre: {formatCurrency(proyecciones.trimestre)}</span>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Mensual */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Revenue Mensual</h3>
              <p className="text-sm text-gray-500">Últimos 12 meses</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-gray-600">Cobrado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-200" />
                <span className="text-gray-600">Total</span>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historico.revenue_mensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="periodo_label" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="revenue_total" fill="#bfdbfe" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue_cobrado" fill="#3b82f6" name="Cobrado" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="revenue_cobrado" stroke="#1e40af" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue por Plan */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Revenue por Plan</h3>
          <p className="text-sm text-gray-500 mb-6">Distribución últimos 12 meses</p>
          <div className="h-48 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={desglose.por_plan}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="revenue"
                  nameKey="plan_nombre"
                >
                  {desglose.por_plan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {desglose.por_plan.slice(0, 4).map((plan, i) => (
              <div key={plan.plan_nombre} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-700 truncate">{plan.plan_nombre}</span>
                </div>
                <span className="font-medium whitespace-nowrap">{formatCurrency(plan.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Segunda fila de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crecimiento MoM */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Crecimiento MoM</h3>
          <p className="text-sm text-gray-500 mb-6">Variación mensual del revenue</p>
          <div className="h-52 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historico.growth_mom}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar 
                  dataKey="growth_pct" 
                  name="Crecimiento"
                  radius={[4, 4, 0, 0]}
                >
                  {historico.growth_mom.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.growth_pct >= 0 ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nuevos clientes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Nuevos Clientes</h3>
          <p className="text-sm text-gray-500 mb-6">Adquisición mensual</p>
          <div className="h-52 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historico.nuevos_clientes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="nuevos_clientes" 
                  name="Nuevos clientes"
                  stroke="#8b5cf6" 
                  fill="#c4b5fd" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Clientes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Top Clientes</h3>
            <p className="text-sm text-gray-500">Por revenue en los últimos 12 meses</p>
          </div>
          <Building2 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {desglose.top_clientes.map((cliente, i) => (
            <div key={cliente.id} className="py-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                     style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 break-words">{cliente.nombre}</p>
                  <p className="text-xs text-gray-500">{cliente.facturas} facturas</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400 mb-1">Revenue</p>
                  <p className="font-semibold text-gray-900 break-words">{formatCurrency(cliente.revenue_total)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Ultima factura</p>
                  <p className="text-gray-700">
                    {cliente.ultima_factura
                      ? new Date(cliente.ultima_factura).toLocaleDateString('es-AR')
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[760px] w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Facturas</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Revenue Total</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Última Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {desglose.top_clientes.map((cliente, i) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm`}
                           style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </div>
                      <span className="font-medium text-gray-900">{cliente.nombre}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{cliente.facturas}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(cliente.revenue_total)}
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-gray-500">
                    {cliente.ultima_factura 
                      ? new Date(cliente.ultima_factura).toLocaleDateString('es-AR')
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proyecciones Card */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/20 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Proyecciones de Revenue</h3>
            <p className="text-sm text-purple-200">Basado en tendencias de los últimos 3 meses</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm text-purple-200 mb-1">Próximo Mes</p>
            <p className="text-2xl sm:text-3xl font-bold break-words">{formatCurrency(proyecciones.mes_siguiente)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm text-purple-200 mb-1">Próximo Trimestre</p>
            <p className="text-2xl sm:text-3xl font-bold break-words">{formatCurrency(proyecciones.trimestre)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm text-purple-200 mb-1">Proyección Anual</p>
            <p className="text-2xl sm:text-3xl font-bold break-words">{formatCurrency(proyecciones.anual)}</p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
