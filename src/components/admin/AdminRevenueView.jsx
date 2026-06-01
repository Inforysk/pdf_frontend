import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  TrendingUp, TrendingDown, DollarSign, Users, AlertCircle,
  BarChart3, PieChart, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, Target, Building2, CreditCard
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminRevenueView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const res = await axios.get('/api/admin/revenue/dashboard')
      if (res.data.success) {
        setData(res.data.dashboard)
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

  if (!data) {
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

  const { mrr, mes_actual, churn, proyecciones, historico, desglose } = data

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* MRR */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs bg-white/20 px-2 py-1 rounded-full whitespace-nowrap">MRR</span>
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
    </div>
  )
}
